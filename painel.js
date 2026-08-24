const SUPABASE_URL = "https://tytiezeamgwmqrrygoia.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gP0qRTSoUiO8-yMq8dgWEQ_1E3MTt7p";
const REFRESH_INTERVAL_MS = 5000;
const ROUTING_CHUNK_SIZE = 25;
const POINT_UPDATE_CONCURRENCY = 25;
const ROUTING_SERVICE_URL = "https://router.project-osrm.org/route/v1/driving";

const supabaseClient = window.appSupabaseClient || supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let routeOptions = [...(window.ROUTE_OPTIONS || [])];
const conductors = window.CONDUCTOR_BASE || [];
const conductorByRegistration = new Map(
  conductors.map((conductor) => [String(conductor.matricula || "").trim(), conductor])
);

const routeList = document.querySelector("#routeList");
const routeListStatus = document.querySelector("#routeListStatus");
const refreshButton = document.querySelector("#refreshButton");
const autoRefreshToggle = document.querySelector("#autoRefreshToggle");
const totalRoutes = document.querySelector("#totalRoutes");
const activeRoutes = document.querySelector("#activeRoutes");
const totalDrivers = document.querySelector("#totalDrivers");
const selectedPointCount = document.querySelector("#selectedPointCount");
const lastRefresh = document.querySelector("#lastRefresh");
const openDashboardSummaryButton = document.querySelector("#openDashboardSummaryButton");
const dashboardSummaryModal = document.querySelector("#dashboardSummaryModal");
const dashboardSummaryBackdrop = document.querySelector("#dashboardSummaryBackdrop");
const closeDashboardSummaryButton = document.querySelector("#closeDashboardSummaryButton");
const driverFilter = document.querySelector("#driverFilter");
const clientFilter = document.querySelector("#clientFilter");
const directionFilter = document.querySelector("#directionFilter");
const lineFilter = document.querySelector("#lineFilter");
const statusFilter = document.querySelector("#statusFilter");
const operatorFilter = document.querySelector("#operatorFilter");
const trashButton = document.querySelector("#trashButton");
const trashCount = document.querySelector("#trashCount");
const selectedRouteTitle = document.querySelector("#selectedRouteTitle");
const selectedRouteStatus = document.querySelector("#selectedRouteStatus");
const validateSelectedButton = document.querySelector("#validateSelectedButton");
const previousStatusButton = document.querySelector("#previousStatusButton");
const openLayerEditorButton = document.querySelector("#openLayerEditorButton");
const openDemandHistoryButton = document.querySelector("#openDemandHistoryButton");
const finishSelectedButton = document.querySelector("#finishSelectedButton");
const deleteSelectedButton = document.querySelector("#deleteSelectedButton");
const selectedMatricula = document.querySelector("#selectedMatricula");
const selectedDriverAlias = document.querySelector("#selectedDriverAlias");
const selectedDriverGarage = document.querySelector("#selectedDriverGarage");
const selectedCliente = document.querySelector("#selectedCliente");
const selectedSentido = document.querySelector("#selectedSentido");
const selectedLinha = document.querySelector("#selectedLinha");
const selectedStart = document.querySelector("#selectedStart");
const selectedEnd = document.querySelector("#selectedEnd");
const pointsTable = document.querySelector("#pointsTable");
const selectAllPoints = document.querySelector("#selectAllPoints");
const deleteSelectedPointsButton = document.querySelector("#deleteSelectedPointsButton");
const undoDeletePointsButton = document.querySelector("#undoDeletePointsButton");
const deleteRangeStart = document.querySelector("#deleteRangeStart");
const deleteRangeEnd = document.querySelector("#deleteRangeEnd");
const deletePointRangeButton = document.querySelector("#deletePointRangeButton");
const mapStatus = document.querySelector("#mapStatus");
const totalVisibleRecords = document.querySelector("#totalVisibleRecords");
const totalManualPoints = document.querySelector("#totalManualPoints");
const totalTrackPoints = document.querySelector("#totalTrackPoints");
const routeStorageUsage = document.querySelector("#routeStorageUsage");
const fitMapButton = document.querySelector("#fitMapButton");
const toggleTrackPositionsButton = document.querySelector("#toggleTrackPositionsButton");
const editMapButton = document.querySelector("#editMapButton");
const officializeRouteButton = document.querySelector("#officializeRouteButton");
const undoPointOrderButton = document.querySelector("#undoPointOrderButton");
const openMapButton = document.querySelector("#openMapButton");
const closeMapButton = document.querySelector("#closeMapButton");
const mapModal = document.querySelector("#mapModal");
const mapModalBackdrop = document.querySelector("#mapModalBackdrop");
const mapModalTitle = document.querySelector("#mapModalTitle");
const mapPointSearch = document.querySelector("#mapPointSearch");
const mapSearchButton = document.querySelector("#mapSearchButton");
const exportJsonButton = document.querySelector("#exportJsonButton");
const exportKmlButton = document.querySelector("#exportKmlButton");
const exportExcelButton = document.querySelector("#exportExcelButton");
const mapViewInputs = document.querySelectorAll('input[name="mapView"], input[name="mapViewModal"]');
const mapInsertType = document.querySelector("#mapInsertType");
const panelMessage = document.querySelector("#panelMessage");
const trackingChecklist = document.querySelector("#trackingChecklist");
const checklistStatus = document.querySelector("#checklistStatus");
const detailModal = document.querySelector("#detailModal");
const detailModalBackdrop = document.querySelector("#detailModalBackdrop");
const closeDetailButton = document.querySelector("#closeDetailButton");
const openHelpQuestionsButton = document.querySelector("#openHelpQuestionsButton");
const pendingHelpCount = document.querySelector("#pendingHelpCount");
const helpAdminModal = document.querySelector("#helpAdminModal");
const helpAdminBackdrop = document.querySelector("#helpAdminBackdrop");
const closeHelpAdminButton = document.querySelector("#closeHelpAdminButton");
const helpQuestionList = document.querySelector("#helpQuestionList");
const helpAnswerForm = document.querySelector("#helpAnswerForm");
const helpQuestionId = document.querySelector("#helpQuestionId");
const helpOriginalQuestion = document.querySelector("#helpOriginalQuestion");
const helpCorrectedQuestion = document.querySelector("#helpCorrectedQuestion");
const helpAnswerText = document.querySelector("#helpAnswerText");
const saveHelpAnswerButton = document.querySelector("#saveHelpAnswerButton");
const helpQuestionStatusFilter = document.querySelector("#helpQuestionStatusFilter");
const deleteHelpQuestionButton = document.querySelector("#deleteHelpQuestionButton");
const helpMissingLineFields = document.querySelector("#helpMissingLineFields");
const helpLineClient = document.querySelector("#helpLineClient");
const helpLineDirection = document.querySelector("#helpLineDirection");
const helpLineName = document.querySelector("#helpLineName");
const addRequestedLineButton = document.querySelector("#addRequestedLineButton");
const layerEditorModal = document.querySelector("#layerEditorModal");
const layerEditorBackdrop = document.querySelector("#layerEditorBackdrop");
const closeLayerEditorButton = document.querySelector("#closeLayerEditorButton");
const saveOfficialLayerButton = document.querySelector("#saveOfficialLayerButton");
const clearLayerNodesButton = document.querySelector("#clearLayerNodesButton");
const layerEditorStatus = document.querySelector("#layerEditorStatus");
const layerEditorSearch = document.querySelector("#layerEditorSearch");
const layerEditorSearchButton = document.querySelector("#layerEditorSearchButton");
const addLayerManualPointButton = document.querySelector("#addLayerManualPointButton");
const confirmDeleteModal = document.querySelector("#confirmDeleteModal");
const confirmDeleteBackdrop = document.querySelector("#confirmDeleteBackdrop");
const confirmDeleteDescription = document.querySelector("#confirmDeleteDescription");
const confirmDeleteInput = document.querySelector("#confirmDeleteInput");
const confirmDeleteButton = document.querySelector("#confirmDeleteButton");
const cancelDeleteButton = document.querySelector("#cancelDeleteButton");
const deleteLoggedOperator = document.querySelector("#deleteLoggedOperator");
const trashModal = document.querySelector("#trashModal");
const trashBackdrop = document.querySelector("#trashBackdrop");
const closeTrashButton = document.querySelector("#closeTrashButton");
const trashList = document.querySelector("#trashList");
const alignmentModal = document.querySelector("#alignmentModal");
const alignmentBackdrop = document.querySelector("#alignmentBackdrop");
const closeAlignmentButton = document.querySelector("#closeAlignmentButton");
const alignmentForm = document.querySelector("#alignmentForm");
const alignmentLineDescription = document.querySelector("#alignmentLineDescription");
const alignmentDriverAlias = document.querySelector("#alignmentDriverAlias");
const alignmentLoggedOperator = document.querySelector("#alignmentLoggedOperator");
const demandHistoryModal = document.querySelector("#demandHistoryModal");
const demandHistoryBackdrop = document.querySelector("#demandHistoryBackdrop");
const closeDemandHistoryButton = document.querySelector("#closeDemandHistoryButton");
const demandHistoryDescription = document.querySelector("#demandHistoryDescription");
const demandHistoryPopupList = document.querySelector("#demandHistoryPopupList");

let routes = [];
let pointCountByRouteId = new Map();
const HISTORY_SELECTION_STORAGE_KEY = "painel_route_history_selection";
const selectedRouteByLineKey = new Map();
let selectedRouteId = null;
let refreshTimer = null;
let routeMap = null;
let routeMapLayer = null;
let streetMapLayer = null;
let satelliteMapLayer = null;
let routeLineLayer = null;
let nodeConnectionLayer = null;
let mapSearchResultMarker = null;
let routeLineSignature = "";
let mapAutoFitting = false;
let mapUserAdjustedView = false;
let renderedMapRouteId = null;
let renderedPointSignature = "";
let currentMapLatLngs = [];
let currentRoutePoints = [];
let isMapModalOpen = false;
let isDetailModalOpen = false;
let isEditingMapPoints = false;
let pendingRouteNodeEdit = null;
let showValidatedTrackPositions = false;
let layerEditorMap = null;
let layerEditorLine = null;
let layerEditorNodesLayer = null;
let layerEditorStopsLayer = null;
let layerEditorSearchMarker = null;
let isAddingLayerManualPoint = false;
let layerEditorGeometry = [];
let layerEditorOriginalGeometry = [];
let layerEditorNodes = [];
let isLayerEditorOpen = false;
let savingPointId = null;
let lastPointOrderSnapshot = null;
const selectedPointIds = new Set();
let lastDeletedPointBatch = null;
let routeLineRequestId = 0;
let suppressMapClickUntil = 0;
const routedLineCache = new Map();
const routeMarkerByPointId = new Map();
let pendingHelpQuestions = [];
let routePendingDeletion = null;
let executionAlignments = [];
let alignmentOperators = [];
let loggedPlanningOperator = null;
let demandHistory = [];
let pendingAlignmentOption = null;

function updatePointSelectionControls(visiblePoints = filterPointsByView(currentRoutePoints)) {
  const visibleIds = visiblePoints.map((point) => String(point.id));
  const selectedVisibleCount = visibleIds.filter((id) => selectedPointIds.has(id)).length;

  selectAllPoints.disabled = visibleIds.length === 0 || Boolean(savingPointId);
  selectAllPoints.checked = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  selectAllPoints.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
  deleteSelectedPointsButton.disabled = selectedPointIds.size === 0 || Boolean(savingPointId);
  deleteSelectedPointsButton.textContent = `Excluir selecionados (${selectedPointIds.size})`;
  undoDeletePointsButton.disabled =
    !lastDeletedPointBatch ||
    lastDeletedPointBatch.routeId !== selectedRouteId ||
    Boolean(savingPointId);
  const rangeReady = deleteRangeStart.value !== "" && deleteRangeEnd.value !== "";
  deleteRangeStart.disabled = currentRoutePoints.length === 0 || Boolean(savingPointId);
  deleteRangeEnd.disabled = currentRoutePoints.length === 0 || Boolean(savingPointId);
  deletePointRangeButton.disabled = !rangeReady || Boolean(savingPointId);
}

function updateDeleteRangeOptions(points) {
  const previousStart = deleteRangeStart.value;
  const previousEnd = deleteRangeEnd.value;
  const orderedPoints = getOrderedValidPoints(points);
  const options = orderedPoints
    .map((point) => `<option value="${escapeHtml(point.ordem_ponto)}">${escapeHtml(point.ordem_ponto)}</option>`)
    .join("");

  deleteRangeStart.innerHTML = `<option value="">-</option>${options}`;
  deleteRangeEnd.innerHTML = `<option value="">-</option>${options}`;

  if (orderedPoints.some((point) => String(point.ordem_ponto) === previousStart)) {
    deleteRangeStart.value = previousStart;
  }
  if (orderedPoints.some((point) => String(point.ordem_ponto) === previousEnd)) {
    deleteRangeEnd.value = previousEnd;
  }
}

function loadRouteHistorySelection() {
  try {
    const storedSelection = JSON.parse(
      window.localStorage.getItem(HISTORY_SELECTION_STORAGE_KEY) || "{}"
    );

    Object.entries(storedSelection).forEach(([lineKey, routeId]) => {
      if (typeof lineKey === "string" && typeof routeId === "string") {
        selectedRouteByLineKey.set(lineKey, routeId);
      }
    });
  } catch (error) {
    console.warn("Nao foi possivel carregar o historico selecionado.", error);
  }
}

function saveRouteHistorySelection() {
  try {
    window.localStorage.setItem(
      HISTORY_SELECTION_STORAGE_KEY,
      JSON.stringify(Object.fromEntries(selectedRouteByLineKey))
    );
  } catch (error) {
    console.warn("Nao foi possivel salvar o historico selecionado.", error);
  }
}

function getFilteredRoutes() {
  const driverText = driverFilter.value.trim().toLowerCase();
  const clientValue = clientFilter.value;
  const directionValue = directionFilter.value;
  const lineValue = lineFilter.value;
  const statusValue = statusFilter.value;
  const operatorValue = operatorFilter.value;

  return routes.filter((route) => {
    const routeAlignment = executionAlignments.find(
      (alignment) =>
        alignment.cliente === route.cliente &&
        alignment.sentido === (route.sentido || "") &&
        alignment.nome_linha === (route.nome_linha || "")
    );
    const matchesDriver = getDriverSearchText(route).includes(driverText);
    const matchesClient = !clientValue || route.cliente === clientValue;
    const matchesDirection = !directionValue || route.sentido === directionValue;
    const matchesLine = !lineValue || route.nome_linha === lineValue;
    const matchesStatus = !statusValue || getRouteStatus(route) === statusValue;
    const matchesOperator =
      !operatorValue || routeAlignment?.operador_id === operatorValue;

    return matchesDriver && matchesClient && matchesDirection && matchesLine &&
      matchesStatus && matchesOperator;
  }).sort(compareRoutesByLine);
}

function naturalTextCompare(a, b) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR", {
    numeric: true,
    sensitivity: "base",
  });
}

function compareRoutesByLine(a, b) {
  return (
    naturalTextCompare(a.nome_linha, b.nome_linha) ||
    naturalTextCompare(a.cliente, b.cliente) ||
    naturalTextCompare(a.sentido, b.sentido)
  );
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort(naturalTextCompare);
}

function fillFilterSelect(select, placeholder, values) {
  const previousValue = select.value;
  select.innerHTML = "";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = placeholder;
  select.appendChild(defaultOption);

  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });

  select.value = values.includes(previousValue) ? previousValue : "";
}

function populateListBoxFilters() {
  const sourceRoutes = routeOptions.length > 0 ? routeOptions : routes;

  fillFilterSelect(
    clientFilter,
    "Todos os clientes",
    uniqueSorted(sourceRoutes.map((route) => route.cliente))
  );

  refreshLineFilterOptions();
}

function renderFilteredViews() {
  renderRouteList();
  renderTrackingChecklist();
}

function refreshLineFilterOptions() {
  const sourceRoutes = routeOptions.length > 0 ? routeOptions : routes;
  const clientValue = clientFilter.value;
  const directionValue = directionFilter.value;
  const matchingOptions = sourceRoutes.filter(
    (option) =>
      (!clientValue || option.cliente === clientValue) &&
      (!directionValue || option.sentido === directionValue)
  );

  fillFilterSelect(
    lineFilter,
    "Todas as linhas",
    uniqueSorted(matchingOptions.map((option) => option.nome_linha))
  );
}

function openDetailModal() {
  isDetailModalOpen = true;
  detailModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeDetailModal() {
  isDetailModalOpen = false;
  detailModal.classList.add("hidden");

  if (!isMapModalOpen) {
    document.body.classList.remove("modal-open");
  }
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

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const decimals = unitIndex >= 3 ? 2 : unitIndex === 0 ? 0 : 1;
  return `${size.toFixed(decimals)} ${units[unitIndex]}`;
}

function estimateStorageBytes(value) {
  const serialized = JSON.stringify(value ?? {});

  if (window.TextEncoder) {
    return new TextEncoder().encode(serialized).length;
  }

  return new Blob([serialized]).size;
}

function estimateRouteStorage(route, points) {
  if (!route) {
    return 0;
  }

  return estimateStorageBytes({
    trajeto: route,
    pontos: points,
  });
}

function formatFileDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugify(value) {
  return String(value || "trajeto")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "trajeto";
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadBlobFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function setMessage(text, type = "") {
  panelMessage.textContent = text;
  panelMessage.className = `message ${type}`.trim();
}

function getPointEditErrorMessage(error, action) {
  const message = error?.message || "";
  const lowerMessage = message.toLowerCase();
  const needsSql =
    error?.code === "42501" ||
    lowerMessage.includes("row-level security") ||
    lowerMessage.includes("violates row-level security") ||
    lowerMessage.includes("permission denied");

  if (error?.code === "23505" || error?.code === "409" || lowerMessage.includes("duplicate")) {
    return `Erro ao ${action}: conflito de sequencia no banco. Atualize o painel e tente novamente.`;
  }

  if (needsSql) {
    return `Erro ao ${action} ponto: execute no Supabase as politicas de insert/update/delete para trajeto_pontos.`;
  }

  return `Erro ao ${action} ponto: ${message}`;
}

async function copyCoordinatesToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  document.body.removeChild(input);
}
function getSelectedRoute() {
  return routes.find((item) => item.id === selectedRouteId) || null;
}

function getConductorInfo(registration) {
  const key = String(registration || "").trim();
  return conductorByRegistration.get(key) || null;
}

function getRouteConductorInfo(route) {
  return getConductorInfo(route?.matricula_condutor);
}

function getDriverSearchText(route) {
  const conductor = getRouteConductorInfo(route);

  return [
    route?.matricula_condutor,
    conductor?.apelido,
    conductor?.garagem,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function formatConductorSummary(route) {
  const conductor = getRouteConductorInfo(route);

  if (!route) {
    return "-";
  }

  if (!conductor) {
    return `Matricula: ${route.matricula_condutor || "-"}`;
  }

  return `${route.matricula_condutor || "-"} - ${conductor.apelido || "-"} | ${
    conductor.garagem || "-"
  }`;
}

function getRouteStatus(route) {
  if (!route) {
    return "nao_percorrido";
  }

  if (!route.data_hora_fim) {
    return "em_andamento";
  }

  return route.status;
}

function updateLastRefresh() {
  lastRefresh.textContent = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());
}

function openDashboardSummary() {
  dashboardSummaryModal.classList.remove("hidden");
  document.body.classList.add("summary-modal-open");
  closeDashboardSummaryButton.focus();
}

function closeDashboardSummary() {
  dashboardSummaryModal.classList.add("hidden");
  document.body.classList.remove("summary-modal-open");
  openDashboardSummaryButton.focus();
}

function getStatusLabel(status) {
  const labels = {
    em_andamento: "em andamento",
    finalizado: "aguardando validacao",
    importado: "Importação concluída",
    trajeto: "pendente de importação",
    alinhado: "Alinhado com o condutor",
    excluido: "Excluído",
  };

  return labels[status] || status || "-";
}

function getStatusClass(status) {
  if (status === "finalizado") {
    return "waiting";
  }

  if (status === "importado") {
    return "imported";
  }

  if (status === "trajeto") {
    return "validated";
  }

  if (status === "alinhado") {
    return "aligned";
  }

  return "";
}

function getPointTypeLabel(type) {
  const labels = {
    primeiro: "Primeiro",
    manual: "Ponto",
    trajeto: "Trajeto",
    no: "Nó",
  };

  return labels[type] || "-";
}

function getExportName(route) {
  if (!route) {
    return "trajeto";
  }

  return route.nome_linha || route.cliente || "trajeto";
}

function getRouteTrackPoints(points) {
  // Prioriza o ponto manual quando existir um posicionamento automático no
  // mesmo local, evitando duplicidade nas exportações.
  return deduplicateRoutePoints(points);
}

function getRouteStopPoints(points) {
  return deduplicateRoutePoints(points.filter(isManualPoint));
}

function arePointsAtSameLocation(first, second, toleranceMeters = 2) {
  if (!first || !second) return false;
  const firstCoordinate = [Number(first.latitude), Number(first.longitude)];
  const secondCoordinate = [Number(second.latitude), Number(second.longitude)];
  if (![...firstCoordinate, ...secondCoordinate].every(Number.isFinite)) return false;
  return distanceMetersBetweenCoordinates(firstCoordinate, secondCoordinate) <= toleranceMeters;
}

function deduplicateRoutePoints(points, toleranceMeters = 2) {
  const ordered = [...points].sort(
    (first, second) => Number(first.ordem_ponto) - Number(second.ordem_ponto)
  );
  const unique = [];
  const seenIds = new Set();

  ordered.forEach((point) => {
    const pointId = point.id == null ? "" : String(point.id);
    if (pointId && seenIds.has(pointId)) return;
    const duplicateIndex = unique.findIndex((savedPoint) =>
      arePointsAtSameLocation(savedPoint, point, toleranceMeters)
    );
    if (duplicateIndex >= 0) {
      const savedPoint = unique[duplicateIndex];
      if (isManualPoint(point) && !isManualPoint(savedPoint)) {
        unique[duplicateIndex] = point;
      }
      if (pointId) seenIds.add(pointId);
      return;
    }
    unique.push(point);
    if (pointId) seenIds.add(pointId);
  });
  return unique;
}

function getPointTime(point) {
  if (!point.data_hora_registro) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(point.data_hora_registro));
}

function buildExportSummary(route, points) {
  const trackPoints = getRouteTrackPoints(points);
  const stopPoints = getRouteStopPoints(points);
  const conductor = getRouteConductorInfo(route);
  const orderedExportPoints = [...trackPoints].sort(
    (first, second) => Number(first.ordem_ponto) - Number(second.ordem_ponto)
  );
  const firstPointTime = orderedExportPoints[0]?.data_hora_registro;
  const lastPointTime = orderedExportPoints[orderedExportPoints.length - 1]?.data_hora_registro;

  return {
    cliente: route.cliente || "",
    linha: route.nome_linha || "",
    matricula: route.matricula_condutor || "",
    apelido: conductor?.apelido || "",
    garagem: conductor?.garagem || "",
    sentido: route.sentido || "",
    status: getStatusLabel(getRouteStatus(route)),
    horario_inicio: formatFileDate(firstPointTime || route.data_hora_inicio),
    horario_fim: formatFileDate(lastPointTime || route.data_hora_fim),
    total_registros: trackPoints.length,
    total_trajeto: trackPoints.length,
    total_pontos: stopPoints.length,
  };
}

function getJsonPointName(route, point, manualIndex, manualTotal) {
  if (!isManualPoint(point) || manualIndex < 0) {
    return `Ponto ${getExportName(route)} - ${getPointTime(point) || point.ordem_ponto}`;
  }

  const direction = String(route?.sentido || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const isFirst = manualIndex === 0;
  const isLast = manualIndex === manualTotal - 1;
  const clientName = String(route?.cliente || "Cliente").trim() || "Cliente";

  if (direction === "entrada") {
    if (isFirst) return "Primeiro ponto";
    if (isLast) return clientName;
    return "Ponto de embarque";
  }

  if (direction === "saida") {
    if (isFirst) return clientName;
    if (isLast) return "Último ponto";
    return "Ponto de desembarque";
  }

  return `Ponto ${getExportName(route)} - ${getPointTime(point) || point.ordem_ponto}`;
}

function orientGeometryByCapturedRoute(geometry, trackPoints) {
  const coordinates = geometry
    .map((coordinate) => Array.isArray(coordinate)
      ? [Number(coordinate[0]), Number(coordinate[1])]
      : [Number(coordinate.latitude), Number(coordinate.longitude)])
    .filter(([latitude, longitude]) => Number.isFinite(latitude) && Number.isFinite(longitude));
  if (coordinates.length < 2 || trackPoints.length < 2) return coordinates;

  const capturedStart = [
    Number(trackPoints[0].latitude),
    Number(trackPoints[0].longitude),
  ];
  const capturedEnd = [
    Number(trackPoints[trackPoints.length - 1].latitude),
    Number(trackPoints[trackPoints.length - 1].longitude),
  ];
  const normalDistance =
    distanceMetersBetweenCoordinates(coordinates[0], capturedStart) +
    distanceMetersBetweenCoordinates(coordinates[coordinates.length - 1], capturedEnd);
  const reversedDistance =
    distanceMetersBetweenCoordinates(coordinates[0], capturedEnd) +
    distanceMetersBetweenCoordinates(coordinates[coordinates.length - 1], capturedStart);

  return reversedDistance < normalDistance ? coordinates.reverse() : coordinates;
}

function buildJsonExport(route, points, routedLatLngs = null) {
  const trackPoints = getRouteTrackPoints(points);
  const stopPoints = getRouteStopPoints(points);
  const officialGeometry = getOfficialRouteGeometry(route);
  const exportGeometry = routedLatLngs?.length ? routedLatLngs : officialGeometry;
  const orientedGeometry = orientGeometryByCapturedRoute(
    exportGeometry.length ? exportGeometry : trackPoints,
    trackPoints
  );
  // A geometria precisa manter as duas extremidades reais. Os pontos manuais
  // continuam separados em `pontos`, mas não são removidos da linha do trajeto.
  const routeCoordinates = orientedGeometry.map(([latitude, longitude]) => ({
    latitude,
    longitude,
  }));
  const manualIndexByPoint = new Map(
    stopPoints.map((point, index) => [point, index])
  );

  return JSON.stringify(
    {
      resumo: buildExportSummary(route, points),
      trajeto: {
        quantidade_pontos: routeCoordinates.length,
        coordenadas: routeCoordinates.map((point, index) => ({
          ordem: index + 1,
          lat: point.latitude,
          lon: point.longitude,
        })),
      },
      pontos: stopPoints.map((point, index) => ({
        ordem: index + 1,
        nome: getJsonPointName(
          route,
          point,
          manualIndexByPoint.get(point) ?? -1,
          stopPoints.length
        ),
        horario: getPointTime(point),
        descricao: getPointTypeLabel(point.tipo_ponto),
        lat: point.latitude,
        lon: point.longitude,
      })),
    },
    null,
    2
  );
}

function buildKmlExport(route, points, routedLatLngs = null) {
  const name = escapeXml(getExportName(route));
  const trackPoints = getRouteTrackPoints(points);
  const stopPoints = getRouteStopPoints(points);
  const manualIndexByPoint = new Map(stopPoints.map((point, index) => [point, index]));
  const summary = buildExportSummary(route, points);
  const summaryData = [
    ["Cliente", summary.cliente],
    ["Linha", summary.linha],
    ["Matricula", summary.matricula],
    ["Apelido", summary.apelido],
    ["Garagem", summary.garagem],
    ["Sentido", summary.sentido],
    ["Status", summary.status],
    ["Horario de inicio", summary.horario_inicio],
    ["Horario de fim", summary.horario_fim],
    ["Total de registros", summary.total_registros],
    ["Total de trajeto", summary.total_trajeto],
    ["Total de pontos", summary.total_pontos],
  ];
  const summaryDescription = summaryData
    .map(([label, value]) => `${label}: ${value || "-"}`)
    .join("\n");
  const extendedData = summaryData
    .map(
      ([label, value]) =>
        `        <Data name="${escapeXml(label)}"><value>${escapeXml(value)}</value></Data>`
    )
    .join("\n");
  const officialGeometry = getOfficialRouteGeometry(route);
  const exportGeometry = routedLatLngs?.length ? routedLatLngs : officialGeometry;
  const lineCoordinates = exportGeometry.length
    ? exportGeometry.map(([latitude, longitude]) => ({ latitude, longitude }))
    : trackPoints;
  const coordinates = lineCoordinates
    .map((point) => `          ${point.longitude},${point.latitude},0`)
    .join("\n");
  const pointPlacemarks = stopPoints
    .map((point, index) => {
      const pointName = escapeXml(getJsonPointName(
        route, point, manualIndexByPoint.get(point) ?? -1, stopPoints.length
      ));
      const pointTime = getPointTime(point);
      const description = escapeXml(getPointTypeLabel(point.tipo_ponto));

      return `    <Placemark>
      <name>${pointName}</name>
      <description>${description}</description>
      <ExtendedData>
        <Data name="ordem"><value>${index + 1}</value></Data>
        <Data name="nome"><value>${pointName}</value></Data>
        <Data name="horario"><value>${escapeXml(pointTime || "")}</value></Data>
        <Data name="descricao"><value>${description}</value></Data>
        <Data name="lat"><value>${escapeXml(point.latitude)}</value></Data>
        <Data name="lon"><value>${escapeXml(point.longitude)}</value></Data>
      </ExtendedData>
      <styleUrl>#pontoParada</styleUrl>
      <Point>
        <coordinates>${point.longitude},${point.latitude},0</coordinates>
      </Point>
    </Placemark>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name}</name>
    <Style id="trajetoLine">
      <LineStyle>
        <color>ffff6712</color>
        <width>5</width>
      </LineStyle>
    </Style>
    <Style id="pontoParada">
      <IconStyle>
        <color>ff2e344e</color>
        <scale>1</scale>
        <Icon>
          <href>https://www.gstatic.com/mapspro/images/stock/503-wht-blank_maps.png</href>
        </Icon>
      </IconStyle>
      <LabelStyle>
        <scale>1</scale>
      </LabelStyle>
    </Style>
    <Folder>
      <name>Resumo</name>
      <Placemark>
        <name>Resumo - ${name}</name>
        <description>${escapeXml(summaryDescription)}</description>
        <ExtendedData>
${extendedData}
        </ExtendedData>
      </Placemark>
    </Folder>
    <Folder>
      <name>Trajeto</name>
      <Placemark>
        <name>${name}</name>
        <ExtendedData>
          <Data name="quantidade_pontos"><value>${lineCoordinates.length}</value></Data>
        </ExtendedData>
        <styleUrl>#trajetoLine</styleUrl>
        <LineString>
          <tessellate>1</tessellate>
          <coordinates>
${coordinates}
          </coordinates>
        </LineString>
      </Placemark>
    </Folder>
    <Folder>
      <name>Pontos</name>
${pointPlacemarks}
    </Folder>
  </Document>
</kml>`;
}

function buildOrusKmlExport(route, points, routedLatLngs = null) {
  const name = escapeXml(getExportName(route));
  const trackPoints = getRouteTrackPoints(points);
  const routeCoordinates = routedLatLngs?.length
    ? routedLatLngs.map(([latitude, longitude]) => ({ latitude, longitude }))
    : trackPoints;
  const coordinates = routeCoordinates
    .map((point) => `          ${Number(point.longitude).toFixed(6)},${Number(point.latitude).toFixed(6)},0`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${name}</name>
    <Style id="line-1267FF-5000-nodesc-normal">
      <LineStyle>
        <color>ffff6712</color>
        <width>5</width>
      </LineStyle>
      <BalloonStyle>
        <text><![CDATA[<h3>$[name]</h3>]]></text>
      </BalloonStyle>
    </Style>
    <Style id="line-1267FF-5000-nodesc-highlight">
      <LineStyle>
        <color>ffff6712</color>
        <width>7.5</width>
      </LineStyle>
      <BalloonStyle>
        <text><![CDATA[<h3>$[name]</h3>]]></text>
      </BalloonStyle>
    </Style>
    <StyleMap id="line-1267FF-5000-nodesc">
      <Pair>
        <key>normal</key>
        <styleUrl>#line-1267FF-5000-nodesc-normal</styleUrl>
      </Pair>
      <Pair>
        <key>highlight</key>
        <styleUrl>#line-1267FF-5000-nodesc-highlight</styleUrl>
      </Pair>
    </StyleMap>
    <Placemark>
      <name>${name}</name>
      <styleUrl>#line-1267FF-5000-nodesc</styleUrl>
      <LineString>
        <tessellate>1</tessellate>
        <coordinates>
${coordinates}
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>`;
}

function getColumnLetter(index) {
  let column = "";
  let value = index + 1;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    column = String.fromCharCode(65 + remainder) + column;
    value = Math.floor((value - 1) / 26);
  }

  return column;
}

function buildWorksheetXml(rows) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = row
        .map((cell, cellIndex) => {
          const cellRef = `${getColumnLetter(cellIndex)}${rowNumber}`;

          if (typeof cell === "number" && Number.isFinite(cell)) {
            return `<c r="${cellRef}"><v>${cell}</v></c>`;
          }

          return `<c r="${cellRef}" t="inlineStr"><is><t>${escapeXml(cell)}</t></is></c>`;
        })
        .join("");

      return `<row r="${rowNumber}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${rowXml}</sheetData>
</worksheet>`;
}

function getCrcTable() {
  if (getCrcTable.table) {
    return getCrcTable.table;
  }

  getCrcTable.table = Array.from({ length: 256 }, (_, index) => {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    return value >>> 0;
  });

  return getCrcTable.table;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  bytes.forEach((byte) => {
    crc = table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });

  return (crc ^ 0xffffffff) >>> 0;
}

function pushUint16(target, value) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushUint32(target, value) {
  target.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff
  );
}

function concatBytes(parts) {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const checksum = crc32(contentBytes);
    const localHeader = [];

    pushUint32(localHeader, 0x04034b50);
    pushUint16(localHeader, 20);
    pushUint16(localHeader, 0);
    pushUint16(localHeader, 0);
    pushUint16(localHeader, 0);
    pushUint16(localHeader, 0);
    pushUint32(localHeader, checksum);
    pushUint32(localHeader, contentBytes.length);
    pushUint32(localHeader, contentBytes.length);
    pushUint16(localHeader, nameBytes.length);
    pushUint16(localHeader, 0);

    localParts.push(new Uint8Array(localHeader), nameBytes, contentBytes);

    const centralHeader = [];
    pushUint32(centralHeader, 0x02014b50);
    pushUint16(centralHeader, 20);
    pushUint16(centralHeader, 20);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint32(centralHeader, checksum);
    pushUint32(centralHeader, contentBytes.length);
    pushUint32(centralHeader, contentBytes.length);
    pushUint16(centralHeader, nameBytes.length);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint16(centralHeader, 0);
    pushUint32(centralHeader, 0);
    pushUint32(centralHeader, offset);

    centralParts.push(new Uint8Array(centralHeader), nameBytes);
    offset += localHeader.length + nameBytes.length + contentBytes.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const endRecord = [];
  pushUint32(endRecord, 0x06054b50);
  pushUint16(endRecord, 0);
  pushUint16(endRecord, 0);
  pushUint16(endRecord, files.length);
  pushUint16(endRecord, files.length);
  pushUint32(endRecord, centralDirectory.length);
  pushUint32(endRecord, offset);
  pushUint16(endRecord, 0);

  return concatBytes([...localParts, centralDirectory, new Uint8Array(endRecord)]);
}

function createXlsxWorkbook(sheets) {
  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${sheets.map((_, index) => `  <Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
</Types>`,
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
${sheets.map((sheet, index) => `    <sheet name="${escapeXml(sheet.name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join("\n")}
  </sheets>
</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets.map((_, index) => `  <Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join("\n")}
</Relationships>`,
    },
    ...sheets.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      content: buildWorksheetXml(sheet.rows),
    })),
  ];

  return createZip(files);
}

function buildExcelExport(route, points) {
  const trackPoints = getRouteTrackPoints(points);
  const stopPoints = getRouteStopPoints(points);
  const summary = buildExportSummary(route, points);
  const summaryRows = [
    ["Informacao", "Valor"],
    ["Cliente", summary.cliente],
    ["Linha", summary.linha],
    ["Matricula", summary.matricula],
    ["Apelido", summary.apelido],
    ["Garagem", summary.garagem],
    ["Sentido", summary.sentido],
    ["Status", summary.status],
    ["Horario de inicio", summary.horario_inicio],
    ["Horario de fim", summary.horario_fim],
    ["Total de registros", summary.total_registros],
    ["Total de trajeto", summary.total_trajeto],
    ["Total de pontos", summary.total_pontos],
  ];
  const trackRows = [
    ["Ordem", "Latitude", "Longitude", "Data e hora", "Tipo"],
    ...trackPoints.map((point, index) => [
      index + 1,
      point.latitude,
      point.longitude,
      formatFileDate(point.data_hora_registro),
      getPointTypeLabel(point.tipo_ponto),
    ]),
  ];
  const stopRows = [
    ["Ordem", "Nome", "Horario", "Descricao", "Latitude", "Longitude"],
    ...stopPoints.map((point, index) => [
      index + 1,
      `Ponto ${getExportName(route)} - ${getPointTime(point) || point.ordem_ponto}`,
      getPointTime(point),
      getPointTypeLabel(point.tipo_ponto),
      point.latitude,
      point.longitude,
    ]),
  ];

  return createXlsxWorkbook([
    { name: "Resumo", rows: summaryRows },
    { name: "Trajeto", rows: trackRows },
    { name: "Pontos", rows: stopRows },
  ]);
}

async function exportSelectedRoute(format) {
  let route = getSelectedRoute();

  if (!route) {
    setMessage("Selecione um trajeto para exportar.", "error");
    return;
  }

  exportJsonButton.disabled = true;
  exportKmlButton.disabled = true;
  exportExcelButton.disabled = true;
  setMessage("Atualizando a rota oficial e os pontos antes da exportação...", "");
  try {
    const [routeResult, pointsResult] = await Promise.all([
      supabaseClient.from("trajetos")
        .select("id, matricula_condutor, cliente, sentido, nome_linha, status, data_hora_inicio, data_hora_fim, created_at, deleted_at, geometria_validada, nos_validacao")
        .eq("id", route.id)
        .single(),
      supabaseClient.from("trajeto_pontos")
        .select("id, latitude, longitude, data_hora_registro, ordem_ponto, tipo_ponto, precisao")
        .eq("trajeto_id", route.id)
        .order("ordem_ponto", { ascending: true }),
    ]);
    if (routeResult.error) throw routeResult.error;
    if (pointsResult.error) throw pointsResult.error;
    Object.assign(route, routeResult.data);
    route = routeResult.data;
    currentRoutePoints = pointsResult.data || [];
  } catch (error) {
    setMessage(`Erro ao atualizar os dados para exportação: ${error.message}`, "error");
    exportJsonButton.disabled = false;
    exportKmlButton.disabled = false;
    exportExcelButton.disabled = false;
    return;
  }

  const exportPoints = [...currentRoutePoints];
  if (exportPoints.length === 0) {
    setMessage("A rota oficial não possui pontos para exportar.", "error");
    exportJsonButton.disabled = true;
    exportKmlButton.disabled = true;
    exportExcelButton.disabled = true;
    return;
  }

  const filename = slugify(getExportName(route));

  if (format === "kml") {
    const trackPoints = getRouteTrackPoints(exportPoints);
    if (trackPoints.length < 2) {
      setMessage("O trajeto precisa ter pelo menos dois registros para exportar em KML.", "error");
      exportJsonButton.disabled = true;
      exportKmlButton.disabled = true;
      exportExcelButton.disabled = false;
      return;
    }
    setMessage("Calculando o trajeto pelas ruas para gerar o KML...", "");
    try {
      const officialGeometry = getOfficialRouteGeometry(route);
      const routedLatLngs = officialGeometry.length
        ? officialGeometry
        : await fetchRoutedLatLngs(getRoutingControlPoints(trackPoints));
      if (routedLatLngs.length < 2) {
        throw new Error("não foi possível gerar a geometria detalhada da rota");
      }
      downloadTextFile(
        `${filename}-trajeto-pontos.kml`,
        buildKmlExport(route, exportPoints, routedLatLngs),
        "application/vnd.google-earth.kml+xml;charset=utf-8"
      );
      setMessage("KML gerado com as mesmas informações do JSON e trajeto ajustado pelas ruas.", "success");
    } catch (error) {
      setMessage(`Erro ao gerar KML pelas ruas: ${error.message}`, "error");
    } finally {
      const unavailable = getRouteTrackPoints(exportPoints).length < 2;
      exportJsonButton.disabled = unavailable;
      exportKmlButton.disabled = unavailable;
      exportExcelButton.disabled = false;
    }
    return;
  }

  if (format === "orus") {
    const trackPoints = getRouteTrackPoints(exportPoints);
    if (trackPoints.length < 2) {
      setMessage("O trajeto precisa ter pelo menos dois registros para exportar no formato OrUS.", "error");
      exportJsonButton.disabled = true;
      exportExcelButton.disabled = false;
      return;
    }
    exportOrusButton.disabled = true;
    setMessage("Calculando o trajeto pelas ruas para gerar o OrUS...", "");
    try {
      const officialGeometry = getOfficialRouteGeometry(route);
      const routedLatLngs = officialGeometry.length
        ? officialGeometry
        : await fetchRoutedLatLngs(getRoutingControlPoints(trackPoints));
      if (routedLatLngs.length < 2) {
        throw new Error("nao foi possivel gerar a geometria detalhada da rota");
      }
      downloadTextFile(
        `${filename}-OrUS.kml`,
        buildOrusKmlExport(route, exportPoints, routedLatLngs),
        "application/vnd.google-earth.kml+xml;charset=utf-8"
      );
      setMessage("OrUS gerado com o trajeto ajustado pelas ruas.", "success");
    } catch (error) {
      setMessage(`Erro ao gerar OrUS pelas ruas: ${error.message}`, "error");
    } finally {
      exportOrusButton.disabled = getRouteTrackPoints(exportPoints).length < 2;
      exportJsonButton.disabled = getRouteTrackPoints(exportPoints).length < 2;
      exportKmlButton.disabled = getRouteTrackPoints(exportPoints).length < 2;
      exportExcelButton.disabled = false;
    }
    return;
  }

  if (format === "json") {
    const trackPoints = getRouteTrackPoints(exportPoints);
    if (trackPoints.length < 2) {
      setMessage("O trajeto precisa ter pelo menos dois registros para exportar em JSON.", "error");
      exportJsonButton.disabled = true;
      exportKmlButton.disabled = true;
      exportExcelButton.disabled = false;
      return;
    }
    exportJsonButton.disabled = true;
    setMessage("Calculando o trajeto pelas ruas para gerar o JSON...", "");
    try {
      const officialGeometry = getOfficialRouteGeometry(route);
      const routedLatLngs = officialGeometry.length
        ? officialGeometry
        : await fetchRoutedLatLngs(getRoutingControlPoints(trackPoints));
      if (routedLatLngs.length < 2) {
        throw new Error("nao foi possivel gerar a geometria detalhada da rota");
      }
      downloadTextFile(
        `${filename}-trajeto-pontos.json`,
        buildJsonExport(route, exportPoints, routedLatLngs),
        "application/json;charset=utf-8"
      );
      setMessage("JSON gerado com o trajeto ajustado pelas ruas.", "success");
    } catch (error) {
      setMessage(`Erro ao gerar JSON pelas ruas: ${error.message}`, "error");
    } finally {
      exportJsonButton.disabled = getRouteTrackPoints(exportPoints).length < 2;
      exportKmlButton.disabled = getRouteTrackPoints(exportPoints).length < 2;
      exportExcelButton.disabled = false;
    }
    return;
  }

  downloadBlobFile(
    `${filename}-trajeto-pontos.xlsx`,
    buildExcelExport(route, exportPoints),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  exportJsonButton.disabled = false;
  exportKmlButton.disabled = false;
  exportExcelButton.disabled = false;
  setMessage("Excel gerado com a versão oficial mais recente da rota.", "success");
}

function getMapViewMode() {
  return document.querySelector('input[name="mapView"]:checked')?.value || "ambos";
}

function syncMapViewInputs(viewMode) {
  mapViewInputs.forEach((input) => {
    input.checked = input.value === viewMode;
  });
}

function isManualPoint(point) {
  return point.tipo_ponto === "primeiro" || point.tipo_ponto === "manual";
}

function canMovePointOnMap(point) {
  return isManualPoint(point) || point.tipo_ponto === "trajeto";
}

function shouldHideTrackPositions(route = getSelectedRoute()) {
  return Boolean(route && ["trajeto", "importado"].includes(route.status) && !showValidatedTrackPositions);
}

function syncTrackPositionVisibilityButton(route = getSelectedRoute()) {
  const canToggle = Boolean(route && ["trajeto", "importado"].includes(route.status));
  toggleTrackPositionsButton.disabled = !canToggle;
  toggleTrackPositionsButton.classList.toggle("active", canToggle && showValidatedTrackPositions);
  toggleTrackPositionsButton.textContent = canToggle && showValidatedTrackPositions
    ? "Ocultar posicionamentos"
    : "Exibir posicionamentos";
}

function getDuplicateCoordinateKeySet(points) {
  const counts = new Map();

  points.forEach((point) => {
    if (!isManualPoint(point) || !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
      return;
    }

    const key = getCoordinateKey(point);
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
}

function isDuplicateCoordinatePoint(point, points) {
  return isManualPoint(point) && getDuplicateCoordinateKeySet(points).has(getCoordinateKey(point));
}

function filterPointsByView(points) {
  const viewMode = getMapViewMode();

  if (viewMode === "pontos") {
    return points.filter(isManualPoint);
  }

  if (viewMode === "trajeto") {
    return points.filter((point) => ["trajeto", "no"].includes(point.tipo_ponto));
  }

  if (viewMode === "duplicados") {
    const duplicateKeys = getDuplicateCoordinateKeySet(points);
    return points.filter((point) => isManualPoint(point) && duplicateKeys.has(getCoordinateKey(point)));
  }

  return points;
}

function getMapViewLabel() {
  const labels = {
    ambos: "registros",
    pontos: "pontos",
    trajeto: "pontos de trajeto",
    duplicados: "coordenadas duplicadas",
  };

  return labels[getMapViewMode()] || "registros";
}

function ensureRouteMap() {
  if (routeMap || !window.L) {
    return routeMap;
  }

  routeMap = L.map("routeMap", {
    scrollWheelZoom: true,
  }).setView([-22.9, -47.05], 11);

  routeMap.on("dragstart zoomstart", () => {
    if (!mapAutoFitting) {
      mapUserAdjustedView = true;
    }
  });

  routeMap.on("click", (event) => {
    if (Date.now() < suppressMapClickUntil) {
      return;
    }

    if (isEditingMapPoints) {
      insertTrackPointAt(event.latlng);
    }
  });

  streetMapLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(routeMap);

  satelliteMapLayer = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri",
    }
  );

  L.control.layers(
    {
      Ruas: streetMapLayer,
      Satelite: satelliteMapLayer,
    },
    null,
    { position: "topright", collapsed: false }
  ).addTo(routeMap);

  routeMapLayer = L.layerGroup().addTo(routeMap);
  setTimeout(() => routeMap.invalidateSize(), 0);
  return routeMap;
}

function getMarkerIcon(point, isDuplicate = false) {
  const typeClass = isDuplicate ? "duplicado" : point.tipo_ponto || "trajeto";
  const markerContent = point.tipo_ponto === "trajeto"
    ? escapeHtml(point.ordem_ponto)
    : isManualPoint(point) ? "P" : "";

  return L.divIcon({
    className: "",
    html: `<span class="point-marker ${typeClass}" aria-label="${point.tipo_ponto === "no" ? "Nó de controle" : `Ponto ${point.ordem_ponto}`}">${markerContent}</span>`,
    iconSize: point.tipo_ponto === "no" ? [16, 16] : [28, 28],
    iconAnchor: point.tipo_ponto === "no" ? [8, 8] : [14, 14],
  });
}

function getPointSignature(points) {
  return `${getMapViewMode()}::${points
    .map((point) => `${point.id}:${point.latitude}:${point.longitude}:${point.ordem_ponto}`)
    .join("|")}`;
}

function getOrderedValidPoints(points) {
  return [...points]
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .sort((a, b) => a.ordem_ponto - b.ordem_ponto);
}

function getRoutingControlPoints(points) {
  const orderedPoints = getOrderedValidPoints(points);
  const nodeIndexes = orderedPoints
    .map((point, index) => point.tipo_ponto === "no" ? index : -1)
    .filter((index) => index >= 0);

  if (nodeIndexes.length < 2) return orderedPoints;

  const firstNodeIndex = nodeIndexes[0];
  const lastNodeIndex = nodeIndexes[nodeIndexes.length - 1];
  return orderedPoints.filter((point, index) =>
    index <= firstNodeIndex ||
    index >= lastNodeIndex ||
    isManualPoint(point) ||
    point.tipo_ponto === "no"
  );
}

function getCoordinateKey(point) {
  return `${formatNumber(point.latitude)}|${formatNumber(point.longitude)}`;
}

function getOverlapDisplayPoints(points) {
  const duplicateKeys = getDuplicateCoordinateKeySet(points);
  const groups = new Map();
  const displayById = new Map();

  points.forEach((point) => {
    const key = getCoordinateKey(point);

    if (!isManualPoint(point) || !duplicateKeys.has(key)) {
      displayById.set(String(point.id), {
        point,
        latitude: point.latitude,
        longitude: point.longitude,
        overlapCount: 1,
        overlapIndex: 0,
        isDuplicateManual: false,
      });
      return;
    }

    const group = groups.get(key) || [];
    group.push(point);
    groups.set(key, group);
  });

  groups.forEach((group) => {
    const orderedGroup = [...group].sort((a, b) => a.ordem_ponto - b.ordem_ponto);
    const radius = Math.min(0.00016, 0.000055 + orderedGroup.length * 0.000006);

    orderedGroup.forEach((point, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / orderedGroup.length;
      displayById.set(String(point.id), {
        point,
        latitude: point.latitude + Math.sin(angle) * radius,
        longitude: point.longitude + Math.cos(angle) * radius,
        overlapCount: orderedGroup.length,
        overlapIndex: index + 1,
        isDuplicateManual: true,
      });
    });
  });

  return points.map((point) => displayById.get(String(point.id))).filter(Boolean);
}

function getPointDistanceToSegment(point, segmentStart, segmentEnd) {
  const lat = point.lat;
  const lng = point.lng;
  const startLat = segmentStart.latitude;
  const startLng = segmentStart.longitude;
  const endLat = segmentEnd.latitude;
  const endLng = segmentEnd.longitude;
  const latDelta = endLat - startLat;
  const lngDelta = endLng - startLng;
  const lengthSquared = latDelta * latDelta + lngDelta * lngDelta;

  if (lengthSquared === 0) {
    return Math.hypot(lat - startLat, lng - startLng);
  }

  const ratio = Math.max(
    0,
    Math.min(1, ((lat - startLat) * latDelta + (lng - startLng) * lngDelta) / lengthSquared)
  );
  const projectedLat = startLat + ratio * latDelta;
  const projectedLng = startLng + ratio * lngDelta;

  return Math.hypot(lat - projectedLat, lng - projectedLng);
}

function getInsertionOrder(latLng) {
  const orderedPoints = getOrderedValidPoints(currentRoutePoints);

  if (orderedPoints.length === 0) {
    return 1;
  }

  if (orderedPoints.length === 1) {
    return orderedPoints[0].ordem_ponto + 1;
  }

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < orderedPoints.length - 1; index += 1) {
    const distance = getPointDistanceToSegment(latLng, orderedPoints[index], orderedPoints[index + 1]);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }

  return orderedPoints[closestIndex].ordem_ponto + 1;
}

function addEditableRouteClick(polyline) {
  if (!isEditingMapPoints) {
    return;
  }

  polyline.on("click", (event) => {
    if (event.originalEvent) {
      L.DomEvent.stop(event.originalEvent);
    }

    insertTrackPointAt(event.latlng);
  });
}

function drawRouteLine(latLngs, options = {}) {
  const nextSignature =
    options.signature ||
    `${isEditingMapPoints ? "edit" : "view"}::${latLngs
      .map(([lat, lng]) => `${lat},${lng}`)
      .join("|")}`;

  if (routeLineLayer && routeLineSignature === nextSignature) {
    return routeLineLayer;
  }

  if (routeLineLayer) {
    routeMap.removeLayer(routeLineLayer);
    routeLineLayer = null;
  }

  const polyline = L.polyline(latLngs, {
    color: options.color || "#1264c8",
    weight: options.weight || 4,
    opacity: options.opacity ?? 0.85,
    dashArray: options.dashArray || null,
    className: isEditingMapPoints ? "editable-route-line" : "",
  }).addTo(routeMap);

  addEditableRouteClick(polyline);
  routeLineLayer = polyline;
  routeLineSignature = nextSignature;
  return polyline;
}

function getRoutePointChunks(points) {
  const chunks = [];

  for (let index = 0; index < points.length - 1; index += ROUTING_CHUNK_SIZE - 1) {
    chunks.push(points.slice(index, Math.min(points.length, index + ROUTING_CHUNK_SIZE)));
  }

  return chunks.filter((chunk) => chunk.length > 1);
}

async function fetchRoutedLatLngs(points) {
  const chunks = getRoutePointChunks(points);
  const routedLatLngs = [];

  for (const chunk of chunks) {
    const coordinates = chunk
      .map((point) => `${point.longitude},${point.latitude}`)
      .join(";");
    const url = `${ROUTING_SERVICE_URL}/${coordinates}?overview=full&geometries=geojson&continue_straight=false`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("servico de rota indisponivel");
    }

    const data = await response.json();
    const route = data?.routes?.[0];

    if (!route?.geometry?.coordinates?.length) {
      throw new Error("rota nao encontrada");
    }

    const chunkLatLngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    if (routedLatLngs.length > 0) {
      chunkLatLngs.shift();
    }

    routedLatLngs.push(...chunkLatLngs);
  }

  return routedLatLngs;
}

function getOfficialRouteGeometry(route) {
  const geometry = route?.geometria_validada;
  if (!Array.isArray(geometry)) return [];
  return geometry.map((coordinate) => {
    if (Array.isArray(coordinate)) return [Number(coordinate[0]), Number(coordinate[1])];
    return [Number(coordinate?.lat ?? coordinate?.latitude), Number(coordinate?.lng ?? coordinate?.longitude)];
  }).filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
}

function getSavedOfficialRouteNodes(route) {
  if (!Array.isArray(route?.nos_validacao)) return [];
  return route.nos_validacao
    .map((node) => ({
      id: String(node?.id || createLayerNodeId()),
      lat: Number(node?.lat ?? node?.latitude),
      lng: Number(node?.lng ?? node?.longitude),
      index: Number(node?.index) || 0,
    }))
    .filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lng));
}

function ensureLayerEditorMap() {
  if (layerEditorMap || !window.L) return layerEditorMap;
  layerEditorMap = L.map("layerEditorMap", { scrollWheelZoom: true }).setView([-22.9, -47.05], 11);
  const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(layerEditorMap);
  const satellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Tiles &copy; Esri" });
  L.control.layers({ Ruas: streets, Satélite: satellite }, null, { collapsed: false }).addTo(layerEditorMap);
  layerEditorStopsLayer = L.layerGroup().addTo(layerEditorMap);
  layerEditorNodesLayer = L.layerGroup().addTo(layerEditorMap);
  layerEditorMap.on("click", async (event) => {
    if (!isAddingLayerManualPoint) return;
    const inserted = await insertTrackPointAt(event.latlng);
    if (!inserted) return;
    isAddingLayerManualPoint = false;
    addLayerManualPointButton.classList.remove("active");
    addLayerManualPointButton.textContent = "Adicionar ponto manual";
    await routeOfficialGeometryThroughBoardingPoints();
    saveOfficialLayerButton.disabled = false;
    layerEditorStatus.textContent =
      "Ponto manual incluído e rota recalculada. Oficialize a camada para salvar.";
    renderOfficialLayerEditor();
  });
  return layerEditorMap;
}

function renderLayerEditorBoardingPoints() {
  if (!layerEditorStopsLayer) return;
  layerEditorStopsLayer.clearLayers();

  getRouteStopPoints(currentRoutePoints).forEach((point) => {
    const marker = L.marker([point.latitude, point.longitude], {
      interactive: true,
      keyboard: false,
      draggable: true,
      icon: L.divIcon({
        className: "",
        html: '<span class="layer-boarding-point" aria-label="Ponto de embarque">P</span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      }),
      title: `Ponto de embarque ${point.ordem_ponto || ""}`.trim(),
    }).addTo(layerEditorStopsLayer);

    const time = getPointTime(point);
    marker.bindTooltip(
      `Ponto de embarque ${point.ordem_ponto || ""}${time ? ` - ${time}` : ""}`.trim(),
      { direction: "top", offset: [0, -8] }
    );
    const popup = document.createElement("div");
    popup.className = "point-popup-content";
    const title = document.createElement("strong");
    title.textContent = `Ponto de embarque ${point.ordem_ponto || ""}`.trim();
    const moveHint = document.createElement("span");
    moveHint.className = "popup-edit-hint";
    moveHint.textContent = "Arraste o ponto para ajustar sua posição.";
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "popup-danger-button";
    removeButton.textContent = "Excluir ponto de embarque";
    removeButton.addEventListener("click", async () => {
      marker.closePopup();
      const deleted = await deleteMapPoint(point);
      if (!deleted) return;
      await routeOfficialGeometryThroughBoardingPoints();
      saveOfficialLayerButton.disabled = false;
      layerEditorStatus.textContent =
        "Ponto removido e rota recalculada. Oficialize a camada para salvar.";
      renderOfficialLayerEditor();
    });
    popup.append(title, moveHint, removeButton);
    marker.bindPopup(popup);
    marker.on("dragstart", () => {
      marker.closePopup();
    });
    marker.on("dragend", async () => {
      const previousLatitude = point.latitude;
      const previousLongitude = point.longitude;
      const position = marker.getLatLng();
      point.latitude = position.lat;
      point.longitude = position.lng;
      layerEditorStatus.textContent = "Recalculando a rota após mover o ponto manual...";
      try {
        await routeOfficialGeometryThroughBoardingPoints();
        saveOfficialLayerButton.disabled = false;
        layerEditorStatus.textContent =
          "Ponto movido e rota recalculada. Oficialize a camada para salvar.";
        renderOfficialLayerEditor();
      } catch (error) {
        point.latitude = previousLatitude;
        point.longitude = previousLongitude;
        marker.setLatLng([previousLatitude, previousLongitude]);
        layerEditorStatus.textContent = `Erro ao mover o ponto: ${error.message}`;
      }
    });
  });
}

function showLayerEditorSearchResult(latitude, longitude, label) {
  if (layerEditorSearchMarker) {
    layerEditorMap.removeLayer(layerEditorSearchMarker);
  }
  const popup = document.createElement("div");
  popup.className = "point-popup-content";
  const title = document.createElement("strong");
  title.textContent = label;
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "popup-secondary-button";
  addButton.textContent = "Incluir ponto de embarque";
  addButton.addEventListener("click", async () => {
    const inserted = await insertTrackPointAt({ lat: latitude, lng: longitude });
    if (!inserted) return;
    await routeOfficialGeometryThroughBoardingPoints();
    saveOfficialLayerButton.disabled = false;
    layerEditorStatus.textContent =
      "Ponto incluído e rota recalculada. Oficialize a camada para salvar.";
    if (layerEditorSearchMarker) {
      layerEditorMap.removeLayer(layerEditorSearchMarker);
      layerEditorSearchMarker = null;
    }
    renderOfficialLayerEditor();
  });
  popup.append(title, addButton);
  layerEditorSearchMarker = L.marker([latitude, longitude], { title })
    .bindPopup(popup)
    .addTo(layerEditorMap);
  layerEditorMap.setView(
    [latitude, longitude],
    Math.max(layerEditorMap.getZoom(), 17),
    { animate: true }
  );
  layerEditorSearchMarker.openPopup();
}

async function searchLayerEditorLocation(event) {
  event?.preventDefault();
  const query = layerEditorSearch.value.trim();
  if (!query) {
    layerEditorStatus.textContent = "Digite um endereço ou coordenadas.";
    layerEditorSearch.focus();
    return;
  }

  const coordinateMatch = query.match(
    /^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/
  );
  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1].replace(",", "."));
    const longitude = Number(coordinateMatch[2].replace(",", "."));
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      showLayerEditorSearchResult(latitude, longitude, "Coordenadas pesquisadas");
      layerEditorStatus.textContent =
        "Local encontrado. Clique em Incluir ponto de embarque.";
      return;
    }
  }

  layerEditorSearchButton.disabled = true;
  layerEditorStatus.textContent = "Pesquisando endereço...";
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("q", query);
    const response = await fetch(url, {
      headers: { "Accept-Language": "pt-BR" },
    });
    if (!response.ok) throw new Error("serviço de endereços indisponível");
    const results = await response.json();
    if (!results.length) throw new Error("endereço não encontrado");
    showLayerEditorSearchResult(
      Number(results[0].lat),
      Number(results[0].lon),
      results[0].display_name
    );
    layerEditorStatus.textContent =
      "Endereço localizado. Clique em Incluir ponto de embarque.";
  } catch (error) {
    layerEditorStatus.textContent = `Erro ao pesquisar: ${error.message}`;
  } finally {
    layerEditorSearchButton.disabled = false;
  }
}

function getOfficialLayerRequiredControls() {
  const controls = [
    {
      latitude: layerEditorGeometry[0][0],
      longitude: layerEditorGeometry[0][1],
      geometryIndex: 0,
    },
    ...getRouteStopPoints(currentRoutePoints).map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      geometryIndex: findClosestIndexInGeometry(
        { lat: point.latitude, lng: point.longitude },
        layerEditorGeometry
      ),
    })),
    ...layerEditorNodes.map((node) => ({
      latitude: node.lat,
      longitude: node.lng,
      geometryIndex: node.index,
    })),
    {
      latitude: layerEditorGeometry[layerEditorGeometry.length - 1][0],
      longitude: layerEditorGeometry[layerEditorGeometry.length - 1][1],
      geometryIndex: layerEditorGeometry.length - 1,
    },
  ].sort((first, second) => first.geometryIndex - second.geometryIndex);

  return controls.filter((control, index) => {
    if (index === 0) return true;
    const previous = controls[index - 1];
    return distanceMetersBetweenCoordinates(
      [previous.latitude, previous.longitude],
      [control.latitude, control.longitude]
    ) > 2;
  });
}

function hasBoardingPointOutsideOfficialGeometry(maximumDistanceMeters = 8) {
  return getRouteStopPoints(currentRoutePoints).some((point) => {
    const closestIndex = findClosestIndexInGeometry(
      { lat: point.latitude, lng: point.longitude },
      layerEditorGeometry
    );
    return distanceMetersBetweenCoordinates(
      [point.latitude, point.longitude],
      layerEditorGeometry[closestIndex]
    ) > maximumDistanceMeters;
  });
}

async function routeOfficialGeometryThroughBoardingPoints() {
  const controls = getOfficialLayerRequiredControls();
  if (controls.length < 2) return;
  layerEditorGeometry = await fetchRoutedLatLngs(controls);
  layerEditorNodes.forEach((node) => {
    node.index = findClosestIndexInGeometry(
      { lat: node.lat, lng: node.lng },
      layerEditorGeometry
    );
  });
}

function findClosestLayerGeometryIndex(latLng) {
  return findClosestIndexInGeometry(latLng, layerEditorGeometry);
}

function findClosestIndexInGeometry(latLng, geometry) {
  let closestIndex = 0;
  let distance = Number.POSITIVE_INFINITY;
  geometry.forEach(([lat, lng], index) => {
    const nextDistance = Math.hypot(latLng.lat - lat, latLng.lng - lng);
    if (nextDistance < distance) { distance = nextDistance; closestIndex = index; }
  });
  return closestIndex;
}

function createLayerNodeId() {
  return window.crypto?.randomUUID?.() ||
    `layer-node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getLayerSegmentBounds(geometryIndex, ignoredNodeId = null) {
  const anchors = [
    ...getRouteStopPoints(currentRoutePoints).map((point) => ({
      id: `boarding-${point.id}`,
      index: findClosestLayerGeometryIndex({
        lat: point.latitude,
        lng: point.longitude,
      }),
      coordinate: [point.latitude, point.longitude],
    })),
    ...layerEditorNodes
      .filter((node) => node.id !== ignoredNodeId)
      .map((node) => ({
        id: node.id,
        index: node.index,
        coordinate: [node.lat, node.lng],
      })),
  ].sort((first, second) => first.index - second.index);
  const previousAnchor = [...anchors].reverse().find((anchor) => anchor.index < geometryIndex);
  const nextAnchor = anchors.find((anchor) => anchor.index > geometryIndex);
  const startIndex = previousAnchor?.index ?? 0;
  const endIndex = nextAnchor?.index ?? layerEditorGeometry.length - 1;

  return {
    startIndex,
    endIndex,
    startCoordinate: previousAnchor?.coordinate ?? layerEditorGeometry[startIndex],
    endCoordinate: nextAnchor?.coordinate ?? layerEditorGeometry[endIndex],
  };
}

async function reshapeOfficialLayerAt(latLng, sourceIndex, existingNode = null) {
  const previousGeometry = layerEditorGeometry.map((coordinate) => [...coordinate]);
  const {
    startIndex,
    endIndex,
    startCoordinate,
    endCoordinate,
  } = getLayerSegmentBounds(sourceIndex, existingNode?.id);
  const controls = [
    startCoordinate,
    [latLng.lat, latLng.lng],
    endCoordinate,
  ].map(([latitude, longitude]) => ({ latitude, longitude }));
  const routedSegment = await fetchRoutedLatLngs(controls);

  if (routedSegment.length < 2) throw new Error("novo trecho não encontrado");

  layerEditorGeometry = [
    ...previousGeometry.slice(0, startIndex),
    ...routedSegment,
    ...previousGeometry.slice(endIndex + 1),
  ];

  const editedNode = existingNode || {
    id: createLayerNodeId(),
    index: startIndex,
    lat: latLng.lat,
    lng: latLng.lng,
  };
  editedNode.lat = latLng.lat;
  editedNode.lng = latLng.lng;
  if (!existingNode) layerEditorNodes.push(editedNode);

  layerEditorNodes.forEach((node) => {
    node.index = findClosestIndexInGeometry(
      { lat: node.lat, lng: node.lng },
      layerEditorGeometry
    );
  });
  layerEditorNodes.sort((a, b) => a.index - b.index);
}

async function removeOfficialLayerNode(node) {
  const previousGeometry = layerEditorGeometry.map((coordinate) => [...coordinate]);
  const {
    startIndex,
    endIndex,
    startCoordinate,
    endCoordinate,
  } = getLayerSegmentBounds(node.index, node.id);
  const routedSegment = await fetchRoutedLatLngs([
    { latitude: startCoordinate[0], longitude: startCoordinate[1] },
    { latitude: endCoordinate[0], longitude: endCoordinate[1] },
  ]);

  if (routedSegment.length < 2) {
    throw new Error("não foi possível recalcular o trecho sem o nó");
  }

  layerEditorNodes = layerEditorNodes.filter((item) => item.id !== node.id);
  layerEditorGeometry = [
    ...previousGeometry.slice(0, startIndex),
    ...routedSegment,
    ...previousGeometry.slice(endIndex + 1),
  ];
  layerEditorNodes.forEach((remainingNode) => {
    remainingNode.index = findClosestIndexInGeometry(
      { lat: remainingNode.lat, lng: remainingNode.lng },
      layerEditorGeometry
    );
  });
  layerEditorNodes.sort((first, second) => first.index - second.index);
}

function enableOfficialLineDragging(line) {
  line.on("mousedown", (event) => {
    if (isAddingLayerManualPoint) return;
    if (event.originalEvent?.button !== undefined && event.originalEvent.button !== 0) return;
    L.DomEvent.stop(event.originalEvent);
    const sourceIndex = findClosestLayerGeometryIndex(event.latlng);
    const previewMarker = L.circleMarker(event.latlng, {
      radius: 7,
      color: "#2563eb",
      fillColor: "#ffffff",
      fillOpacity: 1,
      weight: 3,
      interactive: false,
    }).addTo(layerEditorNodesLayer);

    layerEditorMap.dragging.disable();
    layerEditorStatus.textContent = "Arraste a linha até a rua desejada e solte.";

    const handleMove = (moveEvent) => previewMarker.setLatLng(moveEvent.latlng);
    const handleUp = async (upEvent) => {
      layerEditorMap.off("mousemove", handleMove);
      layerEditorMap.off("mouseup", handleUp);
      document.removeEventListener("mouseup", handleDocumentUp);
      layerEditorMap.dragging.enable();
      const destination = upEvent?.latlng || previewMarker.getLatLng();
      layerEditorStatus.textContent = "Recalculando somente o trecho puxado...";
      try {
        await reshapeOfficialLayerAt(destination, sourceIndex);
        saveOfficialLayerButton.disabled = false;
        layerEditorStatus.textContent =
          "Trecho ajustado. A rota fora das travas permaneceu inalterada.";
      } catch (error) {
        layerEditorStatus.textContent = `Erro ao calcular pelas ruas: ${error.message}`;
      }
      renderOfficialLayerEditor();
    };
    const handleDocumentUp = () => handleUp({ latlng: previewMarker.getLatLng() });

    layerEditorMap.on("mousemove", handleMove);
    layerEditorMap.on("mouseup", handleUp);
    document.addEventListener("mouseup", handleDocumentUp, { once: true });
  });
}

function renderOfficialLayerEditor() {
  const map = ensureLayerEditorMap();
  if (!map || layerEditorGeometry.length < 2) return;
  if (layerEditorLine) map.removeLayer(layerEditorLine);
  layerEditorNodesLayer.clearLayers();
  renderLayerEditorBoardingPoints();
  layerEditorLine = L.polyline(layerEditorGeometry, { color: "#116149", weight: 7, opacity: .92, className: "official-layer-line" }).addTo(map);
  enableOfficialLineDragging(layerEditorLine);
  /*
    layerEditorStatus.textContent = `${layerEditorNodes.length} nó(s). Arraste para puxar a camada.`;
  */
  layerEditorNodes.forEach((node) => {
    const marker = L.marker([node.lat, node.lng], {
      draggable: true,
      icon: L.divIcon({ className: "", html: '<span class="point-marker no"></span>', iconSize: [16, 16], iconAnchor: [8, 8] }),
    }).addTo(layerEditorNodesLayer);
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "popup-danger-button";
    removeButton.textContent = "Excluir nó";
    removeButton.addEventListener("click", async () => {
      marker.closePopup();
      layerEditorStatus.textContent = "Removendo o nó e recalculando o trecho pelas ruas...";
      try {
        await removeOfficialLayerNode(node);
        saveOfficialLayerButton.disabled = false;
        layerEditorStatus.textContent =
          "Nó removido. O trecho foi recalculado sem essa trava; oficialize para salvar.";
        renderOfficialLayerEditor();
      } catch (error) {
        layerEditorStatus.textContent = `Erro ao remover o nó: ${error.message}`;
      }
    });
    marker.bindPopup(removeButton);
    marker.on("dragend", async () => {
      const position = marker.getLatLng();
      layerEditorStatus.textContent = "Recalculando somente o trecho entre as travas...";
      try {
        await reshapeOfficialLayerAt(position, node.index, node);
        saveOfficialLayerButton.disabled = false;
        layerEditorStatus.textContent = "Prévia atualizada. Clique em Oficializar camada para salvar.";
        renderOfficialLayerEditor();
      } catch (error) {
        layerEditorStatus.textContent = `Erro ao calcular pelas ruas: ${error.message}`;
      }
    });
  });
}

async function openOfficialLayerEditor() {
  const route = getSelectedRoute();
  if (!route || !["trajeto", "importado"].includes(route.status)) return;
  isLayerEditorOpen = true;
  layerEditorModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  layerEditorNodes = getSavedOfficialRouteNodes(route);
  layerEditorGeometry = getOfficialRouteGeometry(route);
  if (layerEditorGeometry.length < 2) {
    layerEditorStatus.textContent = "Criando a camada inicial pelas ruas...";
    layerEditorGeometry = await fetchRoutedLatLngs(getOrderedValidPoints(currentRoutePoints));
  }
  layerEditorNodes.forEach((node) => {
    node.index = findClosestIndexInGeometry(
      { lat: node.lat, lng: node.lng },
      layerEditorGeometry
    );
  });
  layerEditorOriginalGeometry = layerEditorGeometry.map((coordinate) => [...coordinate]);
  saveOfficialLayerButton.disabled = true;
  if (hasBoardingPointOutsideOfficialGeometry()) {
    layerEditorStatus.textContent =
      "Ajustando a prévia para passar por todos os pontos de embarque...";
    try {
      await routeOfficialGeometryThroughBoardingPoints();
      saveOfficialLayerButton.disabled = false;
      layerEditorStatus.textContent =
        "Prévia corrigida para passar pelos pontos de embarque. Clique em Oficializar camada para salvar.";
    } catch (error) {
      layerEditorStatus.textContent =
        `Não foi possível ajustar os pontos de embarque: ${error.message}`;
    }
  } else {
    layerEditorStatus.textContent =
      "Clique e arraste diretamente a linha verde. Os pontos de embarque funcionam como travas obrigatórias.";
  }
  renderOfficialLayerEditor();
  setTimeout(() => {
    layerEditorMap.invalidateSize();
    layerEditorMap.fitBounds(L.latLngBounds(layerEditorGeometry), { padding: [28, 28], maxZoom: 17 });
  }, 80);
}

function closeOfficialLayerEditor() {
  isAddingLayerManualPoint = false;
  addLayerManualPointButton.classList.remove("active");
  addLayerManualPointButton.textContent = "Adicionar ponto manual";
  isLayerEditorOpen = false;
  layerEditorModal.classList.add("hidden");
  if (!isMapModalOpen && !isDetailModalOpen) document.body.classList.remove("modal-open");
}

function distanceMetersBetweenCoordinates(first, second) {
  const earthRadius = 6371000;
  const toRadians = (value) => value * Math.PI / 180;
  const latitudeDelta = toRadians(second[0] - first[0]);
  const longitudeDelta = toRadians(second[1] - first[1]);
  const firstLatitude = toRadians(first[0]);
  const secondLatitude = toRadians(second[0]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) * Math.cos(secondLatitude) *
    Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(haversine));
}

function sampleGeometryEveryMeters(geometry, spacingMeters = 100) {
  if (geometry.length < 2) return geometry.map((coordinate) => [...coordinate]);
  const sampled = [[...geometry[0]]];
  let distanceUntilNextPoint = spacingMeters;

  for (let index = 1; index < geometry.length; index += 1) {
    let segmentStart = [...geometry[index - 1]];
    const segmentEnd = geometry[index];
    let remainingDistance = distanceMetersBetweenCoordinates(segmentStart, segmentEnd);

    while (remainingDistance >= distanceUntilNextPoint && remainingDistance > 0) {
      const ratio = distanceUntilNextPoint / remainingDistance;
      const sampledPoint = [
        segmentStart[0] + (segmentEnd[0] - segmentStart[0]) * ratio,
        segmentStart[1] + (segmentEnd[1] - segmentStart[1]) * ratio,
      ];
      sampled.push(sampledPoint);
      segmentStart = sampledPoint;
      remainingDistance = distanceMetersBetweenCoordinates(segmentStart, segmentEnd);
      distanceUntilNextPoint = spacingMeters;
    }
    distanceUntilNextPoint -= remainingDistance;
  }

  const lastCoordinate = geometry[geometry.length - 1];
  const finalGap = distanceMetersBetweenCoordinates(sampled[sampled.length - 1], lastCoordinate);
  if (finalGap > spacingMeters / 2) {
    sampled.push([...lastCoordinate]);
  } else if (finalGap > 0.01) {
      // Mantém o espaçamento próximo de 100 m, mas garante que o último
    // posicionamento fique exatamente na extremidade oficial da linha.
    sampled[sampled.length - 1] = [...lastCoordinate];
  }
  return sampled;
}

function buildOfficialTrackPointPayload(geometry) {
  const sampledCoordinates = sampleGeometryEveryMeters(geometry, 100);
  const manualPoints = getRouteStopPoints(currentRoutePoints);
  const rows = sampledCoordinates
    .filter(([latitude, longitude]) => !manualPoints.some((point) =>
      distanceMetersBetweenCoordinates(
        [latitude, longitude],
        [Number(point.latitude), Number(point.longitude)]
      ) <= 2
    ))
    .map(([latitude, longitude], index) => ({
    latitude,
    longitude,
    tipo_ponto: "trajeto",
    data_hora_registro: new Date().toISOString(),
    precisao: null,
    route_position: index,
    priority: 1,
  }));

  manualPoints.forEach((point) => {
    const closestIndex = findClosestIndexInGeometry(
      { lat: point.latitude, lng: point.longitude },
      sampledCoordinates
    );
    rows.push({
      id: point.id,
      latitude: point.latitude,
      longitude: point.longitude,
      tipo_ponto: point.tipo_ponto,
      data_hora_registro: point.data_hora_registro,
      precisao: point.precisao,
      route_position: closestIndex,
      priority: point.tipo_ponto === "primeiro" ? 0 : 2,
    });
  });

  return rows
    .sort((first, second) =>
      first.route_position - second.route_position || first.priority - second.priority
    )
    .map(({ route_position, priority, ...point }, index) => ({
      ...point,
      ordem_ponto: index + 1,
    }));
}

async function saveOfficialLayer() {
  const route = getSelectedRoute();
  if (!route || layerEditorGeometry.length < 2) return;
  saveOfficialLayerButton.disabled = true;
  layerEditorStatus.textContent = "Roteirizando a camada pelos pontos de embarque...";
  try {
    await routeOfficialGeometryThroughBoardingPoints();
    renderOfficialLayerEditor();
  } catch (error) {
    layerEditorStatus.textContent = `Erro ao roteirizar pelos pontos de embarque: ${error.message}`;
    saveOfficialLayerButton.disabled = false;
    return;
  }
  layerEditorStatus.textContent = "Salvando a geometria e os nós sem alterar os pontos...";
  const { error } = await supabaseClient.rpc("save_official_route_geometry", {
    p_trajeto_id: route.id,
    p_geometry: layerEditorGeometry,
    p_nodes: layerEditorNodes.map((node) => ({
      id: node.id,
      lat: node.lat,
      lng: node.lng,
      index: node.index,
    })),
  });
  if (error) { setMessage(`Erro ao salvar camada: ${error.message}`, "error"); saveOfficialLayerButton.disabled = false; return; }
  route.geometria_validada = layerEditorGeometry;
  route.nos_validacao = layerEditorNodes.map((node) => ({ ...node }));
  const returnedToValidatedStatus = route.status === "importado";
  if (returnedToValidatedStatus) route.status = "trajeto";
  routedLineCache.clear();
  layerEditorStatus.textContent =
    "Camada salva. Sincronizando somente os posicionamentos automáticos a cada 100 metros...";
  const replacementPoints = buildOfficialTrackPointPayload(layerEditorGeometry);
  const { error: fillError } = await supabaseClient.rpc(
    "replace_automatic_route_points",
    {
      p_trajeto_id: route.id,
      p_points: replacementPoints,
    }
  );
  if (fillError) {
    setMessage(
      `A camada foi salva, mas os posicionamentos não foram preenchidos: ${fillError.message}`,
      "error"
    );
    saveOfficialLayerButton.disabled = false;
    return;
  }
  setMessage(
    `Camada oficial salva e posicionamentos automáticos atualizados a cada 100 metros. Pontos manuais preservados.${returnedToValidatedStatus ? " Status alterado para Pendente de importação." : ""}`,
    "success"
  );
  closeOfficialLayerEditor();
  await loadSelectedRouteDetails();
}

async function drawRoutedLine(validPoints, fallbackLatLngs, requestId) {
  if (validPoints.length < 2 || ["pontos", "duplicados"].includes(getMapViewMode())) {
    return;
  }

  const cacheKey = getPointSignature(validPoints);
  const cachedLatLngs = routedLineCache.get(cacheKey);

  if (cachedLatLngs?.length > 1) {
    currentMapLatLngs = cachedLatLngs;
    drawRouteLine(cachedLatLngs, {
      color: "#116149",
      weight: 5,
      opacity: 0.9,
      signature: `${isEditingMapPoints ? "edit" : "view"}::routed::${cacheKey}`,
    });
    drawNodeConnections(validPoints, cachedLatLngs);
    mapStatus.textContent = `${validPoints.length} ${getMapViewLabel()} no mapa - rota por ruas`;
    return;
  }

  try {
    mapStatus.textContent = `${validPoints.length} ${getMapViewLabel()} no mapa - calculando rota`;
    const routedLatLngs = await fetchRoutedLatLngs(validPoints);

    if (requestId !== routeLineRequestId || !routeMapLayer || routedLatLngs.length < 2) {
      return;
    }

    routedLineCache.set(cacheKey, routedLatLngs);
    currentMapLatLngs = routedLatLngs;
    drawRouteLine(routedLatLngs, {
      color: "#116149",
      weight: 5,
      opacity: 0.9,
      signature: `${isEditingMapPoints ? "edit" : "view"}::routed::${cacheKey}`,
    });
    drawNodeConnections(validPoints, routedLatLngs);

    if (isMapModalOpen && !mapUserAdjustedView) {
      fitRouteMap();
    }

    mapStatus.textContent = `${validPoints.length} ${getMapViewLabel()} no mapa - rota por ruas`;
  } catch (error) {
    currentMapLatLngs = fallbackLatLngs;
    mapStatus.textContent = `${validPoints.length} ${getMapViewLabel()} no mapa - linha simples`;
    console.warn("Nao foi possivel calcular a rota por ruas.", error);
  }
}

function getClosestGeometryIndex(point, geometry) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  geometry.forEach(([latitude, longitude], index) => {
    const distance = Math.hypot(point.latitude - latitude, point.longitude - longitude);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  return closestIndex;
}

function drawNodeConnections(points, geometry = currentMapLatLngs) {
  if (nodeConnectionLayer && routeMap) {
    routeMap.removeLayer(nodeConnectionLayer);
    nodeConnectionLayer = null;
  }
  if (!isEditingMapPoints) return;
  const nodes = getOrderedValidPoints(points).filter((point) => point.tipo_ponto === "no");
  if (!routeMap || nodes.length < 2 || geometry.length < 2) return;

  nodeConnectionLayer = L.layerGroup().addTo(routeMap);
  for (let index = 0; index < nodes.length - 1; index += 1) {
    const firstIndex = getClosestGeometryIndex(nodes[index], geometry);
    const secondIndex = getClosestGeometryIndex(nodes[index + 1], geometry);
    const start = Math.min(firstIndex, secondIndex);
    const end = Math.max(firstIndex, secondIndex);
    const segment = geometry.slice(start, end + 1);
    if (segment.length < 2) continue;
    L.polyline(segment, {
      color: "#7c3aed",
      weight: 7,
      opacity: 0.82,
      className: "node-connected-segment",
    }).bindTooltip("Trecho entre nós").addTo(nodeConnectionLayer);
  }
}

function fitRouteMap() {
  const map = ensureRouteMap();

  if (!map || !isMapModalOpen || currentMapLatLngs.length === 0) {
    return;
  }

  mapAutoFitting = true;
  map.invalidateSize();
  map.fitBounds(L.latLngBounds(currentMapLatLngs), {
    padding: [28, 28],
    maxZoom: 17,
  });
  setTimeout(() => {
    mapAutoFitting = false;
  }, 300);
}

function setMapEditing(enabled) {
  if (!enabled && pendingRouteNodeEdit) cancelPendingRouteNodeEdit();
  isEditingMapPoints = enabled;
  editMapButton.classList.toggle("active", isEditingMapPoints);
  editMapButton.textContent = isEditingMapPoints ? "Concluir edicao" : "Editar pontos";
  syncRefreshTimer();
  setMessage(
    isEditingMapPoints
      ? "Edição ativa: mova posicionamentos, altere a ordem ou clique no mapa para incluir um ponto de embarque."
      : "",
    ""
  );
  renderRouteDetails(getSelectedRoute(), currentRoutePoints);
}

async function updatePointPosition(point, latLng) {
  if (!selectedRouteId || savingPointId) {
    return;
  }

  const previousLatitude = point.latitude;
  const previousLongitude = point.longitude;

  point.latitude = latLng.lat;
  point.longitude = latLng.lng;
  savingPointId = point.id;
  routedLineCache.clear();
  setMessage("Salvando ajuste do ponto...", "");

  try {
    const { data, error } = await supabaseClient
      .from("trajeto_pontos")
      .update({
        latitude: latLng.lat,
        longitude: latLng.lng,
      })
      .eq("id", point.id)
      .select("id, latitude, longitude")
      .single();

    if (error) {
      throw error;
    }

    if (!data?.id) {
      throw new Error("o Supabase nao confirmou a alteracao do ponto");
    }

    setMessage("Ponto ajustado e trajeto recalculado.", "success");
    await loadSelectedRouteDetails();
  } catch (error) {
    point.latitude = previousLatitude;
    point.longitude = previousLongitude;
    setMessage(getPointEditErrorMessage(error, "ajustar"), "error");
    renderRouteDetails(getSelectedRoute(), currentRoutePoints);
  } finally {
    savingPointId = null;
    syncRefreshTimer();
  }
}

async function previewRouteNodeEdit(point, latLng) {
  const previewPoints = getOrderedValidPoints(currentRoutePoints).map((item) =>
    item.id === point.id
      ? { ...item, latitude: latLng.lat, longitude: latLng.lng }
      : item
  );
  mapStatus.textContent = "Calculando o novo trecho pelas ruas...";
  try {
    const routedLatLngs = await fetchRoutedLatLngs(getRoutingControlPoints(previewPoints));
    pendingRouteNodeEdit = {
      pointId: point.id,
      latitude: latLng.lat,
      longitude: latLng.lng,
      routedLatLngs,
    };
    currentMapLatLngs = routedLatLngs;
    drawRouteLine(routedLatLngs, {
      color: "#7c3aed",
      weight: 6,
      opacity: 0.9,
      signature: `preview::${point.id}::${latLng.lat}::${latLng.lng}`,
    });
    officializeRouteButton.disabled = false;
    mapStatus.textContent = "Prévia pelas ruas pronta. Clique em Oficializar alteração para salvar.";
    setMessage("Prévia criada. Os pontos manuais permanecerão fixos.", "success");
  } catch (error) {
    routeMarkerByPointId.get(String(point.id))?.setLatLng([point.latitude, point.longitude]);
    pendingRouteNodeEdit = null;
    officializeRouteButton.disabled = true;
    setMessage(`Não foi possível calcular o trecho pelas ruas: ${error.message}`, "error");
    renderRouteDetails(getSelectedRoute(), currentRoutePoints);
  }
}

function cancelPendingRouteNodeEdit() {
  pendingRouteNodeEdit = null;
  officializeRouteButton.disabled = true;
  routedLineCache.clear();
}

async function officializeRouteNodeEdit() {
  if (!pendingRouteNodeEdit || savingPointId) return;
  const edit = pendingRouteNodeEdit;
  savingPointId = edit.pointId;
  officializeRouteButton.disabled = true;
  try {
    const { data, error } = await supabaseClient.from("trajeto_pontos")
      .update({ latitude: edit.latitude, longitude: edit.longitude })
      .eq("id", edit.pointId)
      .eq("trajeto_id", selectedRouteId)
      .select("id").single();
    if (error) throw error;
    if (!data?.id) throw new Error("o Supabase não confirmou a alteração");
    pendingRouteNodeEdit = null;
    routedLineCache.clear();
    setMessage("Alteração oficializada. O trecho atualizado seguirá as ruas nas exportações.", "success");
    await loadSelectedRouteDetails();
  } catch (error) {
    setMessage(`Erro ao oficializar alteração: ${error.message}`, "error");
    officializeRouteButton.disabled = false;
  } finally {
    savingPointId = null;
    syncRefreshTimer();
  }
}

async function updatePointOrder(pointId, ordemPonto) {
  const { data, error } = await supabaseClient
    .from("trajeto_pontos")
    .update({ ordem_ponto: ordemPonto })
    .eq("id", pointId)
    .select("id, ordem_ponto")
    .single();

  if (error) {
    throw error;
  }

  if (!data?.id || Number(data.ordem_ponto) !== Number(ordemPonto)) {
    throw new Error("o Supabase nao confirmou a atualizacao da ordem do ponto");
  }
}

async function updatePointOrdersInBatches(updates) {
  for (let index = 0; index < updates.length; index += POINT_UPDATE_CONCURRENCY) {
    const batch = updates.slice(index, index + POINT_UPDATE_CONCURRENCY);
    await Promise.all(
      batch.map(({ pointId, order }) => updatePointOrder(pointId, order))
    );
  }
}

function getSafeTemporaryOrderBase(points, extraCount = 0) {
  const maxOrder = Math.max(
    0,
    ...getOrderedValidPoints(currentRoutePoints).map((point) => Number(point.ordem_ponto) || 0),
    ...points.map((point) => Number(point?.ordem_ponto) || 0)
  );

  return maxOrder + extraCount + 100000;
}

async function renumberRoutePointsWithInsertedPoint(insertedPointId, newOrder) {
  const orderedPoints = getOrderedValidPoints(currentRoutePoints);
  const boundedOrder = Math.max(1, Math.min(newOrder, orderedPoints.length + 1));
  const orderedIds = orderedPoints.map((point) => point.id);

  orderedIds.splice(boundedOrder - 1, 0, insertedPointId);

  const tempBaseOrder = getSafeTemporaryOrderBase(orderedPoints, orderedIds.length);

  await updatePointOrdersInBatches(
    orderedIds.map((pointId, index) => ({ pointId, order: tempBaseOrder + index }))
  );
  await updatePointOrdersInBatches(
    orderedIds.map((pointId, index) => ({ pointId, order: index + 1 }))
  );
}

async function renumberExistingRoutePoints(points) {
  const orderedIds = points
    .filter((point) => point?.id)
    .map((point) => point.id);
  const tempBaseOrder = getSafeTemporaryOrderBase(points, orderedIds.length);

  await updatePointOrdersInBatches(
    orderedIds.map((pointId, index) => ({ pointId, order: tempBaseOrder + index }))
  );
  await updatePointOrdersInBatches(
    orderedIds.map((pointId, index) => ({ pointId, order: index + 1 }))
  );
}

async function movePointToOrder(point, targetOrder) {
  if (!point || savingPointId) {
    return false;
  }

  const orderedPoints = getOrderedValidPoints(currentRoutePoints);
  const pointIndex = orderedPoints.findIndex((item) => item.id === point.id);

  if (pointIndex === -1) {
    setMessage("Ponto nao encontrado na sequencia atual.", "error");
    return false;
  }

  const boundedOrder = Math.max(1, Math.min(Number(targetOrder) || point.ordem_ponto, orderedPoints.length));
  if (boundedOrder === pointIndex + 1) {
    setMessage("O ponto ja esta nessa ordem.", "");
    return false;
  }

  const confirmed = window.confirm(
    `Mover o ponto ${point.ordem_ponto} para a ordem ${boundedOrder}? Os pontos entre essas posicoes serao renumerados.`
  );
  if (!confirmed) return;

  const previousOrder = [...orderedPoints];
  const nextOrder = [...orderedPoints];
  const [movedPoint] = nextOrder.splice(pointIndex, 1);

  nextOrder.splice(boundedOrder - 1, 0, movedPoint);

  savingPointId = point.id;
  routedLineCache.clear();
  syncRefreshTimer();
  setMessage("Atualizando ID do ponto...", "");

  try {
    await renumberExistingRoutePoints(nextOrder);
    lastPointOrderSnapshot = {
      routeId: selectedRouteId,
      points: previousOrder,
    };
    undoPointOrderButton.disabled = false;
    setMessage("ID do ponto atualizado e trajeto recalculado.", "success");
    await loadSelectedRouteDetails();
  } catch (error) {
    setMessage(getPointEditErrorMessage(error, "alterar ID do ponto"), "error");
    await loadSelectedRouteDetails();
  } finally {
    savingPointId = null;
    syncRefreshTimer();
  }
}

async function undoLastPointOrderChange() {
  const snapshot = lastPointOrderSnapshot;
  if (!snapshot || snapshot.routeId !== selectedRouteId || savingPointId) {
    setMessage("Nao ha alteracao de ordem para desfazer neste trajeto.", "error");
    return;
  }

  const confirmed = window.confirm("Restaurar a sequencia anterior dos pontos?");
  if (!confirmed) return;

  savingPointId = "desfazer-ordem";
  undoPointOrderButton.disabled = true;
  routedLineCache.clear();
  syncRefreshTimer();
  setMessage("Restaurando sequencia anterior...", "");

  try {
    await renumberExistingRoutePoints(snapshot.points);
    lastPointOrderSnapshot = null;
    setMessage("Sequencia anterior restaurada.", "success");
    await loadSelectedRouteDetails();
  } catch (error) {
    undoPointOrderButton.disabled = false;
    setMessage(getPointEditErrorMessage(error, "desfazer alteracao de ordem"), "error");
    await loadSelectedRouteDetails();
  } finally {
    savingPointId = null;
    syncRefreshTimer();
  }
}

async function insertTrackPointAt(latLng) {
  if (!selectedRouteId || savingPointId) {
    return false;
  }

  const pointType = mapInsertType.value === "manual" ? "manual" : "no";
  const pointLabel = pointType === "no" ? "nó de controle" : "ponto manual";
  const confirmed = window.confirm(`Inserir um ${pointLabel} nesta posição?`);

  if (!confirmed) {
    return false;
  }

  const orderedPoints = getOrderedValidPoints(currentRoutePoints);
  const newOrder = getInsertionOrder(latLng);
  const newPointTemporaryOrder =
    getSafeTemporaryOrderBase(orderedPoints, 1);

  savingPointId = "novo";
  routedLineCache.clear();
  syncRefreshTimer();
  setMessage(`Inserindo ${pointLabel}...`, "");

  try {
    const { data: insertedPoint, error: insertError } = await supabaseClient
      .from("trajeto_pontos")
      .insert({
        trajeto_id: selectedRouteId,
        latitude: latLng.lat,
        longitude: latLng.lng,
        data_hora_registro: new Date().toISOString(),
        ordem_ponto: newPointTemporaryOrder,
        tipo_ponto: pointType,
        precisao: null,
      })
      .select("id, tipo_ponto")
      .single();

    if (insertError) {
      throw insertError;
    }
    if (!insertedPoint?.id || insertedPoint.tipo_ponto !== pointType) {
      throw new Error("o Supabase não confirmou o ponto como manual");
    }

    await renumberRoutePointsWithInsertedPoint(insertedPoint.id, newOrder);

    setMessage(
      pointType === "no"
        ? "Nó criado. Arraste-o para alterar o caminho e depois oficialize."
        : "Ponto manual criado e mantido como âncora fixa.",
      "success"
    );
    await loadSelectedRouteDetails();
    return true;
  } catch (error) {
    const message = error?.message || "";
    const needsSql =
      error?.status === 403 ||
      error?.code === "42501" ||
      message.includes("403") ||
      message.toLowerCase().includes("row-level security") ||
      message.toLowerCase().includes("violates row-level security");

    setMessage(
      needsSql
        ? "A inclusão foi bloqueada pelo Supabase (403). Execute a correção da política de pontos para anon e authenticated."
        : `Erro ao inserir ponto: ${message}`,
      "error"
    );
    await loadSelectedRouteDetails();
    return false;
  } finally {
    savingPointId = null;
    syncRefreshTimer();
  }
}

async function deleteMapPoint(point) {
  if (!point || savingPointId) {
    return false;
  }

  if (point.tipo_ponto === "primeiro") {
    setMessage("O ponto inicial e protegido e nao pode ser excluido no mapa.", "error");
    return false;
  }

  if (!["trajeto", "manual", "no"].includes(point.tipo_ponto)) {
    setMessage("Este tipo de ponto nao pode ser excluido no mapa.", "error");
    return false;
  }

  const pointType = getPointTypeLabel(point.tipo_ponto);
  const confirmed = window.confirm(
    `Excluir o ponto ${point.ordem_ponto} (${pointType})? A sequencia sera reorganizada.`
  );

  if (!confirmed) {
    return false;
  }

  savingPointId = point.id;
  routedLineCache.clear();
  syncRefreshTimer();
  setMessage("Excluindo ponto...", "");

  try {
    const { data, error } = await supabaseClient
      .from("trajeto_pontos")
      .delete()
      .eq("id", point.id)
      .select("id")
      .single();

    if (error) {
      throw error;
    }

    if (!data?.id) {
      throw new Error("o Supabase nao confirmou a exclusao do ponto");
    }

    await renumberExistingRoutePoints(
      getOrderedValidPoints(currentRoutePoints).filter((item) => item.id !== point.id)
    );
    setMessage(`${pointType} excluido e sequencia reorganizada.`, "success");
    await loadSelectedRouteDetails();
    return true;
  } catch (error) {
    setMessage(getPointEditErrorMessage(error, "excluir"), "error");
    await loadSelectedRouteDetails();
    return false;
  } finally {
    savingPointId = null;
    syncRefreshTimer();
  }
}

function openMapModal() {
  if (openMapButton.disabled) {
    return;
  }

  isEditingMapPoints = false;
  pendingRouteNodeEdit = null;
  isMapModalOpen = true;
  mapModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  const map = ensureRouteMap();
  renderRouteMap(filterPointsByView(currentRoutePoints));
  setTimeout(() => {
    map?.invalidateSize();
    fitRouteMap();
  }, 80);
}

function closeMapModal() {
  if (isEditingMapPoints) {
    setMapEditing(false);
  }

  isMapModalOpen = false;
  mapModal.classList.add("hidden");

  if (!isDetailModalOpen) {
    document.body.classList.remove("modal-open");
  }
}

function createPointPopupContent(point, maxOrder, overlapInfo = null) {
  const container = document.createElement("div");
  container.className = "point-popup-content";

  const lines = [
    `<strong>${point.tipo_ponto === "no" ? "Nó de controle" : `Ponto ${escapeHtml(point.ordem_ponto)}`}</strong>`,
    `Tipo: ${escapeHtml(getPointTypeLabel(point.tipo_ponto))}`,
    `Horario: ${escapeHtml(formatDate(point.data_hora_registro))}`,
    `Latitude: ${escapeHtml(formatNumber(point.latitude))}`,
    `Longitude: ${escapeHtml(formatNumber(point.longitude))}`,
  ];

  if (overlapInfo?.overlapCount > 1) {
    lines.push(
      `<span class="popup-overlap-note">Mesmo local de ${overlapInfo.overlapCount} pontos. Marcador aberto apenas no mapa.</span>`
    );
  }

  container.innerHTML = lines.join("<br>");
  const coordinates = `${formatNumber(point.latitude)}, ${formatNumber(point.longitude)}`;
  const copyButton = document.createElement("button");
  copyButton.className = "popup-copy-button";
  copyButton.type = "button";
  copyButton.textContent = "Copiar LatLng";
  copyButton.title = "Copiar latitude e longitude";
  copyButton.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await copyCoordinatesToClipboard(coordinates);
      copyButton.textContent = "Copiado";
      setMessage(`Coordenadas copiadas: ${coordinates}`, "success");
      setTimeout(() => {
        copyButton.textContent = "Copiar LatLng";
      }, 1600);
    } catch (error) {
      setMessage("Nao foi possivel copiar as coordenadas.", "error");
    }
  });
  container.appendChild(copyButton);

  if (!isEditingMapPoints) {
    return container;
  }

  const hint = document.createElement("strong");
  hint.className = "popup-edit-hint";
  hint.textContent = "Arraste para ajustar, altere a ordem ou clique no mapa para incluir ponto de embarque";
  container.appendChild(hint);

  const orderEditor = document.createElement("label");
  orderEditor.className = "popup-order-editor";
  orderEditor.hidden = point.tipo_ponto === "no";

  const label = document.createElement("span");
  label.textContent = "Ordem";

  const input = document.createElement("input");
  input.type = "number";
  input.min = "1";
  input.max = String(maxOrder);
  input.value = String(point.ordem_ponto);

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "Alterar ordem";
  saveButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    suppressMapClickUntil = Date.now() + 800;
    movePointToOrder(point, Number(input.value));
  });

  orderEditor.append(label, input, saveButton);
  container.appendChild(orderEditor);

  if (point.tipo_ponto === "trajeto") {
    const manualButton = document.createElement("button");
    manualButton.className = "popup-secondary-button";
    manualButton.type = "button";
    manualButton.textContent = "Tornar manual";
    manualButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      suppressMapClickUntil = Date.now() + 800;
      convertTrackPointToManual(point);
    });
    container.appendChild(manualButton);
  }

  if (["trajeto", "manual", "no"].includes(point.tipo_ponto)) {
    const deleteButton = document.createElement("button");
    deleteButton.className = "popup-danger-button";
    deleteButton.type = "button";
    deleteButton.dataset.permission = "excluir";
    deleteButton.textContent = point.tipo_ponto === "no"
      ? "Excluir nó"
      : point.tipo_ponto === "manual" ? "Excluir ponto manual" : "Excluir ponto";
    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      suppressMapClickUntil = Date.now() + 800;
      deleteMapPoint(point);
    });
    container.appendChild(deleteButton);
  }

  return container;
}

function drawRouteMarkers(validPoints) {
  const maxOrder = getOrderedValidPoints(currentRoutePoints).length || validPoints.length;
  const pointsWithoutLegacyNodes = validPoints.filter((point) => point.tipo_ponto !== "no");
  const markerPoints = shouldHideTrackPositions()
    ? pointsWithoutLegacyNodes.filter(isManualPoint)
    : pointsWithoutLegacyNodes;
  const displayPoints = getOverlapDisplayPoints(markerPoints);

  displayPoints.forEach((displayPoint) => {
    const point = displayPoint.point;
    const isVisuallyOffset = displayPoint.isDuplicateManual;
    const marker = L.marker([displayPoint.latitude, displayPoint.longitude], {
      icon: getMarkerIcon(point, displayPoint.isDuplicateManual),
      title: isVisuallyOffset
        ? `Ponto ${point.ordem_ponto} - mesmo local de ${displayPoint.overlapCount} pontos`
        : point.tipo_ponto === "no" ? "Nó de controle" : `Ponto ${point.ordem_ponto}`,
      draggable:
        isEditingMapPoints && !isVisuallyOffset && canMovePointOnMap(point),
    })
      .bindPopup(createPointPopupContent(point, maxOrder, displayPoint))
      .addTo(routeMapLayer);

    routeMarkerByPointId.set(String(point.id), marker);

    if (
      !isVisuallyOffset && canMovePointOnMap(point) &&
      (isEditingMapPoints || point.tipo_ponto === "no")
    ) {
      marker.on("dragstart", () => {
        suppressMapClickUntil = Date.now() + 800;
      });
      marker.on("dragend", () => updatePointPosition(point, marker.getLatLng()));
    }
  });

}

function renderRouteMap(points) {
  const map = ensureRouteMap();

  if (!map || !routeMapLayer) {
    mapStatus.textContent = "Mapa indisponivel";
    return;
  }

  map.invalidateSize();

  routeLineRequestId += 1;
  const requestId = routeLineRequestId;
  routeMapLayer.clearLayers();
  if (nodeConnectionLayer) {
    routeMap.removeLayer(nodeConnectionLayer);
    nodeConnectionLayer = null;
  }
  routeMarkerByPointId.clear();

  const validPoints = points.filter(
    (point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
  );
  const pointSignature = getPointSignature(validPoints);
  const routeChanged = renderedMapRouteId !== selectedRouteId;
  const pointsChanged = renderedPointSignature !== pointSignature;

  if (routeChanged && mapSearchResultMarker) {
    routeMap.removeLayer(mapSearchResultMarker);
    mapSearchResultMarker = null;
    mapPointSearch.value = "";
  }

  if (validPoints.length === 0) {
    mapStatus.textContent = "Sem pontos para exibir";
    fitMapButton.disabled = true;
    currentMapLatLngs = [];
    if (routeLineLayer) {
      routeMap.removeLayer(routeLineLayer);
      routeLineLayer = null;
      routeLineSignature = "";
    }

    if (routeChanged || !mapUserAdjustedView) {
      mapAutoFitting = true;
      map.setView([-22.9, -47.05], 11);
      setTimeout(() => {
        mapAutoFitting = false;
      }, 300);
    }

    renderedMapRouteId = selectedRouteId;
    renderedPointSignature = pointSignature;
    setTimeout(() => map.invalidateSize(), 100);
    return;
  }

  const latLngs = validPoints.map((point) => [point.latitude, point.longitude]);
  const routingPoints = getRoutingControlPoints(validPoints);
  const routingSignature = getPointSignature(routingPoints);
  const selectedRoute = getSelectedRoute();
  const officialGeometry = ["trajeto", "importado"].includes(selectedRoute?.status)
    ? getOfficialRouteGeometry(selectedRoute)
    : [];
  const hasOfficialGeometry = officialGeometry.length > 1;
  const officialGeometrySignature = hasOfficialGeometry
    ? officialGeometry.map(([lat, lng]) => `${lat},${lng}`).join("|")
    : "";
  const cachedLatLngs = officialGeometry.length > 1
    ? officialGeometry
    : routedLineCache.get(routingSignature);
  const routingLatLngs = routingPoints.map((point) => [point.latitude, point.longitude]);
  currentMapLatLngs = hasOfficialGeometry ? officialGeometry : latLngs;
  fitMapButton.disabled = false;

  if (latLngs.length > 1 && ["ambos", "trajeto"].includes(getMapViewMode())) {
    drawRouteLine(cachedLatLngs || routingLatLngs, cachedLatLngs
      ? {
          color: "#116149",
          weight: 5,
          opacity: 0.9,
          signature: hasOfficialGeometry
            ? `official::${officialGeometrySignature}`
            : `${isEditingMapPoints ? "edit" : "view"}::routed::${routingSignature}`,
        }
      : {
          color: shouldHideTrackPositions() ? "#116149" : "#1264c8",
          weight: 4,
          opacity: 0.65,
          signature: `${isEditingMapPoints ? "edit" : "view"}::fallback::${routingSignature}`,
        });
    if (!cachedLatLngs && !hasOfficialGeometry) {
      drawRoutedLine(routingPoints, routingLatLngs, requestId);
    }
  } else if (routeLineLayer) {
    routeMap.removeLayer(routeLineLayer);
    routeLineLayer = null;
    routeLineSignature = "";
  }

  drawRouteMarkers(validPoints);
  if (cachedLatLngs?.length > 1) {
    drawNodeConnections(validPoints, cachedLatLngs);
  }

  if (routeChanged) {
    mapUserAdjustedView = false;
  }

  if (isMapModalOpen && (routeChanged || (!mapUserAdjustedView && pointsChanged))) {
    fitRouteMap();
    setTimeout(fitRouteMap, 150);
  }

  renderedMapRouteId = selectedRouteId;
  renderedPointSignature = pointSignature;
  if (latLngs.length > 1 && ["ambos", "trajeto"].includes(getMapViewMode())) {
    mapStatus.textContent = hasOfficialGeometry
      ? `${validPoints.length} ${getMapViewLabel()} no mapa - camada oficial`
      : routedLineCache.has(routingSignature)
      ? `${validPoints.length} ${getMapViewLabel()} no mapa - rota por ruas`
      : isEditingMapPoints
        ? `${validPoints.length} ${getMapViewLabel()} no mapa - edicao ativa`
      : `${validPoints.length} ${getMapViewLabel()} no mapa - calculando rota`;
  } else {
    mapStatus.textContent = `${validPoints.length} ${getMapViewLabel()} no mapa`;
  }
}

function showMapSearchLocation(latitude, longitude, label) {
  if (mapSearchResultMarker) {
    routeMap.removeLayer(mapSearchResultMarker);
  }

  mapSearchResultMarker = L.marker([latitude, longitude], {
    title: label,
  })
    .bindPopup(
      `<strong>${escapeHtml(label)}</strong><br>` +
      `Latitude: ${escapeHtml(formatNumber(latitude))}<br>` +
      `Longitude: ${escapeHtml(formatNumber(longitude))}`
    )
    .addTo(routeMap);

  mapUserAdjustedView = true;
  routeMap.setView([latitude, longitude], Math.max(routeMap.getZoom(), 17), { animate: true });
  mapSearchResultMarker.openPopup();
}

async function searchMapPoint(event) {
  event?.preventDefault();
  const query = mapPointSearch.value.trim();

  if (!query) {
    setMessage("Digite um endereco, coordenadas ou numero de ponto.", "error");
    mapPointSearch.focus();
    return;
  }

  const coordinateMatch = query.match(
    /^\s*(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)\s*$/
  );
  if (coordinateMatch) {
    const latitude = Number(coordinateMatch[1].replace(",", "."));
    const longitude = Number(coordinateMatch[2].replace(",", "."));
    if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
      showMapSearchLocation(latitude, longitude, "Coordenadas pesquisadas");
      setMessage("Coordenadas localizadas no mapa.", "success");
      return;
    }
  }

  const pointMatch = query.match(/^(?:ponto\s*)?#?(\d+)$/i);
  if (pointMatch) {
    const searchedOrder = Number(pointMatch[1]);
    const point = currentRoutePoints.find(
      (item) => Number(item.ordem_ponto) === searchedOrder
    );
    if (!point) {
      setMessage(`Ponto ${searchedOrder} nao encontrado neste trajeto.`, "error");
      return;
    }

    const marker = routeMarkerByPointId.get(String(point.id));
    if (!marker) {
      setMessage(
        `O ponto ${searchedOrder} esta oculto pelo filtro atual. Selecione Ambos para visualiza-lo.`,
        "error"
      );
      return;
    }

    mapUserAdjustedView = true;
    routeMap.setView(marker.getLatLng(), Math.max(routeMap.getZoom(), 17), { animate: true });
    marker.openPopup();
    setMessage(`Ponto ${searchedOrder} localizado no mapa.`, "success");
    return;
  }

  mapSearchButton.disabled = true;
  setMessage("Pesquisando endereco...", "");

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "br");
    url.searchParams.set("q", query);
    const response = await fetch(url, { headers: { "Accept-Language": "pt-BR" } });
    if (!response.ok) throw new Error("servico de enderecos indisponivel");
    const results = await response.json();
    if (!results.length) {
      setMessage("Endereco nao encontrado. Tente incluir cidade e estado.", "error");
      return;
    }

    const result = results[0];
    showMapSearchLocation(Number(result.lat), Number(result.lon), result.display_name);
    setMessage("Endereco localizado no mapa.", "success");
  } catch (error) {
    setMessage(`Erro ao pesquisar endereco: ${error.message}`, "error");
  } finally {
    mapSearchButton.disabled = false;
  }
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
    const routeStatus = getRouteStatus(route);
    button.innerHTML = `
      <span class="route-item-main">
        <strong>${route.cliente}</strong>
        <span class="status-pill ${getStatusClass(routeStatus)}">
          ${getStatusLabel(routeStatus)}
        </span>
      </span>
      <span class="route-meta">
        Condutor: ${escapeHtml(formatConductorSummary(route))}<br />
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

function getConfiguredLines() {
  if (routeOptions.length === 0) {
    return uniqueSorted(
      routes.map((route) =>
        JSON.stringify({
          cliente: route.cliente,
          nome_linha: route.nome_linha || "-",
          sentido: route.sentido || "-",
        })
      )
    ).map((value) => JSON.parse(value));
  }

  return routeOptions.map((option) => ({
    cliente: option.cliente,
    nome_linha: option.nome_linha,
    sentido: option.sentido,
  }));
}

function getConfiguredLineKey(option) {
  return [option.cliente || "", option.nome_linha || "", option.sentido || ""].join("||");
}

function getRouteHistoryForConfiguredLine(option) {
  return routes.filter(
    (route) =>
      route.cliente === option.cliente &&
      (route.nome_linha || "") === (option.nome_linha || "") &&
      (route.sentido || "") === (option.sentido || "")
  );
}

function getRouteForConfiguredLine(option) {
  const history = getRouteHistoryForConfiguredLine(option);

  if (history.length === 0) {
    return null;
  }

  const lineKey = getConfiguredLineKey(option);
  const selectedHistoryId = selectedRouteByLineKey.get(lineKey);
  const selectedHistoryRoute = history.find((route) => route.id === selectedHistoryId);

  if (selectedHistoryRoute) {
    return selectedHistoryRoute;
  }

  selectedRouteByLineKey.set(lineKey, history[0].id);
  return history[0];
}

function formatRouteHistoryOption(route) {
  const count = pointCountByRouteId.get(route.id) || 0;
  const conductor = getRouteConductorInfo(route);
  const conductorName = conductor?.apelido || route.matricula_condutor || "-";

  return `${formatDate(route.data_hora_inicio)} | ${conductorName} | ${count} registros | ${getStatusLabel(getRouteStatus(route))}`;
}

function cleanupSelectedRouteHistory() {
  const existingRouteIds = new Set(routes.map((route) => route.id));
  let changed = false;

  selectedRouteByLineKey.forEach((routeId, lineKey) => {
    if (!existingRouteIds.has(routeId)) {
      selectedRouteByLineKey.delete(lineKey);
      changed = true;
    }
  });

  if (changed) {
    saveRouteHistorySelection();
  }
}

function getConfiguredLinePointCount(option) {
  const route = getRouteForConfiguredLine(option);
  return route ? pointCountByRouteId.get(route.id) || 0 : 0;
}

function getFilteredChecklistLines() {
  const driverText = driverFilter.value.trim().toLowerCase();
  const clientValue = clientFilter.value;
  const directionValue = directionFilter.value;
  const lineValue = lineFilter.value;
  const statusValue = statusFilter.value;
  const operatorValue = operatorFilter.value;

  return getConfiguredLines().filter((option) => {
    const history = getRouteHistoryForConfiguredLine(option);
    const isNotTraveled = history.length === 0;
    const selectedRoute = getRouteForConfiguredLine(option);
    const alignment = getAlignmentForOption(option);
    const hasPendingAlignment = isPendingExecutionAlignment(alignment, selectedRoute);
    const matchesOperator =
      !operatorValue || alignment?.operador_id === operatorValue;
    const lineKey = getConfiguredLineKey(option);
    const matchingHistory = history.filter((historyRoute) => {
      const matchesDriverFilter =
        !driverText || getDriverSearchText(historyRoute).includes(driverText);
      const matchesStatusFilter = !statusValue || getRouteStatus(historyRoute) === statusValue;

      return matchesDriverFilter && matchesStatusFilter;
    });
    const matchesDriver =
      !driverText ||
      history.some((historyRoute) => getDriverSearchText(historyRoute).includes(driverText)) ||
      (hasPendingAlignment &&
        `${alignment.apelido_condutor} ${alignment.operador_nome}`.toLowerCase().includes(driverText));
    const matchesClient = !clientValue || option.cliente === clientValue;
    const matchesDirection = !directionValue || option.sentido === directionValue;
    const matchesLine = !lineValue || option.nome_linha === lineValue;
    const matchesStatus =
      !statusValue ||
      (statusValue === "alinhado"
        ? hasPendingAlignment
        : statusValue === "nao_percorrido"
        ? isNotTraveled && !hasPendingAlignment
        : history.some((historyRoute) => getRouteStatus(historyRoute) === statusValue));

    if (
      matchingHistory.length > 0 &&
      (!selectedRoute || !matchingHistory.some((historyRoute) => historyRoute.id === selectedRoute.id))
    ) {
      selectedRouteByLineKey.set(lineKey, matchingHistory[0].id);
    }

    return matchesDriver && matchesClient && matchesDirection && matchesLine &&
      matchesStatus && matchesOperator;
  }).sort(compareRoutesByLine);
}

function canValidateRoute(route) {
  return route && ["finalizado", "trajeto"].includes(route.status);
}

function canReturnRouteStatus(route) {
  return route && ["finalizado", "trajeto", "importado"].includes(route.status);
}

function getStatusActionLabel(route) {
  const labels = {
    finalizado: "Validar trajeto",
    trajeto: "Concluir importação",
    importado: "Etapa concluída",
  };

  return labels[route?.status] || "Alterar etapa";
}

function getAlignmentForOption(option) {
  const key = getConfiguredLineKey(option);
  return executionAlignments.find(
    (alignment) =>
      `${alignment.cliente}||${alignment.nome_linha}||${alignment.sentido}` === key
  ) || null;
}

function isPendingExecutionAlignment(alignment, route) {
  if (!alignment) return false;
  if (!route) return true;
  return new Date(alignment.updated_at).getTime() > new Date(route.created_at).getTime();
}

function getDemandHistoryForOption(option) {
  return demandHistory.filter(
    (event) =>
      event.cliente === option.cliente &&
      event.sentido === (option.sentido || "") &&
      event.nome_linha === (option.nome_linha || "")
  );
}

function openDemandHistoryModal() {
  const route = getSelectedRoute();
  if (!route) return;
  const events = getDemandHistoryForOption(route);
  demandHistoryDescription.textContent =
    `${route.cliente} — ${route.nome_linha || "-"} — ${route.sentido || "-"}`;
  demandHistoryPopupList.innerHTML = events.length
    ? events.map((event) => `
        <article class="demand-history-popup-item">
          <div class="demand-history-popup-marker"></div>
          <div>
            <strong>${escapeHtml(getStatusLabel(event.status))}</strong>
            <span>${escapeHtml(formatDate(event.created_at))}</span>
            <p>Operador: ${escapeHtml(event.operador_nome || "-")}</p>
            ${event.apelido_condutor ? `<p>Condutor: ${escapeHtml(event.apelido_condutor)}</p>` : ""}
            ${event.detalhes ? `<small>${escapeHtml(event.detalhes)}</small>` : ""}
          </div>
        </article>
      `).join("")
    : '<p class="empty-cell">Nenhum evento registrado para esta demanda.</p>';
  demandHistoryModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
}

function closeDemandHistoryModal() {
  demandHistoryModal.classList.add("hidden");
  if (!isMapModalOpen && !isDetailModalOpen && !isLayerEditorOpen) {
    document.body.classList.remove("modal-open");
  }
}

function populateOperatorFilter() {
  const previousValue = operatorFilter.value;
  operatorFilter.innerHTML = '<option value="">Todos os operadores</option>';
  alignmentOperators.forEach((operator) => {
    const option = document.createElement("option");
    option.value = operator.id;
    option.textContent = operator.nome;
    operatorFilter.appendChild(option);
  });
  operatorFilter.value = alignmentOperators.some(
    (operator) => operator.id === previousValue
  ) ? previousValue : "";
}

function openAlignmentModal(option) {
  pendingAlignmentOption = option;
  const existing = getAlignmentForOption(option);
  alignmentLineDescription.textContent =
    `${option.cliente} — ${option.nome_linha || "-"} — ${option.sentido || "-"}`;
  alignmentDriverAlias.value = existing?.apelido_condutor || "";
  if (alignmentLoggedOperator) alignmentLoggedOperator.textContent = loggedPlanningOperator?.nome || window.appAccess?.profile?.nome || "Usuário logado";
  alignmentModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  setTimeout(() => alignmentDriverAlias.focus(), 0);
}

function closeAlignmentModal() {
  pendingAlignmentOption = null;
  alignmentModal.classList.add("hidden");
  if (!isMapModalOpen && !isDetailModalOpen && !isLayerEditorOpen) {
    document.body.classList.remove("modal-open");
  }
}

async function ensureLoggedPlanningOperator() {
  if (loggedPlanningOperator) return loggedPlanningOperator;
  const profile = window.appAccess?.profile;
  const nome = String(profile?.nome || profile?.usuario || "Usuário autenticado").trim();
  const { data, error } = await supabaseClient.from("operadores_planejamento")
    .upsert({ nome, ativo: true }, { onConflict: "nome" })
    .select("id, nome")
    .single();
  if (error) throw error;
  loggedPlanningOperator = data;
  if (!alignmentOperators.some((item) => item.id === data.id)) alignmentOperators.push(data);
  if (alignmentLoggedOperator) alignmentLoggedOperator.textContent = data.nome;
  if (deleteLoggedOperator) deleteLoggedOperator.textContent = data.nome;
  return data;
}

async function loadExecutionPlanning() {
  const [operatorsResult, alignmentsResult, historyResult] = await Promise.all([
    supabaseClient.from("operadores_planejamento").select("id, nome").eq("ativo", true).order("nome"),
    supabaseClient.from("alinhamentos_execucao").select(
      "id, cliente, sentido, nome_linha, apelido_condutor, operador_id, operador_nome, status, updated_at"
    ),
    supabaseClient.from("demanda_historico").select(
      "id, trajeto_id, cliente, sentido, nome_linha, status, operador_nome, apelido_condutor, detalhes, created_at"
    ).order("created_at", { ascending: false }),
  ]);
  if (operatorsResult.error) throw operatorsResult.error;
  if (alignmentsResult.error) throw alignmentsResult.error;
  if (historyResult.error) throw historyResult.error;
  alignmentOperators = operatorsResult.data || [];
  executionAlignments = alignmentsResult.data || [];
  demandHistory = historyResult.data || [];
  populateOperatorFilter();
}

async function recordDemandHistory({
  option,
  routeId = null,
  status,
  operator,
  driverAlias = null,
  details = null,
  createdAt = null,
}) {
  if (!option || !operator) return;
  const { error } = await supabaseClient.from("demanda_historico").insert({
    trajeto_id: routeId,
    cliente: option.cliente,
    sentido: option.sentido || "",
    nome_linha: option.nome_linha || "",
    status,
    operador_id: operator.id,
    operador_nome: operator.nome,
    apelido_condutor: driverAlias,
    detalhes: details,
    ...(createdAt ? { created_at: createdAt } : {}),
  });
  if (error) throw error;
}

async function ensureAutomaticDemandHistory() {
  for (const route of routes) {
    const alignment = executionAlignments.find(
      (item) =>
        item.cliente === route.cliente &&
        item.sentido === (route.sentido || "") &&
        item.nome_linha === (route.nome_linha || "")
    );
    const operator = alignmentOperators.find(
      (item) => item.id === alignment?.operador_id
    );
    if (!alignment || !operator) continue;

    const requiredEvents = [
      {
        status: "em_andamento",
        createdAt: route.data_hora_inicio || route.created_at,
        details: "Execução iniciada sob responsabilidade do operador do alinhamento.",
      },
    ];
    if (route.data_hora_fim) {
      requiredEvents.push({
        status: "finalizado",
        createdAt: route.data_hora_fim,
        details: "Trajeto finalizado e aguardando validação.",
      });
    }

    for (const event of requiredEvents) {
      const exists = demandHistory.some(
        (item) => item.trajeto_id === route.id && item.status === event.status
      );
      if (exists) continue;
      await recordDemandHistory({
        option: route,
        routeId: route.id,
        status: event.status,
        operator,
        driverAlias: alignment.apelido_condutor,
        details: event.details,
        createdAt: event.createdAt,
      });
      demandHistory.push({
        trajeto_id: route.id,
        cliente: route.cliente,
        sentido: route.sentido || "",
        nome_linha: route.nome_linha || "",
        status: event.status,
        operador_nome: operator.nome,
        created_at: event.createdAt,
      });
    }
  }
}

function requestOperatorForAction(actionLabel) {
  return loggedPlanningOperator;
}

async function saveExecutionAlignment(event) {
  event.preventDefault();
  if (!pendingAlignmentOption) return;
  const apelido = alignmentDriverAlias.value.trim();
  const operator = await ensureLoggedPlanningOperator();
  if (!apelido || !operator) {
    setMessage("Informe o apelido do condutor.", "error");
    return;
  }
  const option = pendingAlignmentOption;
  const { error } = await supabaseClient.from("alinhamentos_execucao").upsert({
    cliente: option.cliente,
    sentido: option.sentido || "",
    nome_linha: option.nome_linha || "",
    apelido_condutor: apelido,
    operador_id: operator.id,
    operador_nome: operator.nome,
    status: "alinhado",
    updated_at: new Date().toISOString(),
  }, { onConflict: "cliente,sentido,nome_linha" });
  if (error) {
    setMessage(`Erro ao registrar alinhamento: ${error.message}`, "error");
    return;
  }
  await recordDemandHistory({
    option,
    status: "alinhado",
    operator,
    driverAlias: apelido,
    details: "Contato e planejamento confirmados com o condutor.",
  });
  await loadExecutionPlanning();
  closeAlignmentModal();
  renderTrackingChecklist();
  setMessage("Linha marcada como Alinhado com o condutor.", "success");
}

function renderTrackingChecklist() {
  const totalConfigured = getConfiguredLines().length;
  const configuredLines = getFilteredChecklistLines();
  checklistStatus.textContent = `${configuredLines.length}/${totalConfigured} linhas`;
  trackingChecklist.innerHTML = "";

  if (configuredLines.length === 0) {
    trackingChecklist.innerHTML =
      '<p class="empty-cell">Nenhuma linha encontrada para os filtros selecionados.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  configuredLines.forEach((option) => {
    const routeHistory = getRouteHistoryForConfiguredLine(option);
    const route = getRouteForConfiguredLine(option);
    const count = route ? pointCountByRouteId.get(route.id) || 0 : 0;
    const card = document.createElement("article");
    const alignment = getAlignmentForOption(option);
    const lineDemandHistory = getDemandHistoryForOption(option);
    const hasPendingAlignment = isPendingExecutionAlignment(alignment, route);
    const routeStatus = getRouteStatus(route);
    const statusText = hasPendingAlignment
      ? getStatusLabel("alinhado")
      : route
      ? getStatusLabel(routeStatus)
      : "nao percorrido";
    const statusClass = hasPendingAlignment
      ? getStatusClass("alinhado")
      : route
      ? getStatusClass(routeStatus)
      : "missing";
    const conductorText = route ? formatConductorSummary(route) : "";

    card.className = "checklist-item";
    card.innerHTML = `
      <div class="checklist-main">
        <span class="status-pill ${statusClass}">${statusText}</span>
        <strong>${option.cliente}</strong>
        <span>${option.nome_linha || "-"}</span>
        <small>${option.sentido || "-"} | ${count} registros</small>
        ${conductorText ? `<small>Condutor: ${escapeHtml(conductorText)}</small>` : ""}
        ${hasPendingAlignment ? `<small>Alinhado com: ${escapeHtml(alignment.apelido_condutor)} | Operador: ${escapeHtml(alignment.operador_nome)}</small>` : ""}
        ${lineDemandHistory.length ? `
          <details class="demand-history">
            <summary>Histórico da demanda (${lineDemandHistory.length})</summary>
            ${lineDemandHistory.slice(0, 12).map((event) => `
              <small>${escapeHtml(formatDate(event.created_at))} — ${escapeHtml(getStatusLabel(event.status))} — ${escapeHtml(event.operador_nome)}</small>
            `).join("")}
          </details>` : ""}
        ${
          routeHistory.length > 1
            ? `<label class="history-select">
                <span>Historico (${routeHistory.length})</span>
                <select data-action="history">
                  ${routeHistory
                    .map(
                      (historyRoute) =>
                        `<option value="${escapeHtml(historyRoute.id)}" ${
                          historyRoute.id === route?.id ? "selected" : ""
                        }>${escapeHtml(formatRouteHistoryOption(historyRoute))}</option>`
                    )
                    .join("")}
                </select>
              </label>`
            : ""
        }
      </div>
      <div class="checklist-actions">
        <button class="button secondary" type="button" data-action="align" data-permission="editar">
          ${alignment ? "Editar alinhamento" : "Alinhar condutor"}
        </button>
        <button class="button secondary" type="button" data-action="view" ${route ? "" : "disabled"}>
          Visualizar
        </button>
        <button class="button danger" type="button" data-action="delete" data-permission="excluir" ${route ? "" : "disabled"}>
          Excluir
        </button>
      </div>
    `;

    card.querySelector('[data-action="history"]')?.addEventListener("change", (event) => {
      selectedRouteByLineKey.set(getConfiguredLineKey(option), event.target.value);
      saveRouteHistorySelection();
      renderTrackingChecklist();
    });
    card.querySelector('[data-action="view"]')?.addEventListener("click", async () => {
      await selectRoute(route.id);
      openDetailModal();
    });
    card.querySelector('[data-action="delete"]')?.addEventListener("click", () =>
      deleteRoute(route)
    );
    AppAccess.applyPermissions(card);
    card.querySelector('[data-action="align"]')?.addEventListener("click", () =>
      openAlignmentModal(option)
    );

    fragment.appendChild(card);
  });

  trackingChecklist.appendChild(fragment);
}

function renderRouteDetails(route, points) {
  currentRoutePoints = points;
  updateDeleteRangeOptions(route ? points : []);
  const currentPointIds = new Set(points.map((point) => String(point.id)));
  selectedPointIds.forEach((id) => {
    if (!currentPointIds.has(id)) selectedPointIds.delete(id);
  });
  const visiblePoints = route ? filterPointsByView(points) : [];
  const manualPointCount = route ? points.filter(isManualPoint).length : 0;
  const trackPointCount = route
    ? points.filter((point) => ["trajeto", "no"].includes(point.tipo_ponto)).length
    : 0;

  selectedRouteTitle.textContent = route ? route.cliente : "Selecione um trajeto";
  mapModalTitle.textContent = route ? `Mapa - ${route.cliente}` : "Mapa do trajeto";
  const routeStatus = getRouteStatus(route);
  selectedRouteStatus.textContent = route ? getStatusLabel(routeStatus) : "-";
  selectedRouteStatus.className = `status-pill ${getStatusClass(routeStatus)}`.trim();
  const conductor = getRouteConductorInfo(route);
  selectedMatricula.textContent = route?.matricula_condutor || "-";
  selectedDriverAlias.textContent = conductor?.apelido || "-";
  selectedDriverGarage.textContent = conductor?.garagem || "-";
  selectedCliente.textContent = route?.cliente || "-";
  selectedSentido.textContent = route?.sentido || "-";
  selectedLinha.textContent = route?.nome_linha || "-";
  selectedStart.textContent = formatDate(route?.data_hora_inicio);
  selectedEnd.textContent = formatDate(route?.data_hora_fim);
  syncTrackPositionVisibilityButton(route);
  selectedPointCount.textContent = route ? `${visiblePoints.length}/${points.length}` : "0";
  totalVisibleRecords.textContent = String(visiblePoints.length);
  totalManualPoints.textContent = String(manualPointCount);
  totalTrackPoints.textContent = String(trackPointCount);
  routeStorageUsage.textContent = `${formatBytes(estimateRouteStorage(route, points))} armazenado`;
  routeStorageUsage.title = route
    ? "Estimativa do espaco ocupado pelo trajeto selecionado e seus pontos carregados"
    : "Selecione um trajeto para ver o espaco estimado";
  validateSelectedButton.disabled = !canValidateRoute(route);
  validateSelectedButton.textContent = getStatusActionLabel(route);
  previousStatusButton.disabled = !canReturnRouteStatus(route);
  openLayerEditorButton.classList.toggle("hidden", !route || !["trajeto", "importado"].includes(route.status));
  openDemandHistoryButton.disabled = !route;
  finishSelectedButton.disabled = !route || route.status !== "em_andamento";
  deleteSelectedButton.disabled = !route;
  openMapButton.disabled = !route || visiblePoints.length === 0;
  editMapButton.disabled = !route || visiblePoints.length === 0;
  officializeRouteButton.disabled = !pendingRouteNodeEdit || Boolean(savingPointId);
  undoPointOrderButton.disabled =
    !lastPointOrderSnapshot ||
    lastPointOrderSnapshot.routeId !== selectedRouteId ||
    Boolean(savingPointId);
  exportJsonButton.disabled = !route || points.length === 0;
  exportKmlButton.disabled = !route || points.length === 0;
  exportExcelButton.disabled = !route || points.length === 0;
  renderRouteMap(visiblePoints);
  updatePointSelectionControls(visiblePoints);

  if (!route) {
    pointsTable.innerHTML =
      '<tr><td colspan="8" class="empty-cell">Nenhum trajeto selecionado.</td></tr>';
    editMapButton.disabled = true;
    return;
  }

  if (visiblePoints.length === 0) {
    pointsTable.innerHTML =
      '<tr><td colspan="8" class="empty-cell">Nenhum registro para esta visualizacao.</td></tr>';
    editMapButton.disabled = true;
    return;
  }

  const latestPointId = visiblePoints[visiblePoints.length - 1].id;

  pointsTable.innerHTML = visiblePoints
    .map((point) => {
      const mapsUrl = `https://www.google.com/maps?q=${point.latitude},${point.longitude}`;

      return `
        <tr class="${point.id === latestPointId ? "latest" : ""}">
          <td class="selection-column"><input class="point-selection" type="checkbox" data-point-id="${escapeHtml(point.id)}" aria-label="Selecionar ponto ${escapeHtml(point.ordem_ponto)}" ${selectedPointIds.has(String(point.id)) ? "checked" : ""} /></td>
          <td>${point.tipo_ponto === "no" ? "-" : point.ordem_ponto}</td>
          <td>${getPointTypeLabel(point.tipo_ponto)}</td>
          <td>${formatDate(point.data_hora_registro)}</td>
          <td>${formatNumber(point.latitude)}</td>
          <td>${formatNumber(point.longitude)}</td>
          <td><a class="map-link" href="${mapsUrl}" target="_blank" rel="noopener">Abrir</a></td>
          <td>${point.tipo_ponto === "trajeto" ? `<button class="point-manual-button" type="button" data-manual-point-id="${escapeHtml(point.id)}">Tornar manual</button>` : `<span class="point-action-done">${escapeHtml(getPointTypeLabel(point.tipo_ponto))}</span>`}</td>
        </tr>
      `;
    })
    .join("");

  pointsTable.querySelectorAll(".point-selection").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const pointId = String(checkbox.dataset.pointId);
      if (checkbox.checked) selectedPointIds.add(pointId);
      else selectedPointIds.delete(pointId);
      updatePointSelectionControls(visiblePoints);
    });
  });

  pointsTable.querySelectorAll(".point-manual-button").forEach((button) => {
    button.addEventListener("click", () => {
      const point = currentRoutePoints.find(
        (item) => String(item.id) === String(button.dataset.manualPointId)
      );
      convertTrackPointToManual(point);
    });
  });
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
  await loadDatabaseConfiguredLines();
  await loadExecutionPlanning();

  const { data, error } = await supabaseClient
    .from("trajetos")
    .select("id, matricula_condutor, cliente, sentido, nome_linha, status, data_hora_inicio, data_hora_fim, created_at, deleted_at, geometria_validada, nos_validacao")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw error;
  }

  routes = data || [];
  await ensureAutomaticDemandHistory();
  cleanupSelectedRouteHistory();
  populateListBoxFilters();
  await loadPointCounts(routes.map((route) => route.id));

  if (!selectedRouteId && routes.length > 0) {
    const activeRoute = routes.find((route) => getRouteStatus(route) === "em_andamento");
    selectedRouteId = activeRoute?.id || routes[0].id;
  }

  if (selectedRouteId && !routes.some((route) => route.id === selectedRouteId)) {
    selectedRouteId = routes[0]?.id || null;
  }

  totalRoutes.textContent = String(routes.length);
  activeRoutes.textContent = String(
    routes.filter((route) => getRouteStatus(route) === "em_andamento").length
  );
  totalDrivers.textContent = String(
    new Set(routes.map((route) => route.matricula_condutor)).size
  );
  routeListStatus.textContent = `${getFilteredRoutes().length} exibidos`;
  renderRouteList();
  renderTrackingChecklist();
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
  if (selectedRouteId !== routeId) {
    showValidatedTrackPositions = false;
    pendingRouteNodeEdit = null;
  }
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
  const actionOperator = requestOperatorForAction("Finalizar trajeto");
  if (!actionOperator) return;

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

    await recordDemandHistory({
      option: route,
      routeId: route.id,
      status: "finalizado",
      operator: actionOperator,
      details: `Etapa avançada: ${getStatusLabel("em_andamento")} → ${getStatusLabel("finalizado")}.`,
    });

    setMessage("Trajeto finalizado pelo painel.", "success");
    await refreshDashboard();
  } catch (error) {
    setMessage(`Erro ao finalizar trajeto: ${error.message}`, "error");
  } finally {
    finishSelectedButton.disabled = getSelectedRoute()?.status !== "em_andamento";
  }
}

async function changeRouteStatus(route) {
  if (!route) {
    setMessage("Selecione um trajeto para validar.", "error");
    return;
  }

  if (!canValidateRoute(route)) {
    setMessage("Este trajeto não permite alteração de status.", "error");
    return;
  }
  const actionOperator = requestOperatorForAction(
    route.status === "trajeto"
      ? "Concluir importação"
      : "Validar trajeto"
  );
  if (!actionOperator) return;

  try {
    validateSelectedButton.disabled = true;
    const previousStatus = route.status;
    const nextStatusByCurrentStatus = {
      finalizado: "trajeto",
      trajeto: "importado",
    };
    const nextStatus = nextStatusByCurrentStatus[previousStatus];

    const { error } = await supabaseClient
      .from("trajetos")
      .update({ status: nextStatus })
      .eq("id", route.id)
      .eq("status", previousStatus);

    if (error) {
      throw error;
    }
    await recordDemandHistory({
      option: route,
      routeId: route.id,
      status: nextStatus,
      operator: actionOperator,
      details: `Etapa avançada: ${getStatusLabel(previousStatus)} → ${getStatusLabel(nextStatus)}.`,
    });

    setMessage(
      nextStatus === "importado"
        ? "Importação concluída. O arquivo foi encaminhado para a etapa final do processo."
        : "Status alterado para Pendente de importação com sucesso.",
      "success"
    );
    await refreshDashboard();
  } catch (error) {
    setMessage(`Erro ao alterar status: ${error.message}`, "error");
  } finally {
    validateSelectedButton.disabled = !canValidateRoute(getSelectedRoute());
  }
}

async function validateSelectedRoute() {
  await changeRouteStatus(getSelectedRoute());
}

async function returnRouteToPreviousStatus() {
  const route = getSelectedRoute();
  if (!canReturnRouteStatus(route)) {
    setMessage("Este trajeto não possui uma etapa anterior disponível.", "error");
    return;
  }

  const previousStatusByCurrentStatus = {
    finalizado: "em_andamento",
    trajeto: "finalizado",
    importado: "trajeto",
  };
  const currentStatus = route.status;
  const previousStatus = previousStatusByCurrentStatus[currentStatus];
  const actionOperator = requestOperatorForAction("Voltar para a etapa anterior");
  if (!actionOperator) return;

  try {
    previousStatusButton.disabled = true;
    const changes = { status: previousStatus };
    if (previousStatus === "em_andamento") changes.data_hora_fim = null;

    const { error } = await supabaseClient
      .from("trajetos")
      .update(changes)
      .eq("id", route.id)
      .eq("status", currentStatus);
    if (error) throw error;

    await recordDemandHistory({
      option: route,
      routeId: route.id,
      status: previousStatus,
      operator: actionOperator,
      details: `Etapa retornada: ${getStatusLabel(currentStatus)} → ${getStatusLabel(previousStatus)}.`,
    });
    setMessage(`Status retornado para: ${getStatusLabel(previousStatus)}.`, "success");
    await refreshDashboard();
  } catch (error) {
    setMessage(`Erro ao voltar etapa: ${error.message}`, "error");
  } finally {
    previousStatusButton.disabled = !canReturnRouteStatus(getSelectedRoute());
  }
}

async function deleteRoute(route) {
  if (!route) {
    setMessage("Selecione um trajeto para excluir.", "error");
    return;
  }

  routePendingDeletion = route;
  confirmDeleteDescription.textContent = `Você pretende excluir a linha ${route.nome_linha || "-"} do cliente ${route.cliente || "-"}, referente ao dia ${formatShortDate(route.data_hora_inicio)}?`;
  if (deleteLoggedOperator) deleteLoggedOperator.textContent = loggedPlanningOperator?.nome || "Usuário logado";
  confirmDeleteInput.value = "";
  confirmDeleteButton.disabled = true;
  confirmDeleteModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  setTimeout(() => confirmDeleteInput.focus(), 0);
}

function closeDeleteConfirmation() {
  routePendingDeletion = null;
  confirmDeleteModal.classList.add("hidden");
  if (trashModal.classList.contains("hidden") && !isMapModalOpen && !isDetailModalOpen) {
    document.body.classList.remove("modal-open");
  }
}

async function confirmRouteDeletion() {
  const route = routePendingDeletion;
  const deletionOperator = await ensureLoggedPlanningOperator();
  if (!route || !deletionOperator ||
      confirmDeleteInput.value.trim().toUpperCase() !== "EXCLUIR") return;

  try {
    confirmDeleteButton.disabled = true;

    const { error } = await supabaseClient
      .from("trajetos")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", route.id);

    if (error) {
      throw error;
    }
    await recordDemandHistory({
      option: route,
      routeId: route.id,
      status: "excluido",
      operator: deletionOperator,
      details: "Trajeto movido para a lixeira com retenção de 30 dias.",
    });

    selectedRouteByLineKey.forEach((routeId, lineKey) => {
      if (routeId === route.id) {
        selectedRouteByLineKey.delete(lineKey);
      }
    });
    saveRouteHistorySelection();
    selectedRouteId = null;
    closeDeleteConfirmation();
    setMessage("Trajeto movido para a lixeira. Ele poderá ser restaurado por 30 dias.", "success");
    await refreshDashboard();
    await updateTrashCount();
  } catch (error) {
    setMessage(`Erro ao excluir trajeto: ${error.message}`, "error");
  } finally {
    deleteSelectedButton.disabled = !getSelectedRoute();
  }
}

function formatShortDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function trashDaysRemaining(deletedAt) {
  const expiresAt = new Date(deletedAt).getTime() + 30 * 86400000;
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000));
}

async function loadTrash() {
  trashList.innerHTML = '<p class="empty-cell">Carregando...</p>';
  const { data, error } = await supabaseClient.from("trajetos")
    .select("id, cliente, nome_linha, data_hora_inicio, deleted_at")
    .not("deleted_at", "is", null).order("deleted_at", { ascending: false });
  if (error) throw error;
  trashCount.textContent = String((data || []).length);
  if (!data?.length) {
    trashList.innerHTML = '<p class="empty-cell">A lixeira está vazia.</p>';
    return;
  }
  trashList.innerHTML = data.map((route) => `
    <article class="trash-item">
      <div><strong>Linha ${escapeHtml(route.nome_linha || "-")} — ${escapeHtml(route.cliente || "-")}</strong>
      <p>Referente ao dia ${formatShortDate(route.data_hora_inicio)}</p>
      <small>${trashDaysRemaining(route.deleted_at)} dia(s) restante(s)</small></div>
      <button class="button secondary" type="button" data-restore-id="${escapeHtml(route.id)}">Restaurar</button>
    </article>`).join("");
  trashList.querySelectorAll("[data-restore-id]").forEach((button) => button.addEventListener("click", () => restoreRoute(button.dataset.restoreId)));
}

async function updateTrashCount() {
  const { error: purgeError } = await supabaseClient.rpc("purge_expired_trash");
  if (purgeError && purgeError.code !== "PGRST202") {
    console.warn("Não foi possível limpar a lixeira expirada.", purgeError);
  }
  const { count } = await supabaseClient.from("trajetos").select("id", { count: "exact", head: true }).not("deleted_at", "is", null);
  trashCount.textContent = String(count || 0);
}

async function openTrash() {
  trashModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  try { await loadTrash(); } catch (error) { trashList.innerHTML = `<p class="empty-cell">Erro: ${escapeHtml(error.message)}</p>`; }
}

function closeTrash() {
  trashModal.classList.add("hidden");
  if (confirmDeleteModal.classList.contains("hidden") && !isMapModalOpen && !isDetailModalOpen) document.body.classList.remove("modal-open");
}

async function restoreRoute(routeId) {
  const { error } = await supabaseClient.from("trajetos").update({ deleted_at: null }).eq("id", routeId);
  if (error) { setMessage(`Erro ao restaurar: ${error.message}`, "error"); return; }
  setMessage("Trajeto restaurado com sucesso.", "success");
  await loadTrash();
  await refreshDashboard();
}

async function deleteSelectedRoute() {
  await deleteRoute(getSelectedRoute());
}

async function loadPendingHelpCount() {
  const { count, error } = await supabaseClient
    .from("ajuda_perguntas")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente");

  if (error) {
    pendingHelpCount.textContent = "-";
    openHelpQuestionsButton.title =
      "Execute a atualização do arquivo supabase.sql para ativar as perguntas da ajuda.";
    return;
  }

  pendingHelpCount.textContent = String(count || 0);
  openHelpQuestionsButton.title = `${count || 0} pergunta${count === 1 ? "" : "s"} aguardando resposta`;
}

async function loadDatabaseConfiguredLines() {
  const { data, error } = await supabaseClient
    .from("linhas_configuradas")
    .select("cliente, sentido, nome_linha");

  if (error) return;

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
}

function populateHelpLineClients(selectedClient = "") {
  const clients = uniqueSorted([
    ...routeOptions.map((option) => option.cliente),
    ...routes.map((route) => route.cliente),
  ]);
  helpLineClient.innerHTML = '<option value="">Selecione o cliente</option>';
  clients.forEach((cliente) => {
    const option = document.createElement("option");
    option.value = cliente;
    option.textContent = cliente;
    helpLineClient.appendChild(option);
  });
  helpLineClient.value = clients.includes(selectedClient) ? selectedClient : "";
}

function parseMissingLineRequest(text) {
  if (!String(text || "").toLowerCase().includes("minha linha não aparece")) {
    return null;
  }

  return {
    cliente: text.match(/Cliente:\s*(.*?)\.\s*Sentido:/i)?.[1]?.trim() || "",
    sentido: text.match(/Sentido:\s*(.*?)\.\s*Linha informada:/i)?.[1]?.trim() || "",
    linha: text.match(/Linha informada:\s*(.*?)\.?$/i)?.[1]?.trim().replace(/\.$/, "") || "",
  };
}

function clearHelpAnswerForm() {
  helpQuestionId.value = "";
  helpOriginalQuestion.value = "";
  helpCorrectedQuestion.value = "";
  helpAnswerText.value = "";
  saveHelpAnswerButton.disabled = true;
  deleteHelpQuestionButton.disabled = true;
  helpMissingLineFields.classList.add("hidden");
}

function selectPendingHelpQuestion(question) {
  helpQuestionId.value = question.id;
  helpOriginalQuestion.value = question.pergunta_original;
  helpCorrectedQuestion.value =
    question.pergunta_corrigida || question.pergunta_original;
  helpAnswerText.value = question.resposta || "";
  saveHelpAnswerButton.disabled = false;
  deleteHelpQuestionButton.disabled = false;
  const missingLine = parseMissingLineRequest(question.pergunta_original);
  helpMissingLineFields.classList.toggle("hidden", !missingLine);
  if (missingLine) {
    populateHelpLineClients(missingLine.cliente);
    helpLineDirection.value = ["Entrada", "Saída"].includes(missingLine.sentido)
      ? missingLine.sentido
      : "";
    helpLineName.value = missingLine.linha;
  }

  helpQuestionList.querySelectorAll(".help-question-card").forEach((card) => {
    card.classList.toggle("selected", card.dataset.questionId === question.id);
  });
  helpCorrectedQuestion.focus();
}

function renderPendingHelpQuestions() {
  helpQuestionList.innerHTML = "";

  if (pendingHelpQuestions.length === 0) {
    helpQuestionList.innerHTML =
      `<p class="empty-cell">Nenhuma pergunta ${
        helpQuestionStatusFilter.value === "respondida" ? "respondida" : "aguardando resposta"
      }.</p>`;
    clearHelpAnswerForm();
    return;
  }

  pendingHelpQuestions.forEach((question) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "help-question-card";
    button.dataset.questionId = question.id;
    button.innerHTML = `
      <strong>${escapeHtml(question.pergunta_original)}</strong>
      <em>${question.status === "respondida" ? "Respondida" : "Pendente"}</em>
      <span>${question.quantidade_perguntas || 1} ocorrência${question.quantidade_perguntas === 1 ? "" : "s"}</span>
      <small>${escapeHtml(formatDate(question.created_at))}</small>
    `;
    button.addEventListener("click", () => selectPendingHelpQuestion(question));
    helpQuestionList.appendChild(button);
  });

  selectPendingHelpQuestion(pendingHelpQuestions[0]);
}

async function loadPendingHelpQuestions() {
  helpQuestionList.innerHTML = '<p class="empty-cell">Carregando perguntas...</p>';
  clearHelpAnswerForm();

  let query = supabaseClient
    .from("ajuda_perguntas")
    .select("id, pergunta_original, pergunta_corrigida, resposta, status, quantidade_perguntas, created_at")
    .order("quantidade_perguntas", { ascending: false })
    .order("created_at", { ascending: true });
  if (helpQuestionStatusFilter.value) {
    query = query.eq("status", helpQuestionStatusFilter.value);
  }
  const { data, error } = await query;

  if (error) {
    helpQuestionList.innerHTML =
      '<p class="empty-cell">Recurso ainda não configurado. Execute o SQL atualizado no Supabase.</p>';
    return;
  }

  pendingHelpQuestions = data || [];
  renderPendingHelpQuestions();
}

async function openHelpAdmin() {
  helpAdminModal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  await loadPendingHelpQuestions();
}

function closeHelpAdmin() {
  helpAdminModal.classList.add("hidden");
  if (!isMapModalOpen && !isDetailModalOpen) {
    document.body.classList.remove("modal-open");
  }
}

async function saveHelpAnswer(event) {
  event.preventDefault();
  const id = helpQuestionId.value;
  const correctedQuestion = helpCorrectedQuestion.value.trim();
  const answer = helpAnswerText.value.trim();

  if (!id || !correctedQuestion || !answer) {
    setMessage("Corrija a pergunta e preencha a resposta antes de salvar.", "error");
    return;
  }

  try {
    saveHelpAnswerButton.disabled = true;
    saveHelpAnswerButton.textContent = "Salvando...";
    const { error } = await supabaseClient
      .from("ajuda_perguntas")
      .update({
        pergunta_corrigida: correctedQuestion,
        resposta: answer,
        status: "respondida",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    setMessage("Pergunta corrigida e resposta adicionada à ajuda.", "success");
    await Promise.all([loadPendingHelpQuestions(), loadPendingHelpCount()]);
  } catch (error) {
    setMessage(`Erro ao salvar resposta: ${error.message}`, "error");
  } finally {
    saveHelpAnswerButton.textContent = "Salvar resposta";
    saveHelpAnswerButton.disabled = !helpQuestionId.value;
  }
}

async function deleteSelectedHelpQuestion() {
  const id = helpQuestionId.value;
  if (!id) return;

  const confirmed = window.confirm(
    "Excluir permanentemente esta pergunta e a resposta cadastrada?"
  );
  if (!confirmed) return;

  try {
    deleteHelpQuestionButton.disabled = true;
    const { error } = await supabaseClient
      .from("ajuda_perguntas")
      .delete()
      .eq("id", id);
    if (error) throw error;

    setMessage("Pergunta e resposta excluídas da base de ajuda.", "success");
    await Promise.all([loadPendingHelpQuestions(), loadPendingHelpCount()]);
  } catch (error) {
    setMessage(`Erro ao excluir pergunta: ${error.message}`, "error");
    deleteHelpQuestionButton.disabled = false;
  }
}

async function addRequestedLine() {
  const questionId = helpQuestionId.value;
  const cliente = helpLineClient.value.trim();
  const sentido = helpLineDirection.value;
  const nomeLinha = helpLineName.value.trim();

  if (!questionId || !cliente || !sentido || !nomeLinha) {
    setMessage("Selecione cliente e sentido e informe a linha.", "error");
    return;
  }

  try {
    addRequestedLineButton.disabled = true;
    addRequestedLineButton.textContent = "Adicionando...";
    const { error: lineError } = await supabaseClient
      .from("linhas_configuradas")
      .upsert(
        { cliente, sentido, nome_linha: nomeLinha },
        { onConflict: "cliente,sentido,nome_linha" }
      );
    if (lineError) throw lineError;

    const correctedQuestion =
      `Minha linha não aparece para o cliente ${cliente}, no sentido ${sentido}: ${nomeLinha}.`;
    const answer =
      `A linha ${nomeLinha}, sentido ${sentido}, foi cadastrada para o cliente ${cliente}. Atualize a página e tente novamente.`;
    const { error: questionError } = await supabaseClient
      .from("ajuda_perguntas")
      .update({
        pergunta_corrigida: correctedQuestion,
        resposta: answer,
        status: "respondida",
        updated_at: new Date().toISOString(),
      })
      .eq("id", questionId);
    if (questionError) throw questionError;

    const lineKey = `${cliente}||${sentido}||${nomeLinha}`;
    if (
      !routeOptions.some(
        (option) =>
          `${option.cliente}||${option.sentido}||${option.nome_linha}` === lineKey
      )
    ) {
      routeOptions.push({ cliente, sentido, nome_linha: nomeLinha });
    }
    populateListBoxFilters();
    renderTrackingChecklist();
    setMessage("Linha adicionada ao banco e solicitação respondida.", "success");
    await Promise.all([loadPendingHelpQuestions(), loadPendingHelpCount()]);
  } catch (error) {
    setMessage(`Erro ao adicionar linha: ${error.message}`, "error");
  } finally {
    addRequestedLineButton.disabled = false;
    addRequestedLineButton.textContent = "Adicionar linha ao banco";
  }
}

async function deleteSelectedPoints() {
  const route = getSelectedRoute();
  const pointIds = [...selectedPointIds];

  if (!route || pointIds.length === 0 || savingPointId) {
    setMessage("Selecione um ou mais pontos para excluir.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Excluir ${pointIds.length} ponto${pointIds.length === 1 ? "" : "s"} selecionado${pointIds.length === 1 ? "" : "s"}? A sequencia sera reorganizada.`
  );
  if (!confirmed) return;

  savingPointId = "exclusao-em-massa";
  routedLineCache.clear();
  syncRefreshTimer();
  updatePointSelectionControls();
  setMessage(`Excluindo ${pointIds.length} ponto${pointIds.length === 1 ? "" : "s"}...`, "");

  try {
    const deletedPoints = currentRoutePoints.filter((point) =>
      pointIds.includes(String(point.id))
    );
    const pointsBeforeDeletion = [...currentRoutePoints];
    const { data, error } = await supabaseClient
      .from("trajeto_pontos")
      .delete()
      .eq("trajeto_id", route.id)
      .in("id", pointIds)
      .select("id");

    if (error) throw error;
    if ((data || []).length !== pointIds.length) {
      throw new Error("o Supabase nao confirmou a exclusao de todos os pontos");
    }

    const deletedIds = new Set(pointIds);
    await renumberExistingRoutePoints(
      getOrderedValidPoints(currentRoutePoints).filter((point) => !deletedIds.has(String(point.id)))
    );
    lastDeletedPointBatch = {
      routeId: route.id,
      deletedPoints,
      pointsBeforeDeletion,
    };
    selectedPointIds.clear();
    setMessage(`${pointIds.length} ponto${pointIds.length === 1 ? " excluido" : "s excluidos"} e sequencia reorganizada.`, "success");
    await loadSelectedRouteDetails();
  } catch (error) {
    setMessage(getPointEditErrorMessage(error, "excluir em massa"), "error");
    await loadSelectedRouteDetails();
  } finally {
    savingPointId = null;
    updatePointSelectionControls();
    syncRefreshTimer();
  }
}

async function undoDeleteSelectedPoints() {
  const batch = lastDeletedPointBatch;
  const route = getSelectedRoute();

  if (!batch || !route || batch.routeId !== route.id || savingPointId) {
    setMessage("Nao ha uma exclusao recente para desfazer neste trajeto.", "error");
    return;
  }

  savingPointId = "desfazer-exclusao";
  routedLineCache.clear();
  syncRefreshTimer();
  updatePointSelectionControls();
  setMessage("Restaurando pontos excluidos...", "");

  try {
    const tempBaseOrder = getSafeTemporaryOrderBase(currentRoutePoints, batch.deletedPoints.length);
    const rowsToRestore = batch.deletedPoints.map((point, index) => ({
      id: point.id,
      trajeto_id: route.id,
      latitude: point.latitude,
      longitude: point.longitude,
      data_hora_registro: point.data_hora_registro,
      ordem_ponto: tempBaseOrder + index,
      tipo_ponto: point.tipo_ponto,
      precisao: point.precisao,
    }));

    const { data, error } = await supabaseClient
      .from("trajeto_pontos")
      .insert(rowsToRestore)
      .select("id");

    if (error) throw error;
    if ((data || []).length !== rowsToRestore.length) {
      throw new Error("o Supabase nao confirmou a restauracao de todos os pontos");
    }

    await renumberExistingRoutePoints(getOrderedValidPoints(batch.pointsBeforeDeletion));
    const restoredCount = batch.deletedPoints.length;
    lastDeletedPointBatch = null;
    setMessage(
      `${restoredCount} ponto${restoredCount === 1 ? " restaurado" : "s restaurados"} com sucesso.`,
      "success"
    );
    await loadSelectedRouteDetails();
  } catch (error) {
    setMessage(getPointEditErrorMessage(error, "desfazer exclusao"), "error");
    await loadSelectedRouteDetails();
  } finally {
    savingPointId = null;
    updatePointSelectionControls();
    syncRefreshTimer();
  }
}

async function deletePointsByRange() {
  const start = Number(deleteRangeStart.value);
  const end = Number(deleteRangeEnd.value);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    setMessage("Escolha o inicio e o fim do intervalo.", "error");
    return;
  }

  const firstOrder = Math.min(start, end);
  const lastOrder = Math.max(start, end);
  const pointsInRange = currentRoutePoints.filter((point) => {
    const order = Number(point.ordem_ponto);
    return order >= firstOrder && order <= lastOrder;
  });

  if (pointsInRange.length === 0) {
    setMessage("Nenhum ponto foi encontrado nesse intervalo.", "error");
    return;
  }

  selectedPointIds.clear();
  pointsInRange.forEach((point) => selectedPointIds.add(String(point.id)));
  renderRouteDetails(getSelectedRoute(), currentRoutePoints);
  await deleteSelectedPoints();
}

async function convertTrackPointToManual(point) {
  if (!point || point.tipo_ponto !== "trajeto" || savingPointId) {
    setMessage("Selecione um ponto de trajeto para tornar manual.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Tornar o ponto ${point.ordem_ponto} um ponto manual?`
  );
  if (!confirmed) return;

  savingPointId = point.id;
  syncRefreshTimer();
  updatePointSelectionControls();
  setMessage(`Convertendo o ponto ${point.ordem_ponto} para manual...`, "");

  try {
    const { data, error } = await supabaseClient
      .from("trajeto_pontos")
      .update({ tipo_ponto: "manual" })
      .eq("id", point.id)
      .eq("trajeto_id", selectedRouteId)
      .eq("tipo_ponto", "trajeto")
      .select("id, tipo_ponto")
      .single();

    if (error) throw error;
    if (!data?.id || data.tipo_ponto !== "manual") {
      throw new Error("o Supabase nao confirmou a conversao do ponto");
    }

    setMessage(`Ponto ${point.ordem_ponto} convertido para manual.`, "success");
    await loadSelectedRouteDetails();
  } catch (error) {
    setMessage(getPointEditErrorMessage(error, "tornar manual"), "error");
    await loadSelectedRouteDetails();
  } finally {
    savingPointId = null;
    updatePointSelectionControls();
    syncRefreshTimer();
  }
}

function syncRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }

  if (autoRefreshToggle.checked && !isEditingMapPoints && !savingPointId) {
    refreshTimer = setInterval(refreshDashboard, REFRESH_INTERVAL_MS);
  }
}

refreshButton.addEventListener("click", refreshDashboard);
openMapButton.addEventListener("click", openMapModal);
closeMapButton.addEventListener("click", closeMapModal);
mapModalBackdrop.addEventListener("click", closeMapModal);
closeDetailButton.addEventListener("click", closeDetailModal);
detailModalBackdrop.addEventListener("click", closeDetailModal);
exportJsonButton.addEventListener("click", () => exportSelectedRoute("json"));
exportKmlButton.addEventListener("click", () => exportSelectedRoute("kml"));
exportExcelButton.addEventListener("click", () => exportSelectedRoute("excel"));
fitMapButton.addEventListener("click", () => {
  mapUserAdjustedView = false;
  fitRouteMap();
});
toggleTrackPositionsButton.addEventListener("click", () => {
  showValidatedTrackPositions = !showValidatedTrackPositions;
  syncTrackPositionVisibilityButton();
  renderRouteMap(filterPointsByView(currentRoutePoints));
});
mapSearchButton.addEventListener("click", searchMapPoint);
mapPointSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchMapPoint(event);
  }
});
editMapButton.addEventListener("click", () => setMapEditing(!isEditingMapPoints));
officializeRouteButton.addEventListener("click", officializeRouteNodeEdit);
openLayerEditorButton.addEventListener("click", openOfficialLayerEditor);
openDemandHistoryButton.addEventListener("click", openDemandHistoryModal);
closeDemandHistoryButton.addEventListener("click", closeDemandHistoryModal);
demandHistoryBackdrop.addEventListener("click", closeDemandHistoryModal);
closeLayerEditorButton.addEventListener("click", closeOfficialLayerEditor);
layerEditorBackdrop.addEventListener("click", closeOfficialLayerEditor);
saveOfficialLayerButton.addEventListener("click", saveOfficialLayer);
layerEditorSearchButton.addEventListener("click", searchLayerEditorLocation);
layerEditorSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") searchLayerEditorLocation(event);
});
addLayerManualPointButton.addEventListener("click", () => {
  isAddingLayerManualPoint = !isAddingLayerManualPoint;
  addLayerManualPointButton.classList.toggle("active", isAddingLayerManualPoint);
  addLayerManualPointButton.textContent = isAddingLayerManualPoint
    ? "Cancelar inclusão"
    : "Adicionar ponto manual";
  layerEditorStatus.textContent = isAddingLayerManualPoint
    ? "Clique no mapa para incluir o ponto manual."
    : "Inclusão de ponto manual cancelada.";
});
alignmentForm.addEventListener("submit", saveExecutionAlignment);
closeAlignmentButton.addEventListener("click", closeAlignmentModal);
alignmentBackdrop.addEventListener("click", closeAlignmentModal);
clearLayerNodesButton.addEventListener("click", async () => {
  layerEditorNodes = [];
  layerEditorStatus.textContent = "Removendo os nós e recalculando a rota...";
  try {
    await routeOfficialGeometryThroughBoardingPoints();
    saveOfficialLayerButton.disabled = false;
    layerEditorStatus.textContent =
      "Todos os nós foram removidos. A rota foi recalculada pelos pontos de embarque; oficialize para salvar.";
    renderOfficialLayerEditor();
  } catch (error) {
    layerEditorStatus.textContent = `Erro ao limpar os nós: ${error.message}`;
  }
});
undoPointOrderButton.addEventListener("click", undoLastPointOrderChange);
mapViewInputs.forEach((input) => {
  input.addEventListener("change", () => {
    syncMapViewInputs(input.value);
    mapUserAdjustedView = false;
    renderRouteDetails(getSelectedRoute(), currentRoutePoints);
  });
});
finishSelectedButton.addEventListener("click", finishSelectedRoute);
validateSelectedButton.addEventListener("click", validateSelectedRoute);
previousStatusButton.addEventListener("click", returnRouteToPreviousStatus);
deleteSelectedButton.addEventListener("click", deleteSelectedRoute);
function syncDeleteConfirmationButton() {
  confirmDeleteButton.disabled =
    confirmDeleteInput.value.trim().toUpperCase() !== "EXCLUIR";
}
confirmDeleteInput.addEventListener("input", syncDeleteConfirmationButton);
confirmDeleteInput.addEventListener("paste", (event) => event.preventDefault());
confirmDeleteInput.addEventListener("drop", (event) => event.preventDefault());
confirmDeleteInput.addEventListener("cut", (event) => event.preventDefault());
confirmDeleteInput.addEventListener("contextmenu", (event) => event.preventDefault());
confirmDeleteModal.addEventListener("copy", (event) => event.preventDefault());
confirmDeleteButton.addEventListener("click", confirmRouteDeletion);
cancelDeleteButton.addEventListener("click", closeDeleteConfirmation);
confirmDeleteBackdrop.addEventListener("click", closeDeleteConfirmation);
trashButton.addEventListener("click", openTrash);
closeTrashButton.addEventListener("click", closeTrash);
trashBackdrop.addEventListener("click", closeTrash);
deleteSelectedPointsButton.addEventListener("click", deleteSelectedPoints);
undoDeletePointsButton.addEventListener("click", undoDeleteSelectedPoints);
deletePointRangeButton.addEventListener("click", deletePointsByRange);
[deleteRangeStart, deleteRangeEnd].forEach((select) => {
  select.addEventListener("change", () => updatePointSelectionControls());
});
selectAllPoints.addEventListener("change", () => {
  filterPointsByView(currentRoutePoints).forEach((point) => {
    const pointId = String(point.id);
    if (selectAllPoints.checked) selectedPointIds.add(pointId);
    else selectedPointIds.delete(pointId);
  });
  renderRouteDetails(getSelectedRoute(), currentRoutePoints);
});
autoRefreshToggle.addEventListener("change", syncRefreshTimer);
driverFilter.addEventListener("input", renderFilteredViews);
clientFilter.addEventListener("change", () => {
  refreshLineFilterOptions();
  renderFilteredViews();
});
directionFilter.addEventListener("change", () => {
  refreshLineFilterOptions();
  renderFilteredViews();
});
lineFilter.addEventListener("change", renderFilteredViews);
statusFilter.addEventListener("change", renderFilteredViews);
operatorFilter.addEventListener("change", renderFilteredViews);
openHelpQuestionsButton.addEventListener("click", openHelpAdmin);
openDashboardSummaryButton.addEventListener("click", openDashboardSummary);
closeDashboardSummaryButton.addEventListener("click", closeDashboardSummary);
dashboardSummaryBackdrop.addEventListener("click", closeDashboardSummary);
closeHelpAdminButton.addEventListener("click", closeHelpAdmin);
helpAdminBackdrop.addEventListener("click", closeHelpAdmin);
helpAnswerForm.addEventListener("submit", saveHelpAnswer);
helpQuestionStatusFilter.addEventListener("change", loadPendingHelpQuestions);
deleteHelpQuestionButton.addEventListener("click", deleteSelectedHelpQuestion);
addRequestedLineButton.addEventListener("click", addRequestedLine);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !dashboardSummaryModal.classList.contains("hidden")) {
    closeDashboardSummary();
  } else if (event.key === "Escape" && isLayerEditorOpen) {
    closeOfficialLayerEditor();
  } else if (event.key === "Escape" && !confirmDeleteModal.classList.contains("hidden")) {
    closeDeleteConfirmation();
  } else if (event.key === "Escape" && !trashModal.classList.contains("hidden")) {
    closeTrash();
  } else if (event.key === "Escape" && isMapModalOpen) {
    closeMapModal();
  } else if (event.key === "Escape" && isDetailModalOpen) {
    closeDetailModal();
  } else if (event.key === "Escape" && !helpAdminModal.classList.contains("hidden")) {
    closeHelpAdmin();
  }
});

async function initializeProtectedPanel() {
  await AppAccess.requireAccess();
  AppAccess.applyPermissions();
  if (AppAccess.can("editar") || AppAccess.can("excluir")) await ensureLoggedPlanningOperator();
  loadRouteHistorySelection();
  await refreshDashboard();
  updateTrashCount();
  loadPendingHelpCount();
  syncRefreshTimer();
}

initializeProtectedPanel().catch((error) => {
  console.error("Falha ao iniciar o painel protegido:", error);
});
