const SUPABASE_URL = "https://tytiezeamgwmqrrygoia.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gP0qRTSoUiO8-yMq8dgWEQ_1E3MTt7p";

let supabaseClient = null;

const startPanel = document.querySelector("#startPanel");
const routePanel = document.querySelector("#routePanel");
const startForm = document.querySelector("#startForm");
const matriculaInput = document.querySelector("#matriculaCondutor");
const clienteInput = document.querySelector("#cliente");
const startButton = document.querySelector("#startButton");
const registerPointButton = document.querySelector("#registerPointButton");
const finishRouteButton = document.querySelector("#finishRouteButton");
const activeMatricula = document.querySelector("#activeMatricula");
const activeCliente = document.querySelector("#activeCliente");
const pointCount = document.querySelector("#pointCount");
const message = document.querySelector("#message");
const routeStatusTitle = document.querySelector("#routeStatusTitle");
const statusPill = document.querySelector("#statusPill");

let activeRoute = null;
let totalPoints = 0;

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

function toIsoNow() {
  return new Date().toISOString();
}

function showActiveRoute(route) {
  activeRoute = route;
  activeMatricula.textContent = route.matricula_condutor;
  activeCliente.textContent = route.cliente;
  pointCount.textContent = String(totalPoints);
  startPanel.classList.add("hidden");
  routePanel.classList.remove("hidden");
}

function markRouteFinished() {
  activeRoute.status = "finalizado";
  routeStatusTitle.textContent = "Finalizado";
  statusPill.textContent = "finalizado";
  statusPill.classList.add("finished");
  registerPointButton.disabled = true;
  finishRouteButton.disabled = true;
}

function resetForNewRoute() {
  activeRoute = null;
  totalPoints = 0;
  startForm.reset();
  pointCount.textContent = "0";
  activeMatricula.textContent = "-";
  activeCliente.textContent = "-";
  routeStatusTitle.textContent = "Em andamento";
  statusPill.textContent = "ativo";
  statusPill.classList.remove("finished");
  registerPointButton.disabled = false;
  finishRouteButton.disabled = false;
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

  if (!matricula || !cliente) {
    setMessage("Informe matrícula do condutor e cliente.", "error");
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
        status: "em_andamento",
        data_hora_inicio: toIsoNow(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const { error: pointError } = await getSupabaseClient().from("trajeto_pontos").insert({
      trajeto_id: data.id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      data_hora_registro: toIsoNow(),
      ordem_ponto: 1,
    });

    if (pointError) {
      throw pointError;
    }

    totalPoints = 1;
    routeStatusTitle.textContent = "Em andamento";
    statusPill.textContent = "ativo";
    statusPill.classList.remove("finished");
    showActiveRoute(data);
    setMessage("Primeiro ponto registrado com sucesso.", "success");
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
    const nextOrder = totalPoints + 1;

    const { error } = await getSupabaseClient().from("trajeto_pontos").insert({
      trajeto_id: activeRoute.id,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      data_hora_registro: toIsoNow(),
      ordem_ponto: nextOrder,
    });

    if (error) {
      throw error;
    }

    totalPoints = nextOrder;
    pointCount.textContent = String(totalPoints);
    setMessage("Ponto registrado com sucesso.", "success");
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
    setMessage(`Erro ao finalizar trajeto: ${error.message}`, "error");
    setLoading(finishRouteButton, false);
  }
});
