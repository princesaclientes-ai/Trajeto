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

let activeRoute = null;
let totalPoints = 0;
const routeOptions = window.ROUTE_OPTIONS || [];
const ACTIVE_ROUTE_STORAGE_KEY = "trajetoCaptura.activeRouteId";
const TRACKING_MIN_DISTANCE_METERS = 50;
const TRACKING_MIN_INTERVAL_MS = 15000;

let routeWatchId = null;
let lastTrackedPosition = null;
let pointSaveQueue = Promise.resolve();
let wakeLock = null;
let wakeLockSupported = "wakeLock" in navigator;

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

function setLoading(button, isLoading, loadingText) {
  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}

function setTrackingStatus(text) {
  trackingStatus.textContent = text;
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
  pointCount.textContent = String(totalPoints);
  refreshTrackingStatus();
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
    lastTrackedPosition = position;
    pointCount.textContent = String(totalPoints);
    saveActiveRoute(activeRoute);

    if (successMessage) {
      setMessage(successMessage, "success");
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
      .single();

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

    totalPoints = count || 0;
    routeStatusTitle.textContent = "Em andamento";
    statusPill.textContent = "ativo";
    statusPill.classList.remove("finished");
    registerPointButton.disabled = false;
    finishRouteButton.disabled = false;
    showActiveRoute(route);
    startRouteTracking();
    setMessage("Trajeto ativo restaurado. Voce pode registrar ponto ou finalizar.", "success");
  } catch (error) {
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
  resetSelect(sentidoInput, "Selecione o sentido");
  resetSelect(nomeLinhaInput, "Selecione a linha");
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
    await saveRoutePoint(position, "primeiro");
    saveActiveRoute(data);
    routeStatusTitle.textContent = "Em andamento";
    statusPill.textContent = "ativo";
    statusPill.classList.remove("finished");
    showActiveRoute(data);
    startRouteTracking(position);
    setMessage("Primeiro ponto registrado. Gravacao do trajeto iniciada.", "success");
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
    setMessage("Trajeto finalizado com sucesso.", "success");
    resetForNewRoute();
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
populateClientes();
restoreActiveRoute();
