const SUPABASE_URL = "https://tytiezeamgwmqrrygoia.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gP0qRTSoUiO8-yMq8dgWEQ_1E3MTt7p";

let supabaseClient = null;

const startPanel = document.querySelector("#startPanel");
const routePanel = document.querySelector("#routePanel");
const startForm = document.querySelector("#startForm");
const matriculaInput = document.querySelector("#matriculaCondutor");
const clienteInput = document.querySelector("#cliente");
const sentidoInput = document.querySelector("#sentido");
const nomeLinhaInput = document.querySelector("#nomeLinha");
const startButton = document.querySelector("#startButton");
const registerPointButton = document.querySelector("#registerPointButton");
const finishRouteButton = document.querySelector("#finishRouteButton");
const activeMatricula = document.querySelector("#activeMatricula");
const activeCliente = document.querySelector("#activeCliente");
const activeSentido = document.querySelector("#activeSentido");
const activeLinha = document.querySelector("#activeLinha");
const pointCount = document.querySelector("#pointCount");
const trackingStatus = document.querySelector("#trackingStatus");
const message = document.querySelector("#message");
const routeStatusTitle = document.querySelector("#routeStatusTitle");
const statusPill = document.querySelector("#statusPill");
const notification = document.querySelector("#notification");
const notificationIcon = document.querySelector("#notificationIcon");
const notificationTitle = document.querySelector("#notificationTitle");
const notificationText = document.querySelector("#notificationText");
const notificationOkButton = document.querySelector("#notificationOkButton");
const systemVersion = document.querySelector("#systemVersion");
const openHelpButton = document.querySelector("#openHelpButton");
const closeHelpButton = document.querySelector("#closeHelpButton");
const helpModal = document.querySelector("#helpModal");
const helpBackdrop = document.querySelector("#helpBackdrop");
const helpMessages = document.querySelector("#helpMessages");
const helpChatForm = document.querySelector("#helpChatForm");
const helpQuestion = document.querySelector("#helpQuestion");

let activeRoute = null;
let totalPoints = 0;
let manualPoints = 0;
let routeOptions = [...(window.ROUTE_OPTIONS || [])];
const ACTIVE_ROUTE_STORAGE_KEY = "trajetoCaptura.activeRouteId";
const TRACKING_MIN_DISTANCE_METERS = 50;
const TRACKING_MIN_INTERVAL_MS = 15000;

let routeWatchId = null;
let lastTrackedPosition = null;
let pointSaveQueue = Promise.resolve();
let wakeLock = null;
let wakeLockSupported = "wakeLock" in navigator;
let notificationTimer = null;
let helpConversationState = null;

async function loadDatabaseRouteOptions() {
  if (!isSupabaseConfigured()) return;

  const { data, error } = await getSupabaseClient()
    .from("linhas_configuradas")
    .select("cliente, sentido, nome_linha")
    .order("cliente")
    .order("sentido")
    .order("nome_linha");

  if (error) {
    console.warn("Linhas adicionais ainda não estão configuradas.", error);
    return;
  }

  const merged = new Map(
    routeOptions.map((option) => [
      `${option.cliente}||${option.sentido}||${option.nome_linha}`,
      option,
    ])
  );
  (data || []).forEach((option) => {
    merged.set(
      `${option.cliente}||${option.sentido}||${option.nome_linha}`,
      option
    );
  });
  routeOptions = [...merged.values()];
  populateClientes();
}

function openHelp() {
  helpModal.classList.remove("hidden");
  document.body.classList.add("help-open");
  window.setTimeout(() => helpQuestion.focus(), 0);
}

function closeHelp() {
  helpModal.classList.add("hidden");
  document.body.classList.remove("help-open");
  openHelpButton.focus();
}

function getHelpAnswer(question) {
  const text = normalizeHelpQuestion(question);

  if (text.includes("localiza") || text.includes("gps") || text.includes("permiss")) {
    return "Ative a localização do aparelho e permita que o navegador acesse sua posição. Mantenha o GPS ligado e tente novamente em um local aberto.";
  }
  if (text.includes("final") || text.includes("termin") || text.includes("cheguei")) {
    return "Na entrada, finalize quando chegar ao cliente. Na saída, finalize quando chegar ao último ponto. Aguarde a confirmação antes de fechar a tela.";
  }
  if (text.includes("ponto") || text.includes("registr")) {
    return "Use Registrar ponto somente quando estiver no local do ponto. O aplicativo também grava o deslocamento automaticamente enquanto a tela permanece aberta.";
  }
  if (text.includes("saida")) {
    return "Na saída, selecione cliente, sentido Saída e linha. Toque no botão azul quando estiver no cliente.";
  }
  if (text.includes("entrada")) {
    return "Na entrada, selecione cliente, sentido Entrada e linha. Toque em “Cheguei no primeiro ponto” somente no início da linha.";
  }
  if (text.includes("inici") || text.includes("comec") || text.includes("rota")) {
    return "Informe matrícula, cliente, sentido e linha. Depois vá ao local indicado pelo botão azul, toque nele e mantenha o navegador aberto.";
  }
  if (text.includes("erro") || text.includes("nao funciona") || text.includes("trav")) {
    return "Confira a internet e a localização e tente novamente. Se o erro continuar, anote a mensagem exibida e procure o responsável.";
  }

  return null;
}

function isMissingLineQuestion(question) {
  const text = normalizeHelpQuestion(question);
  return (
    text.includes("linha") &&
    (text.includes("nao aparece") ||
      text.includes("nao encontro") ||
      text.includes("nao achei") ||
      text.includes("esta faltando"))
  );
}

function findRegisteredClient(value) {
  const normalizedValue = normalizeHelpQuestion(value);
  return (
    [...new Set(routeOptions.map((option) => option.cliente))].find(
      (cliente) => normalizeHelpQuestion(cliente) === normalizedValue
    ) || null
  );
}

async function handleMissingLineConversation(question) {
  if (helpConversationState?.step === "cliente") {
    const registeredClient = findRegisteredClient(question);
    if (!registeredClient) {
      appendHelpMessage(
        "Não encontrei esse cliente na lista cadastrada. Confira o nome e tente novamente.",
        "assistant"
      );
      return true;
    }

    helpConversationState = {
      step: "linha",
      cliente: registeredClient,
    };
    appendHelpMessage(
      `Cliente confirmado: ${registeredClient}. Qual é o nome ou número da linha que não aparece?`,
      "assistant"
    );
    return true;
  }

  if (helpConversationState?.step === "linha") {
    const linha = String(question || "").trim();
    if (linha.length < 2) {
      appendHelpMessage("Digite o nome ou número completo da linha.", "assistant");
      return true;
    }

    const cliente = helpConversationState.cliente;
    helpConversationState = null;
    const sentido = sentidoInput.value.trim() || "Não informado";
    const requestText = `Minha linha não aparece. Cliente: ${cliente}. Sentido: ${sentido}. Linha informada: ${linha}.`;

    try {
      await saveUnansweredQuestion(requestText);
      appendHelpMessage(
        `Obrigado. Registrei a linha “${linha}” para o cliente “${cliente}”. O responsável poderá verificar e responder pelo painel.`,
        "assistant"
      );
    } catch (error) {
      appendHelpMessage(
        "Não consegui registrar a solicitação agora. Verifique a internet e tente novamente.",
        "assistant"
      );
      console.warn("Erro ao registrar linha ausente:", error);
    }
    return true;
  }

  if (!isMissingLineQuestion(question)) return false;

  const selectedClient = clienteInput.value.trim();
  if (selectedClient) {
    helpConversationState = {
      step: "linha",
      cliente: selectedClient,
    };
    appendHelpMessage(
      `O cliente selecionado é “${selectedClient}”. Qual é o nome ou número da linha que não aparece?`,
      "assistant"
    );
  } else {
    helpConversationState = { step: "cliente" };
    appendClientSelectionMessage();
  }
  return true;
}

function normalizeHelpQuestion(question) {
  return String(question || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getQuestionSimilarity(first, second) {
  const ignoredWords = new Set(["a", "ao", "as", "como", "da", "de", "do", "e", "eu", "o", "os", "para", "por", "que", "um", "uma"]);
  const getWords = (value) =>
    new Set(normalizeHelpQuestion(value).split(" ").filter((word) => word.length > 2 && !ignoredWords.has(word)));
  const firstWords = getWords(first);
  const secondWords = getWords(second);
  const union = new Set([...firstWords, ...secondWords]);
  if (union.size === 0) return 0;
  const intersection = [...firstWords].filter((word) => secondWords.has(word)).length;
  return intersection / union.size;
}

async function findLearnedHelpAnswer(question) {
  const normalizedQuestion = normalizeHelpQuestion(question);
  const { data, error } = await getSupabaseClient()
    .from("ajuda_perguntas")
    .select("pergunta_normalizada, pergunta_corrigida, resposta")
    .eq("status", "respondida")
    .limit(300);

  if (error) throw error;

  const exact = data.find((item) => item.pergunta_normalizada === normalizedQuestion);
  if (exact?.resposta) return exact.resposta;

  const similar = data
    .map((item) => ({
      ...item,
      similarity: getQuestionSimilarity(
        normalizedQuestion,
        item.pergunta_corrigida || item.pergunta_normalizada
      ),
    }))
    .filter((item) => item.similarity >= 0.6 && item.resposta)
    .sort((a, b) => b.similarity - a.similarity)[0];

  return similar?.resposta || null;
}

async function saveUnansweredQuestion(question) {
  const normalizedQuestion = normalizeHelpQuestion(question);
  const { data: existing, error: selectError } = await getSupabaseClient()
    .from("ajuda_perguntas")
    .select("id, quantidade_perguntas")
    .eq("pergunta_normalizada", normalizedQuestion)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    const { error } = await getSupabaseClient()
      .from("ajuda_perguntas")
      .update({
        quantidade_perguntas: Number(existing.quantidade_perguntas || 1) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await getSupabaseClient().from("ajuda_perguntas").insert({
    pergunta_original: question,
    pergunta_normalizada: normalizedQuestion,
    status: "pendente",
  });
  if (error) throw error;
}

function appendHelpMessage(text, type) {
  const element = document.createElement("div");
  element.className = `help-message ${type}`;
  element.textContent = text;
  helpMessages.appendChild(element);
  helpMessages.scrollTop = helpMessages.scrollHeight;
}

function appendClientSelectionMessage() {
  const container = document.createElement("div");
  container.className = "help-message assistant help-client-selection";

  const prompt = document.createElement("span");
  prompt.textContent = "Selecione o cliente:";

  const select = document.createElement("select");
  select.innerHTML = '<option value="">Selecione o cliente</option>';
  [...new Set(routeOptions.map((option) => option.cliente))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .forEach((cliente) => {
      const option = document.createElement("option");
      option.value = cliente;
      option.textContent = cliente;
      select.appendChild(option);
    });

  const confirmButton = document.createElement("button");
  confirmButton.type = "button";
  confirmButton.textContent = "Confirmar";
  confirmButton.disabled = true;
  select.addEventListener("change", () => {
    confirmButton.disabled = !select.value;
  });
  confirmButton.addEventListener("click", async () => {
    if (!select.value) return;
    const selectedClient = select.value;
    select.disabled = true;
    confirmButton.disabled = true;
    appendHelpMessage(selectedClient, "user");
    await handleMissingLineConversation(selectedClient);
  });

  container.append(prompt, select, confirmButton);
  helpMessages.appendChild(container);
  helpMessages.scrollTop = helpMessages.scrollHeight;
  select.focus();
}

async function sendHelpQuestion(question) {
  const cleanQuestion = String(question || "").trim();
  if (!cleanQuestion) return;

  appendHelpMessage(cleanQuestion, "user");
  helpQuestion.value = "";

  if (await handleMissingLineConversation(cleanQuestion)) {
    helpQuestion.focus();
    return;
  }

  const builtInAnswer = getHelpAnswer(cleanQuestion);
  if (builtInAnswer) {
    appendHelpMessage(builtInAnswer, "assistant");
    helpQuestion.focus();
    return;
  }

  appendHelpMessage("Estou procurando uma resposta...", "assistant");
  const loadingMessage = helpMessages.lastElementChild;

  try {
    const learnedAnswer = await findLearnedHelpAnswer(cleanQuestion);
    if (learnedAnswer) {
      loadingMessage.textContent = learnedAnswer;
    } else {
      await saveUnansweredQuestion(cleanQuestion);
      loadingMessage.textContent =
        "Ainda não sei responder essa dúvida. Ela foi enviada ao responsável e ficará disponível aqui depois que for respondida.";
    }
  } catch (error) {
    loadingMessage.textContent =
      "Não consegui consultar a base de ajuda agora. Verifique a internet ou peça apoio ao responsável.";
    console.warn("Erro ao consultar a ajuda:", error);
  } finally {
    helpQuestion.focus();
  }
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function resetSelect(select, placeholder, disabled = true) {
  select.innerHTML = `<option value="">${placeholder}</option>`;
  select.disabled = disabled;
}

function fillSelect(select, placeholder, values) {
  resetSelect(select, placeholder, values.length === 0);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function normalizeDirection(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function setActionButtonText(button, text) {
  button.dataset.defaultText = text;
  if (!button.disabled) {
    button.textContent = text;
  }
}

function getClientArticle(cliente) {
  const masculineClients = new Set([
    "bonsucesso",
    "fretado interno",
    "time di",
    "treinamento",
  ]);
  const normalizedClient = String(cliente || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  return masculineClients.has(normalizedClient) ? "no" : "na";
}

function updateStartButtonText() {
  const cliente = clienteInput.value.trim();
  const direction = normalizeDirection(sentidoInput.value);
  const isExit = direction === "saida";
  const hasDirection = Boolean(direction);
  const text = isExit && cliente
    ? `Estou ${getClientArticle(cliente)} ${cliente}`
    : "Cheguei no primeiro ponto";

  setActionButtonText(startButton, text);
  startButton.classList.toggle("hidden", !hasDirection);
}

function updateFinishButtonText(route = activeRoute) {
  if (!route) {
    setActionButtonText(finishRouteButton, "Finalizar trajeto");
    return;
  }

  const isEntrance = normalizeDirection(route.sentido) === "entrada";
  const text = isEntrance
    ? `Cheguei no cliente ${route.cliente}`
    : "Cheguei no último ponto";

  setActionButtonText(finishRouteButton, text);
}

function populateClientes() {
  fillSelect(
    clienteInput,
    "Selecione o cliente",
    uniqueSorted(routeOptions.map((option) => option.cliente))
  );
}

function populateSentidos() {
  const cliente = clienteInput.value;
  const sentidos = uniqueSorted(
    routeOptions
      .filter((option) => option.cliente === cliente)
      .map((option) => option.sentido)
  );

  fillSelect(sentidoInput, "Selecione o sentido", sentidos);
  resetSelect(nomeLinhaInput, "Selecione a linha");
  updateStartButtonText();
}

function populateLinhas() {
  const cliente = clienteInput.value;
  const sentido = sentidoInput.value;
  const linhas = uniqueSorted(
    routeOptions
      .filter((option) => option.cliente === cliente && option.sentido === sentido)
      .map((option) => option.nome_linha)
  );

  fillSelect(nomeLinhaInput, "Selecione a linha", linhas);
  updateStartButtonText();
}

function isSupabaseConfigured() {
  return (
    SUPABASE_URL !== "COLE_AQUI_A_URL_DO_PROJETO_SUPABASE" &&
    SUPABASE_ANON_KEY !== "COLE_AQUI_A_CHAVE_ANON_PUBLIC"
  );
}

function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  return supabaseClient;
}

function saveActiveRoute(route) {
  try {
    localStorage.setItem(ACTIVE_ROUTE_STORAGE_KEY, route.id);
  } catch (error) {
    console.warn("Nao foi possivel salvar o trajeto ativo localmente.", error);
  }
}

function clearSavedRoute() {
  try {
    localStorage.removeItem(ACTIVE_ROUTE_STORAGE_KEY);
  } catch (error) {
    console.warn("Nao foi possivel limpar o trajeto ativo localmente.", error);
  }
}

function getSavedRouteId() {
  try {
    return localStorage.getItem(ACTIVE_ROUTE_STORAGE_KEY);
  } catch (error) {
    console.warn("Nao foi possivel ler o trajeto ativo localmente.", error);
    return null;
  }
}

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function closeNotification() {
  window.clearTimeout(notificationTimer);
  notificationTimer = null;
  notification.classList.add("hidden");
}

function showNotification(text, options = {}) {
  const {
    title = "",
    type = "success",
    autoCloseMs = 4000,
  } = options;

  window.clearTimeout(notificationTimer);
  notification.className = `notification notification-${type}`.trim();
  notificationIcon.classList.toggle("hidden", type !== "warning");
  notificationTitle.textContent = title;
  notificationTitle.classList.toggle("hidden", !title);
  notificationText.textContent = text;
  notification.dataset.persistent = autoCloseMs ? "false" : "true";
  notificationOkButton.focus();
  notificationTimer = autoCloseMs
    ? window.setTimeout(closeNotification, autoCloseMs)
    : null;
}

function updateSystemVersion() {
  const modifiedAt = new Date(document.lastModified);

  systemVersion.textContent = Number.isNaN(modifiedAt.getTime())
    ? document.lastModified
    : new Intl.DateTimeFormat("pt-BR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(modifiedAt);
}

function setLoading(button, isLoading, loadingText) {
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

function setTrackingStatus(text) {
  trackingStatus.textContent = text;
  const isRecording =
    routeWatchId !== null && activeRoute?.status === "em_andamento";
  trackingStatus.classList.toggle("tracking-active", isRecording);
}

function getTrackingStatusText() {
  if (routeWatchId === null) {
    return "Pausada";
  }

  if (!wakeLockSupported) {
    return "Gravando (mantenha a tela ligada)";
  }

  return wakeLock ? "Gravando (tela protegida)" : "Gravando";
}

function refreshTrackingStatus() {
  setTrackingStatus(getTrackingStatusText());
}

function toIsoNow() {
  return new Date().toISOString();
}

function showActiveRoute(route) {
  activeRoute = route;
  activeMatricula.textContent = route.matricula_condutor;
  activeCliente.textContent = route.cliente;
  activeSentido.textContent = route.sentido || "-";
  activeLinha.textContent = route.nome_linha || "-";
  pointCount.textContent = String(manualPoints);
  refreshTrackingStatus();
  updateFinishButtonText(route);
  startPanel.classList.add("hidden");
  routePanel.classList.remove("hidden");
}

function getDistanceMeters(originPosition, targetPosition) {
  const earthRadiusMeters = 6371000;
  const originLatitude = (originPosition.coords.latitude * Math.PI) / 180;
  const targetLatitude = (targetPosition.coords.latitude * Math.PI) / 180;
  const latitudeDelta =
    ((targetPosition.coords.latitude - originPosition.coords.latitude) * Math.PI) / 180;
  const longitudeDelta =
    ((targetPosition.coords.longitude - originPosition.coords.longitude) * Math.PI) / 180;

  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(originLatitude) *
      Math.cos(targetLatitude) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2);

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function shouldSaveTrackedPosition(position) {
  if (!lastTrackedPosition) {
    lastTrackedPosition = position;
    return false;
  }

  const distance = getDistanceMeters(lastTrackedPosition, position);
  const interval = (position.timestamp || Date.now()) - (lastTrackedPosition.timestamp || Date.now());

  return distance >= TRACKING_MIN_DISTANCE_METERS && interval >= TRACKING_MIN_INTERVAL_MS;
}

function handleTrackedPosition(position) {
  if (!activeRoute || activeRoute.status !== "em_andamento") {
    stopRouteTracking();
    return;
  }

  if (!shouldSaveTrackedPosition(position)) {
    return;
  }

  saveRoutePoint(position, "trajeto").catch((error) => {
    setMessage(`Erro ao gravar trajeto: ${error.message}`, "error");
  });
}

function saveRoutePoint(position, tipoPonto, successMessage = "") {
  pointSaveQueue = pointSaveQueue.catch(() => {}).then(async () => {
    if (!activeRoute || activeRoute.status !== "em_andamento") {
      return;
    }

    const nextOrder = totalPoints + 1;
    const { error } = await getSupabaseClient().from("trajeto_pontos").insert({
      trajeto_id: activeRoute.id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      data_hora_registro: toIsoNow(),
      ordem_ponto: nextOrder,
      tipo_ponto: tipoPonto,
      precisao: position.coords.accuracy || null,
    });

    if (error) {
      throw error;
    }

    totalPoints = nextOrder;
    if (tipoPonto === "primeiro" || tipoPonto === "manual") {
      manualPoints += 1;
    }
    lastTrackedPosition = position;
    pointCount.textContent = String(manualPoints);
    saveActiveRoute(activeRoute);

    if (successMessage) {
      setMessage("");
      showNotification(successMessage);
    }
  });

  return pointSaveQueue;
}

async function requestWakeLock() {
  if (
    !wakeLockSupported ||
    wakeLock ||
    document.visibilityState !== "visible" ||
    !activeRoute ||
    activeRoute.status !== "em_andamento"
  ) {
    refreshTrackingStatus();
    return;
  }

  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
      refreshTrackingStatus();
    });
  } catch (error) {
    wakeLock = null;
    console.warn("Nao foi possivel manter a tela ativa durante o trajeto.", error);
  } finally {
    refreshTrackingStatus();
  }
}

async function releaseWakeLock(shouldRefreshStatus = true) {
  if (!wakeLock) {
    if (shouldRefreshStatus) {
      refreshTrackingStatus();
    }
    return;
  }

  const currentWakeLock = wakeLock;
  wakeLock = null;

  try {
    await currentWakeLock.release();
  } catch (error) {
    console.warn("Nao foi possivel liberar o bloqueio de tela.", error);
  } finally {
    if (shouldRefreshStatus) {
      refreshTrackingStatus();
    }
  }
}

async function resumeRouteTracking() {
  if (!activeRoute || activeRoute.status !== "em_andamento") {
    return;
  }

  startRouteTracking();
  await requestWakeLock();

  try {
    const position = await getCurrentPosition();
    handleTrackedPosition(position);
  } catch (error) {
    console.warn("Nao foi possivel capturar ponto ao retomar o trajeto.", error);
  }
}

function startRouteTracking(seedPosition = null) {
  if (!navigator.geolocation || routeWatchId !== null) {
    requestWakeLock();
    return;
  }

  if (seedPosition) {
    lastTrackedPosition = seedPosition;
  }

  routeWatchId = navigator.geolocation.watchPosition(
    handleTrackedPosition,
    (error) => {
      refreshTrackingStatus();
      console.warn("Nao foi possivel acompanhar o trajeto.", error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000,
    }
  );

  refreshTrackingStatus();
  requestWakeLock();
}

function stopRouteTracking() {
  if (routeWatchId !== null) {
    navigator.geolocation.clearWatch(routeWatchId);
    routeWatchId = null;
  }

  lastTrackedPosition = null;
  releaseWakeLock(false);
  setTrackingStatus("-");
}

async function restoreActiveRoute() {
  const savedRouteId = getSavedRouteId();

  if (!savedRouteId || !isSupabaseConfigured()) {
    return;
  }

  try {
    setMessage("Restaurando trajeto ativo...");

    const { data: route, error: routeError } = await getSupabaseClient()
      .from("trajetos")
      .select("id, matricula_condutor, cliente, sentido, nome_linha, status, data_hora_inicio, data_hora_fim")
      .eq("id", savedRouteId)
      .maybeSingle();

    if (routeError) {
      throw routeError;
    }

    if (!route || route.status !== "em_andamento") {
      clearSavedRoute();
      setMessage("");
      return;
    }

    const { count, error: countError } = await getSupabaseClient()
      .from("trajeto_pontos")
      .select("id", { count: "exact", head: true })
      .eq("trajeto_id", savedRouteId);

    if (countError) {
      throw countError;
    }

    const { count: manualCount, error: manualCountError } = await getSupabaseClient()
      .from("trajeto_pontos")
      .select("id", { count: "exact", head: true })
      .eq("trajeto_id", savedRouteId)
      .in("tipo_ponto", ["primeiro", "manual"]);

    if (manualCountError) {
      throw manualCountError;
    }

    totalPoints = count || 0;
    manualPoints = manualCount || 0;
    routeStatusTitle.textContent = "Em andamento";
    statusPill.textContent = "ativo";
    statusPill.classList.remove("finished");
    registerPointButton.disabled = false;
    finishRouteButton.disabled = false;
    showActiveRoute(route);
    startRouteTracking();
    setMessage("Trajeto ativo restaurado. Voce pode registrar ponto ou finalizar.", "success");
  } catch (error) {
    // Um trajeto pode ter sido excluído/finalizado pelo painel enquanto seu ID
    // ainda permaneceu salvo neste navegador. Nesse caso, descarte a referência
    // antiga para não bloquear a abertura do formulário.
    if (error?.code === "PGRST116") {
      clearSavedRoute();
      setMessage("");
      return;
    }

    setMessage(`Nao foi possivel restaurar o trajeto: ${error.message}`, "error");
  }
}

function markRouteFinished() {
  stopRouteTracking();
  activeRoute.status = "finalizado";
  routeStatusTitle.textContent = "Finalizado";
  statusPill.textContent = "finalizado";
  statusPill.classList.add("finished");
  registerPointButton.disabled = true;
  finishRouteButton.disabled = true;
}

function resetForNewRoute() {
  clearSavedRoute();
  activeRoute = null;
  totalPoints = 0;
  manualPoints = 0;
  startForm.reset();
  pointCount.textContent = "0";
  activeMatricula.textContent = "-";
  activeCliente.textContent = "-";
  activeSentido.textContent = "-";
  activeLinha.textContent = "-";
  setTrackingStatus("-");
  routeStatusTitle.textContent = "Em andamento";
  statusPill.textContent = "ativo";
  statusPill.classList.remove("finished");
  registerPointButton.disabled = false;
  finishRouteButton.disabled = false;
  updateFinishButtonText(null);
  resetSelect(sentidoInput, "Selecione o sentido");
  resetSelect(nomeLinhaInput, "Selecione a linha");
  updateStartButtonText();
  routePanel.classList.add("hidden");
  startPanel.classList.remove("hidden");
  matriculaInput.focus();
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não está disponível neste aparelho."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

startForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  if (!isSupabaseConfigured()) {
    setMessage("Configure SUPABASE_URL e SUPABASE_ANON_KEY no arquivo app.js.", "error");
    return;
  }

  const matricula = matriculaInput.value.trim();
  const cliente = clienteInput.value.trim();
  const sentido = sentidoInput.value.trim();
  const nomeLinha = nomeLinhaInput.value.trim();

  if (!matricula || !cliente || !sentido || !nomeLinha) {
    setMessage("Informe matricula, cliente, sentido e linha.", "error");
    return;
  }

  try {
    setLoading(startButton, true, "Iniciando...");

    const position = await getCurrentPosition();

    const { data, error } = await getSupabaseClient()
      .from("trajetos")
      .insert({
        matricula_condutor: matricula,
        cliente,
        sentido,
        nome_linha: nomeLinha,
        status: "em_andamento",
        data_hora_inicio: toIsoNow(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    activeRoute = data;
    totalPoints = 0;
    manualPoints = 0;
    await saveRoutePoint(position, "primeiro");
    saveActiveRoute(data);
    routeStatusTitle.textContent = "Em andamento";
    statusPill.textContent = "ativo";
    statusPill.classList.remove("finished");
    showActiveRoute(data);
    startRouteTracking(position);
    setMessage("");
    showNotification(
      "Por favor, nao desligue o aparelho e nao deixe a tela em modo inativo. Mantenha o navegador aberto ate finalizar o trajeto.",
      {
        title: "Trajeto gravando",
        type: "warning",
        autoCloseMs: 0,
      }
    );
  } catch (error) {
    const fallbackMessage =
      error.code === 1
        ? "Permissão de localização negada. Ative a localização do navegador."
        : error.message;
    setMessage(`Erro ao iniciar trajeto: ${fallbackMessage}`, "error");
  } finally {
    setLoading(startButton, false);
  }
});

registerPointButton.addEventListener("click", async () => {
  if (!activeRoute || activeRoute.status !== "em_andamento") {
    setMessage("Não há trajeto ativo para registrar ponto.", "error");
    return;
  }

  try {
    setMessage("Capturando localização...");
    setLoading(registerPointButton, true, "Registrando...");

    const position = await getCurrentPosition();
    await saveRoutePoint(position, "manual", "Ponto registrado com sucesso.");
  } catch (error) {
    const fallbackMessage =
      error.code === 1
        ? "Permissão de localização negada. Ative a localização do navegador."
        : error.message;
    setMessage(`Erro ao registrar ponto: ${fallbackMessage}`, "error");
  } finally {
    setLoading(registerPointButton, false);
  }
});

finishRouteButton.addEventListener("click", async () => {
  if (!activeRoute || activeRoute.status !== "em_andamento") {
    setMessage("Não há trajeto ativo para finalizar.", "error");
    return;
  }

  try {
    setLoading(finishRouteButton, true, "Finalizando...");
    setMessage("Capturando ultimo ponto...");
    stopRouteTracking();

    const finalPosition = await getCurrentPosition();
    await saveRoutePoint(finalPosition, "manual");

    const { data, error } = await getSupabaseClient()
      .from("trajetos")
      .update({
        status: "finalizado",
        data_hora_fim: toIsoNow(),
      })
      .eq("id", activeRoute.id)
      .eq("status", "em_andamento")
      .select()
      .single();

    if (error) {
      throw error;
    }

    activeRoute = data;
    setLoading(finishRouteButton, false);
    markRouteFinished();
    resetForNewRoute();
    setMessage("");
    showNotification(
      "Obrigado pela sua dedicação e pelo cuidado durante todo o trajeto.",
      {
        title: "Trajeto finalizado com sucesso",
        type: "success",
        autoCloseMs: 0,
      }
    );
  } catch (error) {
    if (activeRoute?.status === "em_andamento") {
      startRouteTracking();
    }

    const fallbackMessage =
      error.code === 1
        ? "Permissao de localizacao negada. Ative a localizacao do navegador para gravar o ultimo ponto."
        : error.message;
    setMessage(`Erro ao finalizar trajeto: ${fallbackMessage}`, "error");
    setLoading(finishRouteButton, false);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    resumeRouteTracking();
  } else {
    refreshTrackingStatus();
  }
});

clienteInput.addEventListener("change", populateSentidos);
sentidoInput.addEventListener("change", populateLinhas);
notificationOkButton.addEventListener("click", closeNotification);
notification.addEventListener("click", (event) => {
  if (event.target === notification && notification.dataset.persistent !== "true") {
    closeNotification();
  }
});
openHelpButton.addEventListener("click", openHelp);
closeHelpButton.addEventListener("click", closeHelp);
helpBackdrop.addEventListener("click", closeHelp);
helpChatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendHelpQuestion(helpQuestion.value);
});
document.querySelectorAll("[data-help-question]").forEach((button) => {
  button.addEventListener("click", () => sendHelpQuestion(button.dataset.helpQuestion));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !helpModal.classList.contains("hidden")) {
    closeHelp();
  }
});
populateClientes();
loadDatabaseRouteOptions();
updateStartButtonText();
updateFinishButtonText(null);
updateSystemVersion();
restoreActiveRoute();
