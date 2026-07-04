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
const totalVisibleRecords = document.querySelector("#totalVisibleRecords");
const totalManualPoints = document.querySelector("#totalManualPoints");
const totalTrackPoints = document.querySelector("#totalTrackPoints");
const routeStorageUsage = document.querySelector("#routeStorageUsage");
const fitMapButton = document.querySelector("#fitMapButton");
const openMapButton = document.querySelector("#openMapButton");
const closeMapButton = document.querySelector("#closeMapButton");
const mapModal = document.querySelector("#mapModal");
const mapModalBackdrop = document.querySelector("#mapModalBackdrop");
const mapModalTitle = document.querySelector("#mapModalTitle");
const exportKmlButton = document.querySelector("#exportKmlButton");
const exportJsonButton = document.querySelector("#exportJsonButton");
const exportExcelButton = document.querySelector("#exportExcelButton");
const mapViewInputs = document.querySelectorAll('input[name="mapView"], input[name="mapViewModal"]');
const panelMessage = document.querySelector("#panelMessage");

let routes = [];
let pointCountByRouteId = new Map();
let selectedRouteId = null;
let refreshTimer = null;
let routeMap = null;
let routeMapLayer = null;
let mapAutoFitting = false;
let mapUserAdjustedView = false;
let renderedMapRouteId = null;
let renderedPointSignature = "";
let currentMapLatLngs = [];
let currentRoutePoints = [];
let isMapModalOpen = false;

function getFilteredRoutes() {
  const driverText = driverFilter.value.trim().toLowerCase();
  const clientValue = clientFilter.value;
  const directionValue = directionFilter.value;
  const lineValue = lineFilter.value;
  const statusValue = statusFilter.value;

  return routes.filter((route) => {
    const matchesDriver = route.matricula_condutor.toLowerCase().includes(driverText);
    const matchesClient = !clientValue || route.cliente === clientValue;
    const matchesDirection = !directionValue || route.sentido === directionValue;
    const matchesLine = !lineValue || route.nome_linha === lineValue;
    const matchesStatus = !statusValue || route.status === statusValue;

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
  fillFilterSelect(
    clientFilter,
    "Todos os clientes",
    uniqueSorted(routes.map((route) => route.cliente))
  );

  fillFilterSelect(
    lineFilter,
    "Todas as linhas",
    uniqueSorted(routes.map((route) => route.nome_linha))
  );
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
  const trackPoints = points.filter((point) => point.tipo_ponto === "trajeto");
  return trackPoints.length > 0 ? trackPoints : points;
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

function buildJsonExport(route, points) {
  const trackPoints = getRouteTrackPoints(points);
  const stopPoints = getRouteStopPoints(points);

  return JSON.stringify(
    {
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
    { name: "Trajeto", rows: trackRows },
    { name: "Pontos", rows: stopRows },
  ]);
}

function exportSelectedRoute(format) {
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
  isMapModalOpen = false;
  mapModal.classList.add("hidden");
  document.body.classList.remove("modal-open");
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
  const pointSignature = getPointSignature(validPoints);
  const routeChanged = renderedMapRouteId !== selectedRouteId;
  const pointsChanged = renderedPointSignature !== pointSignature;

  if (validPoints.length === 0) {
    mapStatus.textContent = "Sem pontos para exibir";
    fitMapButton.disabled = true;
    currentMapLatLngs = [];

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

  if (routeChanged) {
    mapUserAdjustedView = false;
  }

  if (isMapModalOpen && (routeChanged || (!mapUserAdjustedView && pointsChanged))) {
    fitRouteMap();
    setTimeout(fitRouteMap, 150);
  }

  renderedMapRouteId = selectedRouteId;
  renderedPointSignature = pointSignature;
  mapStatus.textContent = `${validPoints.length} ${getMapViewLabel()} no mapa`;
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
  currentRoutePoints = points;
  const visiblePoints = route ? filterPointsByView(points) : [];
  const manualPointCount = route ? points.filter(isManualPoint).length : 0;
  const trackPointCount = route
    ? points.filter((point) => point.tipo_ponto === "trajeto").length
    : 0;

  selectedRouteTitle.textContent = route ? route.cliente : "Selecione um trajeto";
  mapModalTitle.textContent = route ? `Mapa - ${route.cliente}` : "Mapa do trajeto";
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
  selectedPointCount.textContent = route ? `${visiblePoints.length}/${points.length}` : "0";
  totalVisibleRecords.textContent = String(visiblePoints.length);
  totalManualPoints.textContent = String(manualPointCount);
  totalTrackPoints.textContent = String(trackPointCount);
  routeStorageUsage.textContent = `${formatBytes(estimateRouteStorage(route, points))} armazenado`;
  routeStorageUsage.title = route
    ? "Estimativa do espaco ocupado pelo trajeto selecionado e seus pontos carregados"
    : "Selecione um trajeto para ver o espaco estimado";
  finishSelectedButton.disabled = !route || route.status !== "em_andamento";
  deleteSelectedButton.disabled = !route;
  openMapButton.disabled = !route || visiblePoints.length === 0;
  exportKmlButton.disabled = !route || points.length === 0;
  exportJsonButton.disabled = !route || points.length === 0;
  exportExcelButton.disabled = !route || points.length === 0;
  renderRouteMap(visiblePoints);

  if (!route) {
    pointsTable.innerHTML =
      '<tr><td colspan="6" class="empty-cell">Nenhum trajeto selecionado.</td></tr>';
    return;
  }

  if (visiblePoints.length === 0) {
    pointsTable.innerHTML =
      '<tr><td colspan="6" class="empty-cell">Nenhum registro para esta visualizacao.</td></tr>';
    return;
  }

  const latestPointId = visiblePoints[visiblePoints.length - 1].id;

  pointsTable.innerHTML = visiblePoints
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

  const { data, error } = await supabaseClient
    .from("trajetos")
    .select("id, matricula_condutor, cliente, sentido, nome_linha, status, data_hora_inicio, data_hora_fim, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  routes = data || [];
  populateListBoxFilters();
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
openMapButton.addEventListener("click", openMapModal);
closeMapButton.addEventListener("click", closeMapModal);
mapModalBackdrop.addEventListener("click", closeMapModal);
exportKmlButton.addEventListener("click", () => exportSelectedRoute("kml"));
exportJsonButton.addEventListener("click", () => exportSelectedRoute("json"));
exportExcelButton.addEventListener("click", () => exportSelectedRoute("excel"));
fitMapButton.addEventListener("click", () => {
  mapUserAdjustedView = false;
  fitRouteMap();
});
mapViewInputs.forEach((input) => {
  input.addEventListener("change", () => {
    syncMapViewInputs(input.value);
    mapUserAdjustedView = false;
    renderRouteDetails(getSelectedRoute(), currentRoutePoints);
  });
});
finishSelectedButton.addEventListener("click", finishSelectedRoute);
deleteSelectedButton.addEventListener("click", deleteSelectedRoute);
autoRefreshToggle.addEventListener("change", syncRefreshTimer);
driverFilter.addEventListener("input", renderRouteList);
clientFilter.addEventListener("change", renderRouteList);
directionFilter.addEventListener("change", renderRouteList);
lineFilter.addEventListener("change", renderRouteList);
statusFilter.addEventListener("change", renderRouteList);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isMapModalOpen) {
    closeMapModal();
  }
});

refreshDashboard();
syncRefreshTimer();
