const SUPABASE_URL = "https://tytiezeamgwmqrrygoia.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gP0qRTSoUiO8-yMq8dgWEQ_1E3MTt7p";
const REFRESH_INTERVAL_MS = 5000;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const routeList = document.querySelector("#routeList");
const routeListStatus = document.querySelector("#routeListStatus");
const refreshButton = document.querySelector("#refreshButton");
const autoRefreshToggle = document.querySelector("#autoRefreshToggle");
const totalRoutes = document.querySelector("#totalRoutes");
const activeRoutes = document.querySelector("#activeRoutes");
const totalDrivers = document.querySelector("#totalDrivers");
const selectedPointCount = document.querySelector("#selectedPointCount");
const lastRefresh = document.querySelector("#lastRefresh");
const driverFilter = document.querySelector("#driverFilter");
const clientFilter = document.querySelector("#clientFilter");
const directionFilter = document.querySelector("#directionFilter");
const lineFilter = document.querySelector("#lineFilter");
const statusFilter = document.querySelector("#statusFilter");
const selectedRouteTitle = document.querySelector("#selectedRouteTitle");
const selectedRouteStatus = document.querySelector("#selectedRouteStatus");
const finishSelectedButton = document.querySelector("#finishSelectedButton");
const deleteSelectedButton = document.querySelector("#deleteSelectedButton");
const selectedMatricula = document.querySelector("#selectedMatricula");
const selectedCliente = document.querySelector("#selectedCliente");
const selectedSentido = document.querySelector("#selectedSentido");
const selectedLinha = document.querySelector("#selectedLinha");
const selectedStart = document.querySelector("#selectedStart");
const selectedEnd = document.querySelector("#selectedEnd");
const pointsTable = document.querySelector("#pointsTable");
const mapStatus = document.querySelector("#mapStatus");
const panelMessage = document.querySelector("#panelMessage");

let routes = [];
let pointCountByRouteId = new Map();
let selectedRouteId = null;
let refreshTimer = null;
let routeMap = null;
let routeMapLayer = null;

function getFilteredRoutes() {
  const driverText = driverFilter.value.trim().toLowerCase();
  const clientText = clientFilter.value.trim().toLowerCase();
  const directionValue = directionFilter.value;
  const lineText = lineFilter.value.trim().toLowerCase();
  const statusValue = statusFilter.value;

  return routes.filter((route) => {
    const matchesDriver = route.matricula_condutor.toLowerCase().includes(driverText);
    const matchesClient = route.cliente.toLowerCase().includes(clientText);
    const matchesDirection = !directionValue || route.sentido === directionValue;
    const matchesLine = (route.nome_linha || "").toLowerCase().includes(lineText);
    const matchesStatus = !statusValue || route.status === statusValue;

    return matchesDriver && matchesClient && matchesDirection && matchesLine && matchesStatus;
  });
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}

function formatNumber(value) {
  return Number(value).toFixed(6);
}

function setMessage(text, type = "") {
  panelMessage.textContent = text;
  panelMessage.className = `message ${type}`.trim();
}

function getSelectedRoute() {
  return routes.find((item) => item.id === selectedRouteId) || null;
}

function updateLastRefresh() {
  lastRefresh.textContent = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function getStatusLabel(status) {
  return status === "finalizado" ? "finalizado" : "ativo";
}

function getPointTypeLabel(type) {
  const labels = {
    primeiro: "Primeiro",
    manual: "Manual",
    trajeto: "Trajeto",
  };

  return labels[type] || "-";
}

function ensureRouteMap() {
  if (routeMap || !window.L) {
    return routeMap;
  }

  routeMap = L.map("routeMap", {
    scrollWheelZoom: true,
  }).setView([-22.9, -47.05], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(routeMap);

  routeMapLayer = L.layerGroup().addTo(routeMap);
  setTimeout(() => routeMap.invalidateSize(), 0);
  return routeMap;
}

function getMarkerIcon(point) {
  const typeClass = point.tipo_ponto || "trajeto";

  return L.divIcon({
    className: "",
    html: `<span class="point-marker ${typeClass}">${point.ordem_ponto}</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function renderRouteMap(points) {
  const map = ensureRouteMap();

  if (!map || !routeMapLayer) {
    mapStatus.textContent = "Mapa indisponivel";
    return;
  }

  map.invalidateSize();

  routeMapLayer.clearLayers();

  const validPoints = points.filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  );

  if (validPoints.length === 0) {
    mapStatus.textContent = "Sem pontos para exibir";
    map.setView([-22.9, -47.05], 11);
    setTimeout(() => map.invalidateSize(), 100);
    return;
  }

  const latLngs = validPoints.map((point) => [point.latitude, point.longitude]);

  if (latLngs.length > 1) {
    L.polyline(latLngs, {
      color: "#1264c8",
      weight: 4,
      opacity: 0.85,
    }).addTo(routeMapLayer);
  }

  validPoints.forEach((point) => {
    L.marker([point.latitude, point.longitude], {
      icon: getMarkerIcon(point),
      title: `Ponto ${point.ordem_ponto}`,
    })
      .bindPopup(
        `<strong>Ponto ${point.ordem_ponto}</strong><br>` +
          `Tipo: ${getPointTypeLabel(point.tipo_ponto)}<br>` +
          `Horario: ${formatDate(point.data_hora_registro)}<br>` +
          `Lat: ${formatNumber(point.latitude)}<br>` +
          `Lng: ${formatNumber(point.longitude)}`
      )
      .addTo(routeMapLayer);
  });

  const fitMap = () => {
    map.invalidateSize();
    map.fitBounds(L.latLngBounds(latLngs), {
      padding: [28, 28],
      maxZoom: 17,
    });
  };

  fitMap();
  setTimeout(fitMap, 150);
  setTimeout(fitMap, 500);
  mapStatus.textContent = `${validPoints.length} pontos no mapa`;
}

function renderRouteList() {
  routeList.innerHTML = "";
  const filteredRoutes = getFilteredRoutes();
  routeListStatus.textContent = `${filteredRoutes.length} exibidos`;

  if (filteredRoutes.length === 0) {
    routeList.innerHTML = '<p class="empty-cell">Nenhum trajeto encontrado.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  filteredRoutes.forEach((route) => {
    const button = document.createElement("button");
    const count = pointCountByRouteId.get(route.id) || 0;
    const isSelected = route.id === selectedRouteId;

    button.type = "button";
    button.className = `route-item ${isSelected ? "selected" : ""}`.trim();
    button.dataset.routeId = route.id;
    button.innerHTML = `
      <span class="route-item-main">
        <strong>${route.cliente}</strong>
        <span class="status-pill ${route.status === "finalizado" ? "finished" : ""}">
          ${getStatusLabel(route.status)}
        </span>
      </span>
      <span class="route-meta">
        Matricula: ${route.matricula_condutor}<br />
        Sentido: ${route.sentido || "-"}<br />
        Linha: ${route.nome_linha || "-"}<br />
        Pontos: ${count} | Inicio: ${formatDate(route.data_hora_inicio)}
      </span>
    `;
    button.addEventListener("click", () => selectRoute(route.id));
    fragment.appendChild(button);
  });

  routeList.appendChild(fragment);
}

function renderRouteDetails(route, points) {
  selectedRouteTitle.textContent = route ? route.cliente : "Selecione um trajeto";
  selectedRouteStatus.textContent = route ? getStatusLabel(route.status) : "-";
  selectedRouteStatus.className = `status-pill ${
    route?.status === "finalizado" ? "finished" : ""
  }`.trim();
  selectedMatricula.textContent = route?.matricula_condutor || "-";
  selectedCliente.textContent = route?.cliente || "-";
  selectedSentido.textContent = route?.sentido || "-";
  selectedLinha.textContent = route?.nome_linha || "-";
  selectedStart.textContent = formatDate(route?.data_hora_inicio);
  selectedEnd.textContent = formatDate(route?.data_hora_fim);
  selectedPointCount.textContent = String(points.length);
  finishSelectedButton.disabled = !route || route.status !== "em_andamento";
  deleteSelectedButton.disabled = !route;
  renderRouteMap(route ? points : []);

  if (!route) {
    pointsTable.innerHTML =
      '<tr><td colspan="6" class="empty-cell">Nenhum trajeto selecionado.</td></tr>';
    return;
  }

  if (points.length === 0) {
    pointsTable.innerHTML =
      '<tr><td colspan="6" class="empty-cell">Nenhum ponto registrado.</td></tr>';
    return;
  }

  const latestPointId = points[points.length - 1].id;

  pointsTable.innerHTML = points
    .map((point) => {
      const mapsUrl = `https://www.google.com/maps?q=${point.latitude},${point.longitude}`;

      return `
        <tr class="${point.id === latestPointId ? "latest" : ""}">
          <td>${point.ordem_ponto}</td>
          <td>${getPointTypeLabel(point.tipo_ponto)}</td>
          <td>${formatDate(point.data_hora_registro)}</td>
          <td>${formatNumber(point.latitude)}</td>
          <td>${formatNumber(point.longitude)}</td>
          <td><a class="map-link" href="${mapsUrl}" target="_blank" rel="noopener">Abrir</a></td>
        </tr>
      `;
    })
    .join("");
}

async function loadPointCounts(routeIds) {
  pointCountByRouteId = new Map();

  if (routeIds.length === 0) {
    return;
  }

  const { data, error } = await supabaseClient
    .from("trajeto_pontos")
    .select("trajeto_id")
    .in("trajeto_id", routeIds);

  if (error) {
    throw error;
  }

  data.forEach((point) => {
    const current = pointCountByRouteId.get(point.trajeto_id) || 0;
    pointCountByRouteId.set(point.trajeto_id, current + 1);
  });
}

async function loadSelectedRouteDetails() {
  if (!selectedRouteId) {
    renderRouteDetails(null, []);
    return;
  }

  const route = getSelectedRoute();

  const { data, error } = await supabaseClient
    .from("trajeto_pontos")
    .select("id, latitude, longitude, data_hora_registro, ordem_ponto, tipo_ponto, precisao")
    .eq("trajeto_id", selectedRouteId)
    .order("ordem_ponto", { ascending: true });

  if (error) {
    throw error;
  }

  renderRouteDetails(route, data || []);
}

async function loadRoutes() {
  setMessage("");
  routeListStatus.textContent = "Carregando...";

  const { data, error } = await supabaseClient
    .from("trajetos")
    .select("id, matricula_condutor, cliente, sentido, nome_linha, status, data_hora_inicio, data_hora_fim, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  routes = data || [];
  await loadPointCounts(routes.map((route) => route.id));

  if (!selectedRouteId && routes.length > 0) {
    const activeRoute = routes.find((route) => route.status === "em_andamento");
    selectedRouteId = activeRoute?.id || routes[0].id;
  }

  if (selectedRouteId && !routes.some((route) => route.id === selectedRouteId)) {
    selectedRouteId = routes[0]?.id || null;
  }

  totalRoutes.textContent = String(routes.length);
  activeRoutes.textContent = String(
    routes.filter((route) => route.status === "em_andamento").length
  );
  totalDrivers.textContent = String(
    new Set(routes.map((route) => route.matricula_condutor)).size
  );
  routeListStatus.textContent = `${getFilteredRoutes().length} exibidos`;
  renderRouteList();
  await loadSelectedRouteDetails();
  updateLastRefresh();
}

async function refreshDashboard() {
  try {
    refreshButton.disabled = true;
    await loadRoutes();
  } catch (error) {
    setMessage(`Erro ao carregar dados: ${error.message}`, "error");
  } finally {
    refreshButton.disabled = false;
  }
}

async function selectRoute(routeId) {
  selectedRouteId = routeId;
  renderRouteList();

  try {
    await loadSelectedRouteDetails();
  } catch (error) {
    setMessage(`Erro ao carregar pontos: ${error.message}`, "error");
  }
}

async function finishSelectedRoute() {
  const route = getSelectedRoute();

  if (!route || route.status !== "em_andamento") {
    setMessage("Selecione um trajeto ativo para finalizar.", "error");
    return;
  }

  try {
    finishSelectedButton.disabled = true;

    const { error } = await supabaseClient
      .from("trajetos")
      .update({
        status: "finalizado",
        data_hora_fim: new Date().toISOString(),
      })
      .eq("id", route.id)
      .eq("status", "em_andamento");

    if (error) {
      throw error;
    }

    setMessage("Trajeto finalizado pelo painel.", "success");
    await refreshDashboard();
  } catch (error) {
    setMessage(`Erro ao finalizar trajeto: ${error.message}`, "error");
  } finally {
    finishSelectedButton.disabled = getSelectedRoute()?.status !== "em_andamento";
  }
}

async function deleteSelectedRoute() {
  const route = getSelectedRoute();

  if (!route) {
    setMessage("Selecione um trajeto para excluir.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Excluir o trajeto de ${route.cliente} da matricula ${route.matricula_condutor}? Esta acao tambem remove os pontos.`
  );

  if (!confirmed) {
    return;
  }

  try {
    deleteSelectedButton.disabled = true;

    const { error } = await supabaseClient
      .from("trajetos")
      .delete()
      .eq("id", route.id);

    if (error) {
      throw error;
    }

    selectedRouteId = null;
    setMessage("Trajeto excluido pelo painel.", "success");
    await refreshDashboard();
  } catch (error) {
    setMessage(`Erro ao excluir trajeto: ${error.message}`, "error");
  } finally {
    deleteSelectedButton.disabled = !getSelectedRoute();
  }
}

function syncRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  if (autoRefreshToggle.checked) {
    refreshTimer = setInterval(refreshDashboard, REFRESH_INTERVAL_MS);
  }
}

refreshButton.addEventListener("click", refreshDashboard);
finishSelectedButton.addEventListener("click", finishSelectedRoute);
deleteSelectedButton.addEventListener("click", deleteSelectedRoute);
autoRefreshToggle.addEventListener("change", syncRefreshTimer);
driverFilter.addEventListener("input", renderRouteList);
clientFilter.addEventListener("input", renderRouteList);
directionFilter.addEventListener("change", renderRouteList);
lineFilter.addEventListener("input", renderRouteList);
statusFilter.addEventListener("change", renderRouteList);

refreshDashboard();
syncRefreshTimer();
