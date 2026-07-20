const SUPABASE_URL = "https://tytiezeamgwmqrrygoia.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gP0qRTSoUiO8-yMq8dgWEQ_1E3MTt7p";
const REFRESH_INTERVAL_MS = 5000;
const ROUTING_CHUNK_SIZE = 25;
const POINT_UPDATE_CONCURRENCY = 25;
const ROUTING_SERVICE_URL = "https://router.project-osrm.org/route/v1/driving";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
const databaseUsage = document.querySelector("#databaseUsage");
const appDatabaseUsage = document.querySelector("#appDatabaseUsage");
const lastRefresh = document.querySelector("#lastRefresh");
const driverFilter = document.querySelector("#driverFilter");
const clientFilter = document.querySelector("#clientFilter");
const directionFilter = document.querySelector("#directionFilter");
const lineFilter = document.querySelector("#lineFilter");
const statusFilter = document.querySelector("#statusFilter");
const selectedRouteTitle = document.querySelector("#selectedRouteTitle");
const selectedRouteStatus = document.querySelector("#selectedRouteStatus");
const validateSelectedButton = document.querySelector("#validateSelectedButton");
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
const editMapButton = document.querySelector("#editMapButton");
const undoPointOrderButton = document.querySelector("#undoPointOrderButton");
const openMapButton = document.querySelector("#openMapButton");
const closeMapButton = document.querySelector("#closeMapButton");
const mapModal = document.querySelector("#mapModal");
const mapModalBackdrop = document.querySelector("#mapModalBackdrop");
const mapModalTitle = document.querySelector("#mapModalTitle");
const mapPointSearch = document.querySelector("#mapPointSearch");
const mapSearchButton = document.querySelector("#mapSearchButton");
const exportKmlButton = document.querySelector("#exportKmlButton");
const exportOrusButton = document.querySelector("#exportOrusButton");
const exportJsonButton = document.querySelector("#exportJsonButton");
const exportExcelButton = document.querySelector("#exportExcelButton");
const mapViewInputs = document.querySelectorAll('input[name="mapView"], input[name="mapViewModal"]');
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

let routes = [];
let pointCountByRouteId = new Map();
const HISTORY_SELECTION_STORAGE_KEY = "painel_route_history_selection";
const selectedRouteByLineKey = new Map();
let selectedRouteId = null;
let refreshTimer = null;
let routeMap = null;
let routeMapLayer = null;
let routeLineLayer = null;
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
let savingPointId = null;
let lastPointOrderSnapshot = null;
const selectedPointIds = new Set();
let lastDeletedPointBatch = null;
let routeLineRequestId = 0;
let suppressMapClickUntil = 0;
const routedLineCache = new Map();
const routeMarkerByPointId = new Map();
let pendingHelpQuestions = [];

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

  return routes.filter((route) => {
    const matchesDriver = getDriverSearchText(route).includes(driverText);
    const matchesClient = !clientValue || route.cliente === clientValue;
    const matchesDirection = !directionValue || route.sentido === directionValue;
    const matchesLine = !lineValue || route.nome_linha === lineValue;
    const matchesStatus = !statusValue || getRouteStatus(route) === statusValue;

    return matchesDriver && matchesClient && matchesDirection && matchesLine && matchesStatus;
  });
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
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

function getStatusLabel(status) {
  const labels = {
    em_andamento: "em andamento",
    finalizado: "aguardando validacao",
    trajeto: "trajeto validado",
  };

  return labels[status] || status || "-";
}

function getStatusClass(status) {
  if (status === "finalizado") {
    return "waiting";
  }

  if (status === "trajeto") {
    return "validated";
  }

  return "";
}

function getPointTypeLabel(type) {
  const labels = {
    primeiro: "Primeiro",
    manual: "Ponto",
    trajeto: "Trajeto",
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
  // O trajeto exportado representa a sequencia completa capturada. Pontos
  // manuais continuam aparecendo separadamente em "Pontos", mas tambem fazem
  // parte da linha/aba "Trajeto" na ordem em que foram registrados.
  return points;
}

function getRouteStopPoints(points) {
  return points.filter(isManualPoint);
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

  return {
    cliente: route.cliente || "",
    linha: route.nome_linha || "",
    matricula: route.matricula_condutor || "",
    apelido: conductor?.apelido || "",
    garagem: conductor?.garagem || "",
    sentido: route.sentido || "",
    status: getStatusLabel(getRouteStatus(route)),
    horario_inicio: formatFileDate(route.data_hora_inicio),
    horario_fim: formatFileDate(route.data_hora_fim),
    total_registros: points.length,
    total_trajeto: trackPoints.length,
    total_pontos: stopPoints.length,
  };
}

function buildJsonExport(route, points) {
  const trackPoints = getRouteTrackPoints(points);
  const stopPoints = getRouteStopPoints(points);

  return JSON.stringify(
    {
      resumo: buildExportSummary(route, points),
      trajeto: {
        quantidade_pontos: trackPoints.length,
        coordenadas: trackPoints.map((point, index) => ({
          ordem: index + 1,
          lat: point.latitude,
          lon: point.longitude,
        })),
      },
      pontos: stopPoints.map((point, index) => ({
        ordem: index + 1,
        nome: `Ponto ${getExportName(route)} - ${getPointTime(point) || point.ordem_ponto}`,
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

function buildKmlExport(route, points) {
  const name = escapeXml(getExportName(route));
  const trackPoints = getRouteTrackPoints(points);
  const stopPoints = getRouteStopPoints(points);
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
  const coordinates = trackPoints
    .map((point) => `          ${point.longitude},${point.latitude},0`)
    .join("\n");
  const pointPlacemarks = stopPoints
    .map((point) => {
      const pointName = escapeXml(`Ponto ${getExportName(route)} - ${getPointTime(point) || point.ordem_ponto}`);
      const description = escapeXml(getPointTypeLabel(point.tipo_ponto));

      return `    <Placemark>
      <name>${pointName}</name>
      <description>${description}</description>
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
  const route = getSelectedRoute();

  if (!route || currentRoutePoints.length === 0) {
    setMessage("Selecione um trajeto com pontos para exportar.", "error");
    return;
  }

  const filename = slugify(getExportName(route));

  if (format === "kml") {
    downloadTextFile(
      `${filename}-trajeto-pontos.kml`,
      buildKmlExport(route, currentRoutePoints),
      "application/vnd.google-earth.kml+xml;charset=utf-8"
    );
    return;
  }

  if (format === "orus") {
    const exportPoints = [...currentRoutePoints];
    const trackPoints = getRouteTrackPoints(exportPoints);
    if (trackPoints.length < 2) {
      setMessage("O trajeto precisa ter pelo menos dois registros para exportar no formato OrUS.", "error");
      return;
    }
    exportOrusButton.disabled = true;
    setMessage("Calculando o trajeto pelas ruas para gerar o OrUS...", "");
    try {
      const routedLatLngs = await fetchRoutedLatLngs(trackPoints);
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
      exportOrusButton.disabled = getRouteTrackPoints(currentRoutePoints).length < 2;
    }
    return;
  }

  if (format === "json") {
    downloadTextFile(
      `${filename}-trajeto-pontos.json`,
      buildJsonExport(route, currentRoutePoints),
      "application/json;charset=utf-8"
    );
    return;
  }

  downloadBlobFile(
    `${filename}-trajeto-pontos.xlsx`,
    buildExcelExport(route, currentRoutePoints),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
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

function filterPointsByView(points) {
  const viewMode = getMapViewMode();

  if (viewMode === "pontos") {
    return points.filter(isManualPoint);
  }

  if (viewMode === "trajeto") {
    return points.filter((point) => point.tipo_ponto === "trajeto");
  }

  return points;
}

function getMapViewLabel() {
  const labels = {
    ambos: "registros",
    pontos: "pontos",
    trajeto: "pontos de trajeto",
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

async function drawRoutedLine(validPoints, fallbackLatLngs, requestId) {
  if (validPoints.length < 2 || getMapViewMode() === "pontos" || isEditingMapPoints) {
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
  isEditingMapPoints = enabled;
  editMapButton.classList.toggle("active", isEditingMapPoints);
  editMapButton.textContent = isEditingMapPoints ? "Concluir edicao" : "Editar pontos";
  syncRefreshTimer();
  setMessage(
    isEditingMapPoints
      ? "Edicao ativa: arraste pontos existentes ou clique no mapa para inserir ponto de trajeto."
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
    return;
  }

  const orderedPoints = getOrderedValidPoints(currentRoutePoints);
  const pointIndex = orderedPoints.findIndex((item) => item.id === point.id);

  if (pointIndex === -1) {
    setMessage("Ponto nao encontrado na sequencia atual.", "error");
    return;
  }

  const boundedOrder = Math.max(1, Math.min(Number(targetOrder) || point.ordem_ponto, orderedPoints.length));
  if (boundedOrder === pointIndex + 1) {
    setMessage("O ponto ja esta nessa ordem.", "");
    return;
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
    return;
  }

  const confirmed = window.confirm("Inserir um ponto de trajeto nesta posicao?");

  if (!confirmed) {
    return;
  }

  const orderedPoints = getOrderedValidPoints(currentRoutePoints);
  const newOrder = getInsertionOrder(latLng);
  const newPointTemporaryOrder =
    getSafeTemporaryOrderBase(orderedPoints, 1);

  savingPointId = "novo";
  routedLineCache.clear();
  syncRefreshTimer();
  setMessage("Inserindo ponto de trajeto...", "");

  try {
    const { data: insertedPoint, error: insertError } = await supabaseClient
      .from("trajeto_pontos")
      .insert({
        trajeto_id: selectedRouteId,
        latitude: latLng.lat,
        longitude: latLng.lng,
        data_hora_registro: new Date().toISOString(),
        ordem_ponto: newPointTemporaryOrder,
        tipo_ponto: "trajeto",
        precisao: null,
      })
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    await renumberRoutePointsWithInsertedPoint(insertedPoint.id, newOrder);

    setMessage("Ponto de trajeto inserido e rota recalculada.", "success");
    await loadSelectedRouteDetails();
  } catch (error) {
    const message = error?.message || "";
    const needsSql =
      error?.code === "42501" ||
      message.toLowerCase().includes("row-level security") ||
      message.toLowerCase().includes("violates row-level security");

    setMessage(
      needsSql
        ? "Erro ao inserir ponto: execute no Supabase a politica de insert para trajeto_pontos."
        : `Erro ao inserir ponto: ${message}`,
      "error"
    );
    await loadSelectedRouteDetails();
  } finally {
    savingPointId = null;
    syncRefreshTimer();
  }
}

async function deleteMapPoint(point) {
  if (!point || savingPointId) {
    return;
  }

  if (point.tipo_ponto === "primeiro") {
    setMessage("O ponto inicial e protegido e nao pode ser excluido no mapa.", "error");
    return;
  }

  if (point.tipo_ponto !== "trajeto" && point.tipo_ponto !== "manual") {
    setMessage("Este tipo de ponto nao pode ser excluido no mapa.", "error");
    return;
  }

  const pointType = getPointTypeLabel(point.tipo_ponto);
  const confirmed = window.confirm(
    `Excluir o ponto ${point.ordem_ponto} (${pointType})? A sequencia sera reorganizada.`
  );

  if (!confirmed) {
    return;
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
  } catch (error) {
    setMessage(getPointEditErrorMessage(error, "excluir"), "error");
    await loadSelectedRouteDetails();
  } finally {
    savingPointId = null;
    syncRefreshTimer();
  }
}

function openMapModal() {
  if (openMapButton.disabled) {
    return;
  }

  isMapModalOpen = true;
  mapModal.classList.remove("hidden");
  document.body.classList.add("modal-open");

  const map = ensureRouteMap();
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

function createPointPopupContent(point, maxOrder) {
  const container = document.createElement("div");
  container.className = "point-popup-content";

  const lines = [
    `<strong>Ponto ${escapeHtml(point.ordem_ponto)}</strong>`,
    `Tipo: ${escapeHtml(getPointTypeLabel(point.tipo_ponto))}`,
    `Horario: ${escapeHtml(formatDate(point.data_hora_registro))}`,
    `LatLng: ${escapeHtml(formatNumber(point.latitude))}, ${escapeHtml(formatNumber(point.longitude))}`,
  ];

  container.innerHTML = lines.join("<br>");

  if (!isEditingMapPoints) {
    return container;
  }

  const hint = document.createElement("strong");
  hint.className = "popup-edit-hint";
  hint.textContent = "Arraste para ajustar ou clique no mapa para inserir ponto";
  container.appendChild(hint);

  const orderEditor = document.createElement("label");
  orderEditor.className = "popup-order-editor";

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

  if (point.tipo_ponto === "trajeto" || point.tipo_ponto === "manual") {
    const deleteButton = document.createElement("button");
    deleteButton.className = "popup-danger-button";
    deleteButton.type = "button";
    deleteButton.textContent = point.tipo_ponto === "manual" ? "Excluir ponto manual" : "Excluir ponto";
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
  validPoints.forEach((point) => {
    const marker = L.marker([point.latitude, point.longitude], {
      icon: getMarkerIcon(point),
      title: `Ponto ${point.ordem_ponto}`,
      draggable: isEditingMapPoints,
    })
      .bindPopup(createPointPopupContent(point, maxOrder))
      .addTo(routeMapLayer);

    routeMarkerByPointId.set(String(point.id), marker);

    if (isEditingMapPoints) {
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
  currentMapLatLngs = latLngs;
  fitMapButton.disabled = false;

  if (latLngs.length > 1 && getMapViewMode() !== "pontos") {
    const cachedLatLngs = routedLineCache.get(pointSignature);

    drawRouteLine(cachedLatLngs || latLngs, cachedLatLngs
      ? {
          color: "#116149",
          weight: 5,
          opacity: 0.9,
          signature: `${isEditingMapPoints ? "edit" : "view"}::routed::${pointSignature}`,
        }
      : {
          color: "#1264c8",
          weight: 4,
          opacity: 0.65,
          signature: `${isEditingMapPoints ? "edit" : "view"}::fallback::${pointSignature}`,
        });
    if (!cachedLatLngs) {
      drawRoutedLine(validPoints, latLngs, requestId);
    }
  } else if (routeLineLayer) {
    routeMap.removeLayer(routeLineLayer);
    routeLineLayer = null;
    routeLineSignature = "";
  }

  drawRouteMarkers(validPoints);

  if (routeChanged) {
    mapUserAdjustedView = false;
  }

  if (isMapModalOpen && (routeChanged || (!mapUserAdjustedView && pointsChanged))) {
    fitRouteMap();
    setTimeout(fitRouteMap, 150);
  }

  renderedMapRouteId = selectedRouteId;
  renderedPointSignature = pointSignature;
  if (latLngs.length > 1 && getMapViewMode() !== "pontos") {
    mapStatus.textContent = routedLineCache.has(pointSignature)
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
    .bindPopup(`<strong>${escapeHtml(label)}</strong><br>LatLng: ${escapeHtml(formatNumber(latitude))}, ${escapeHtml(formatNumber(longitude))}`)
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

  return getConfiguredLines().filter((option) => {
    const history = getRouteHistoryForConfiguredLine(option);
    const isNotTraveled = history.length === 0;
    const selectedRoute = getRouteForConfiguredLine(option);
    const lineKey = getConfiguredLineKey(option);
    const matchingHistory = history.filter((historyRoute) => {
      const matchesDriverFilter =
        !driverText || getDriverSearchText(historyRoute).includes(driverText);
      const matchesStatusFilter = !statusValue || getRouteStatus(historyRoute) === statusValue;

      return matchesDriverFilter && matchesStatusFilter;
    });
    const matchesDriver =
      !driverText || history.some((historyRoute) => getDriverSearchText(historyRoute).includes(driverText));
    const matchesClient = !clientValue || option.cliente === clientValue;
    const matchesDirection = !directionValue || option.sentido === directionValue;
    const matchesLine = !lineValue || option.nome_linha === lineValue;
    const matchesStatus =
      !statusValue ||
      (statusValue === "nao_percorrido"
        ? isNotTraveled
        : history.some((historyRoute) => getRouteStatus(historyRoute) === statusValue));

    if (
      matchingHistory.length > 0 &&
      (!selectedRoute || !matchingHistory.some((historyRoute) => historyRoute.id === selectedRoute.id))
    ) {
      selectedRouteByLineKey.set(lineKey, matchingHistory[0].id);
    }

    return matchesDriver && matchesClient && matchesDirection && matchesLine && matchesStatus;
  }).sort((a, b) => {
    const countDifference = getConfiguredLinePointCount(b) - getConfiguredLinePointCount(a);

    if (countDifference !== 0) {
      return countDifference;
    }

    const clientComparison = (a.cliente || "").localeCompare(b.cliente || "", "pt-BR");

    if (clientComparison !== 0) {
      return clientComparison;
    }

    return (a.nome_linha || "").localeCompare(b.nome_linha || "", "pt-BR");
  });
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
    const routeStatus = getRouteStatus(route);
    const statusText = route ? getStatusLabel(routeStatus) : "nao percorrido";
    const statusClass = route ? getStatusClass(routeStatus) : "missing";
    const conductorText = route ? formatConductorSummary(route) : "";

    card.className = "checklist-item";
    card.innerHTML = `
      <div class="checklist-main">
        <span class="status-pill ${statusClass}">${statusText}</span>
        <strong>${option.cliente}</strong>
        <span>${option.nome_linha || "-"}</span>
        <small>${option.sentido || "-"} | ${count} registros</small>
        ${conductorText ? `<small>Condutor: ${escapeHtml(conductorText)}</small>` : ""}
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
        <button class="button secondary" type="button" data-action="view" ${route ? "" : "disabled"}>
          Visualizar
        </button>
        <button class="button secondary" type="button" data-action="validate" ${
          routeStatus === "finalizado" ? "" : "disabled"
        }>
          Validar
        </button>
        <button class="button danger" type="button" data-action="delete" ${route ? "" : "disabled"}>
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
    card.querySelector('[data-action="validate"]')?.addEventListener("click", () =>
      validateRoute(route)
    );
    card.querySelector('[data-action="delete"]')?.addEventListener("click", () =>
      deleteRoute(route)
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
    ? points.filter((point) => point.tipo_ponto === "trajeto").length
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
  selectedPointCount.textContent = route ? `${visiblePoints.length}/${points.length}` : "0";
  totalVisibleRecords.textContent = String(visiblePoints.length);
  totalManualPoints.textContent = String(manualPointCount);
  totalTrackPoints.textContent = String(trackPointCount);
  routeStorageUsage.textContent = `${formatBytes(estimateRouteStorage(route, points))} armazenado`;
  routeStorageUsage.title = route
    ? "Estimativa do espaco ocupado pelo trajeto selecionado e seus pontos carregados"
    : "Selecione um trajeto para ver o espaco estimado";
  validateSelectedButton.disabled = !route || routeStatus !== "finalizado";
  finishSelectedButton.disabled = !route || route.status !== "em_andamento";
  deleteSelectedButton.disabled = !route;
  openMapButton.disabled = !route || visiblePoints.length === 0;
  editMapButton.disabled = !route || visiblePoints.length === 0;
  undoPointOrderButton.disabled =
    !lastPointOrderSnapshot ||
    lastPointOrderSnapshot.routeId !== selectedRouteId ||
    Boolean(savingPointId);
  exportKmlButton.disabled = !route || points.length === 0;
  exportOrusButton.disabled = !route || trackPointCount < 2;
  exportJsonButton.disabled = !route || points.length === 0;
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
          <td>${point.ordem_ponto}</td>
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

async function loadDatabaseUsage() {
  databaseUsage.textContent = "Carregando";
  appDatabaseUsage.textContent = "Dados app: carregando";
  databaseUsage.title = "Consultando uso do banco no Supabase";

  try {
    const { data, error } = await supabaseClient.rpc("get_database_usage");

    if (error) {
      throw error;
    }

    const usage = Array.isArray(data) ? data[0] : data;

    if (!usage) {
      databaseUsage.textContent = "-";
      appDatabaseUsage.textContent = "Dados app: -";
      databaseUsage.title = "Supabase nao retornou dados de uso do banco";
      return;
    }

    const usedBytes = Number(usage.used_bytes);
    const limitBytes = Number(usage.limit_bytes);
    const appUsedBytes = Number(usage.app_used_bytes);

    if (!Number.isFinite(usedBytes) || !Number.isFinite(limitBytes)) {
      databaseUsage.textContent = "-";
      appDatabaseUsage.textContent = "Dados app: -";
      databaseUsage.title = "Retorno invalido da funcao get_database_usage";
      return;
    }

    databaseUsage.textContent = `${formatBytes(usage.used_bytes)} / ${formatBytes(
      usage.limit_bytes
    )}`;
    appDatabaseUsage.textContent = Number.isFinite(appUsedBytes)
      ? `Dados app: ${formatBytes(appUsedBytes)}`
      : "Dados app: atualizar SQL";
    databaseUsage.title = `Uso do banco Supabase: ${formatBytes(usedBytes)} de ${formatBytes(limitBytes)}`;
    appDatabaseUsage.title = Number.isFinite(appUsedBytes)
      ? "Espaco usado pelas tabelas public.trajetos e public.trajeto_pontos, incluindo indices"
      : "Atualize a funcao get_database_usage no SQL Editor do Supabase para ver o uso das tabelas do app";
  } catch (error) {
    const message = error?.message || "";
    const missingRpc = error?.code === "PGRST202" || message.toLowerCase().includes("get_database_usage");

    databaseUsage.textContent = missingRpc ? "executar SQL" : "indisponivel";
    appDatabaseUsage.textContent = "Dados app: -";
    databaseUsage.title = missingRpc
      ? "Execute a funcao get_database_usage do arquivo supabase.sql no SQL Editor do Supabase."
      : `Nao foi possivel consultar o uso do banco: ${message}`;
    console.warn("Nao foi possivel carregar uso do banco.", error);
  }
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

  const { data, error } = await supabaseClient
    .from("trajetos")
    .select("id, matricula_condutor, cliente, sentido, nome_linha, status, data_hora_inicio, data_hora_fim, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    throw error;
  }

  routes = data || [];
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
  await loadDatabaseUsage();
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

async function validateRoute(route) {
  if (!route) {
    setMessage("Selecione um trajeto para validar.", "error");
    return;
  }

  if (route.status !== "finalizado") {
    setMessage("Somente trajetos aguardando validacao podem ser validados.", "error");
    return;
  }

  try {
    validateSelectedButton.disabled = true;

    const { error } = await supabaseClient
      .from("trajetos")
      .update({ status: "trajeto" })
      .eq("id", route.id)
      .eq("status", "finalizado");

    if (error) {
      throw error;
    }

    setMessage("Trajeto validado com sucesso.", "success");
    await refreshDashboard();
  } catch (error) {
    setMessage(`Erro ao validar trajeto: ${error.message}`, "error");
  } finally {
    validateSelectedButton.disabled = getSelectedRoute()?.status !== "finalizado";
  }
}

async function validateSelectedRoute() {
  await validateRoute(getSelectedRoute());
}

async function deleteRoute(route) {
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

    selectedRouteByLineKey.forEach((routeId, lineKey) => {
      if (routeId === route.id) {
        selectedRouteByLineKey.delete(lineKey);
      }
    });
    saveRouteHistorySelection();
    selectedRouteId = null;
    setMessage("Trajeto excluido pelo painel.", "success");
    await refreshDashboard();
  } catch (error) {
    setMessage(`Erro ao excluir trajeto: ${error.message}`, "error");
  } finally {
    deleteSelectedButton.disabled = !getSelectedRoute();
  }
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
exportKmlButton.addEventListener("click", () => exportSelectedRoute("kml"));
exportOrusButton.addEventListener("click", () => exportSelectedRoute("orus"));
exportJsonButton.addEventListener("click", () => exportSelectedRoute("json"));
exportExcelButton.addEventListener("click", () => exportSelectedRoute("excel"));
fitMapButton.addEventListener("click", () => {
  mapUserAdjustedView = false;
  fitRouteMap();
});
mapSearchButton.addEventListener("click", searchMapPoint);
mapPointSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchMapPoint(event);
  }
});
editMapButton.addEventListener("click", () => setMapEditing(!isEditingMapPoints));
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
deleteSelectedButton.addEventListener("click", deleteSelectedRoute);
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
openHelpQuestionsButton.addEventListener("click", openHelpAdmin);
closeHelpAdminButton.addEventListener("click", closeHelpAdmin);
helpAdminBackdrop.addEventListener("click", closeHelpAdmin);
helpAnswerForm.addEventListener("submit", saveHelpAnswer);
helpQuestionStatusFilter.addEventListener("change", loadPendingHelpQuestions);
deleteHelpQuestionButton.addEventListener("click", deleteSelectedHelpQuestion);
addRequestedLineButton.addEventListener("click", addRequestedLine);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isMapModalOpen) {
    closeMapModal();
  } else if (event.key === "Escape" && isDetailModalOpen) {
    closeDetailModal();
  } else if (event.key === "Escape" && !helpAdminModal.classList.contains("hidden")) {
    closeHelpAdmin();
  }
});

loadRouteHistorySelection();
refreshDashboard();
loadPendingHelpCount();
syncRefreshTimer();
