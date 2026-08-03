const SUPABASE_URL = "https://tytiezeamgwmqrrygoia.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gP0qRTSoUiO8-yMq8dgWEQ_1E3MTt7p";
const ROUTER_URL = "https://router.project-osrm.org/route/v1/driving";
const WALKING_ROUTER_URL = "https://routing.openstreetmap.de/routed-foot/route/v1/driving";
const COLORS = ["#116149", "#1264c8", "#d97706", "#7c3aed", "#be123c", "#0e7490", "#4d7c0f", "#c2410c"];
const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const clientFilter = document.querySelector("#clientFilter");
const directionFilter = document.querySelector("#directionFilter");
const overviewSearch = document.querySelector("#overviewSearch");
const overviewSearchButton = document.querySelector("#overviewSearchButton");
const overviewRmcOnly = document.querySelector("#overviewRmcOnly");
const toggleRouteEditingButton = document.querySelector("#toggleRouteEditingButton");
const pageStatus = document.querySelector("#pageStatus");
const overviewAccessInfo = document.querySelector("#overviewAccessInfo");
const visibleLineCount = document.querySelector("#visibleLineCount");
const lineList = document.querySelector("#lineList");
const showAllButton = document.querySelector("#showAllButton");
const hideAllButton = document.querySelector("#hideAllButton");
const routeEditor = document.querySelector("#routeEditor");
const editorTitle = document.querySelector("#editorTitle");
const editorStatus = document.querySelector("#editorStatus");
const closeEditorButton = document.querySelector("#closeEditorButton");
const officializeButton = document.querySelector("#officializeButton");
const clearNodesButton = document.querySelector("#clearNodesButton");
const addManualPointButton = document.querySelector("#addManualPointButton");
const locationSearch = document.querySelector("#locationSearch");
const searchButton = document.querySelector("#searchButton");
const editorRmcOnly = document.querySelector("#editorRmcOnly");
const averageSpeed = document.querySelector("#averageSpeed");
const officialMetrics = document.querySelector("#officialMetrics");
const studyMetrics = document.querySelector("#studyMetrics");
const studyPointList = document.querySelector("#studyPointList");
const versionOperator = document.querySelector("#versionOperator");
const versionReason = document.querySelector("#versionReason");
const versionHistory = document.querySelector("#versionHistory");
const accessRouteInfo = document.querySelector("#accessRouteInfo");

let routes = [];
let clientRoutes = [];
let pointsByRoute = new Map();
let overviewMap;
let overviewLayer;
let editorMap;
let editorLayer;
let editorRoute = null;
let editorPoints = [];
let editorOfficialPoints = [];
let editorGeometry = [];
let editorOfficialGeometry = [];
let editorNodes = [];
let removedStudyPoints = [];
let accessRouteGeometry = [];
let accessRouteDistanceMeters = 0;
let accessRouteNearestPoint = null;
let accessSearchResult = null;
let editorDirty = false;
let searchMarker = null;
let overviewSearchMarker = null;
let overviewSearchResult = null;
let overviewAccessGeometry = [];
let overviewAccessDistanceMeters = 0;
let overviewAccessSelection = null;
let isAddingManualPoint = false;
let overviewEditingEnabled = false;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[char]));
}

function naturalCompare(a, b) {
  return String(a || "").localeCompare(String(b || ""), "pt-BR", { numeric: true, sensitivity: "base" });
}

function normalizedText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatPointDateTime(value) {
  if (!value) return "Horário não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function buildGeocodingUrl(query, restrictToRmc) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("q", query);
  if (restrictToRmc) {
    url.searchParams.set("viewbox", "-47.55,-22.55,-46.70,-23.35");
    url.searchParams.set("bounded", "1");
  }
  return url.toString();
}

function orderedPoints(points) {
  return [...points]
    .filter((point) => Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude)))
    .sort((a, b) => Number(a.ordem_ponto) - Number(b.ordem_ponto));
}

function routeGeometry(route) {
  const geometry = route?.geometria_validada;
  if (Array.isArray(geometry)) {
    return geometry
      .map((item) => Array.isArray(item) ? [Number(item[0]), Number(item[1])] : [Number(item.lat), Number(item.lng)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  }
  if (geometry?.type === "LineString" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates.map(([lng, lat]) => [Number(lat), Number(lng)]);
  }
  return [];
}

function ensureMaps() {
  if (!overviewMap) {
    overviewMap = L.map("overviewMap", { scrollWheelZoom: true }).setView([-22.9, -47.05], 11);
    const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap",
    }).addTo(overviewMap);
    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}.png",
      { maxZoom: 19, attribution: "Tiles &copy; Esri" }
    );
    L.control.layers({ Ruas: streets, Satelite: satellite }, null, { collapsed: false }).addTo(overviewMap);
    overviewLayer = L.layerGroup().addTo(overviewMap);
  }
  if (!editorMap) {
    editorMap = L.map("editorMap", { scrollWheelZoom: true }).setView([-22.9, -47.05], 11);
    const streets = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap",
    }).addTo(editorMap);
    const satellite = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}.png",
      { maxZoom: 19, attribution: "Tiles &copy; Esri" }
    );
    L.control.layers({ Ruas: streets, Satelite: satellite }, null, { collapsed: false }).addTo(editorMap);
    editorLayer = L.layerGroup().addTo(editorMap);
    editorMap.on("click", handleEditorMapClick);
  }
}

async function fetchAllPoints(routeIds) {
  const result = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db.from("trajeto_pontos")
      .select("id,trajeto_id,latitude,longitude,ordem_ponto,tipo_ponto,data_hora_registro,precisao")
      .in("trajeto_id", routeIds)
      .order("trajeto_id")
      .order("ordem_ponto")
      .range(start, start + 999);
    if (error) throw error;
    result.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return result;
}

async function loadRoutes() {
  const { data, error } = await db.from("trajetos")
    .select("id,cliente,sentido,nome_linha,status,created_at,geometria_validada,nos_validacao")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  routes = data || [];
  const clients = [...new Set(routes.map((route) => route.cliente).filter(Boolean))].sort(naturalCompare);
  clientFilter.innerHTML = '<option value="">Selecione um cliente</option>' +
    clients.map((client) => `<option value="${escapeHtml(client)}">${escapeHtml(client)}</option>`).join("");
  pageStatus.textContent = `${clients.length} clientes disponíveis. Selecione um cliente.`;
}

function latestRoutesForClient(client, direction = "") {
  const latest = new Map();
  routes.filter((route) =>
    route.cliente === client &&
    (!direction || normalizedText(route.sentido) === normalizedText(direction))
  ).forEach((route) => {
    const key = `${route.sentido || ""}::${route.nome_linha || ""}`;
    if (!latest.has(key)) latest.set(key, route);
  });
  return [...latest.values()].sort((a, b) => naturalCompare(a.nome_linha, b.nome_linha));
}

async function selectClient() {
  const client = clientFilter.value;
  clientRoutes = client ? latestRoutesForClient(client, directionFilter.value) : [];
  pointsByRoute = new Map();
  overviewAccessGeometry = [];
  overviewAccessSelection = null;
  overviewLayer.clearLayers();
  if (!client) {
    lineList.innerHTML = '<p class="empty">Selecione um cliente.</p>';
    pageStatus.textContent = "Selecione um cliente para visualizar as linhas.";
    return;
  }
  if (!clientRoutes.length) {
    lineList.innerHTML = '<p class="empty">Nenhuma linha encontrada.</p>';
    return;
  }
  pageStatus.textContent = "Carregando todos os pontos e itinerários...";
  try {
    const points = await fetchAllPoints(clientRoutes.map((route) => route.id));
    points.forEach((point) => {
      const key = String(point.trajeto_id);
      if (!pointsByRoute.has(key)) pointsByRoute.set(key, []);
      pointsByRoute.get(key).push(point);
    });
    renderLineList();
    if (overviewSearchResult) await calculateOverviewAccessRoute();
    else drawOverview();
  } catch (error) {
    pageStatus.textContent = `Erro ao carregar: ${error.message}`;
  }
}

async function searchOverviewLocation() {
  const query = overviewSearch.value.trim();
  if (!query) return;
  overviewSearchButton.disabled = true;
  pageStatus.textContent = "Buscando endereço...";
  try {
    let latitude;
    let longitude;
    let label = query;
    const coordinates = query.split(",").map((value) => Number(value.trim()));
    if (coordinates.length === 2 && coordinates.every(Number.isFinite)) {
      [latitude, longitude] = coordinates;
      label = `${latitude}, ${longitude}`;
    } else {
      const response = await fetch(
        buildGeocodingUrl(query, overviewRmcOnly.checked),
        { headers: { "Accept-Language": "pt-BR" } }
      );
      if (!response.ok) throw new Error("serviço de busca indisponível");
      const result = (await response.json())?.[0];
      if (!result) throw new Error("endereço não encontrado");
      latitude = Number(result.lat);
      longitude = Number(result.lon);
      label = result.display_name || query;
    }
    if (overviewSearchMarker) overviewMap.removeLayer(overviewSearchMarker);
    overviewSearchMarker = L.marker([latitude, longitude], { title: label })
      .addTo(overviewMap)
      .bindPopup(`<strong>Local encontrado</strong><br>${escapeHtml(label)}`)
      .openPopup();
    overviewSearchResult = {
      lat: latitude,
      lng: longitude,
      label,
      query,
    };
    overviewMap.setView([latitude, longitude], 17);
    pageStatus.textContent = `Local encontrado: ${label}`;
    await calculateOverviewAccessRoute();
  } catch (error) {
    pageStatus.textContent = `Erro na busca: ${error.message}`;
  } finally {
    overviewSearchButton.disabled = false;
  }
}

function renderLineList() {
  lineList.innerHTML = clientRoutes.map((route, index) => {
    const color = COLORS[index % COLORS.length];
    const count = pointsByRoute.get(String(route.id))?.length || 0;
    return `<article class="line-card" style="--route-color:${color}">
      <label class="line-toggle">
        <input type="checkbox" data-toggle="${escapeHtml(route.id)}" checked />
        <span><strong>${escapeHtml(route.nome_linha || "Linha sem nome")}</strong>
        <small>${escapeHtml(route.sentido || "-")} · ${count} pontos · ${escapeHtml(route.status || "-")}</small></span>
      </label>
      <button class="button secondary" data-edit="${escapeHtml(route.id)}" type="button"
        ${overviewEditingEnabled ? "" : "disabled"}>
        Novo estudo
      </button>
    </article>`;
  }).join("");
  lineList.querySelectorAll("[data-toggle]").forEach((input) =>
    input.addEventListener("change", refreshOverviewAccess)
  );
  lineList.querySelectorAll("[data-edit]").forEach((button) =>
    button.addEventListener("click", () => openEditor(button.dataset.edit))
  );
}

function drawOverview() {
  overviewLayer.clearLayers();
  const bounds = [];
  let visible = 0;
  clientRoutes.forEach((route, index) => {
    const toggle = lineList.querySelector(`[data-toggle="${route.id}"]`);
    if (!toggle?.checked) return;
    visible += 1;
    const color = COLORS[index % COLORS.length];
    const points = orderedPoints(pointsByRoute.get(String(route.id)) || []);
    const geometry = routeGeometry(route);
    const line = geometry.length > 1 ? geometry : points.map((point) => [point.latitude, point.longitude]);
    if (line.length > 1) {
      const routeLine = L.polyline(line, {
        color,
        weight: overviewEditingEnabled ? 7 : 5,
        opacity: .88,
        className: overviewEditingEnabled ? "selectable-route-line" : "",
      })
        .bindTooltip(
          `${route.nome_linha} · ${route.sentido}` +
          (overviewEditingEnabled ? "<br>Clique para editar esta rota" : ""),
          { sticky: true }
        )
        .addTo(overviewLayer);
      if (overviewEditingEnabled) {
        routeLine.on("click", (event) => {
          if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent);
          openEditor(route.id);
        });
      }
      bounds.push(...line);
    }
    points.forEach((point) => {
      const manual = ["primeiro", "manual"].includes(point.tipo_ponto);
      L.circleMarker([point.latitude, point.longitude], {
        radius: manual ? 5 : 2, color: manual ? "#fff" : color, weight: manual ? 2 : 1,
        fillColor: manual ? "#1264c8" : color, fillOpacity: manual ? 1 : .55,
      }).bindTooltip(
        `${route.nome_linha} · ponto ${point.ordem_ponto}<br>` +
        `Latitude: ${Number(point.latitude).toFixed(6)}<br>` +
        `Longitude: ${Number(point.longitude).toFixed(6)}<br>` +
        `Horário: ${formatPointDateTime(point.data_hora_registro)}`
      ).addTo(overviewLayer);
      bounds.push([point.latitude, point.longitude]);
    });
  });
  if (overviewAccessGeometry.length > 1 && overviewAccessSelection) {
    L.polyline(overviewAccessGeometry, {
      color: "#ea8500",
      weight: 6,
      opacity: .95,
      dashArray: "10 7",
    }).bindTooltip(
      `Acesso a pé até ${overviewAccessSelection.route.nome_linha}: ` +
      `${(overviewAccessDistanceMeters / 1000).toFixed(2)} km`
    ).addTo(overviewLayer);
    bounds.push(...overviewAccessGeometry);
  }
  visibleLineCount.textContent = `${visible} de ${clientRoutes.length} linhas`;
  pageStatus.textContent = `${visible} linhas exibidas para ${clientFilter.value}.`;
  const fittingBounds = overviewAccessGeometry.length > 1
    ? overviewAccessGeometry
    : bounds;
  if (fittingBounds.length) {
    overviewMap.fitBounds(fittingBounds, { padding: [35, 35], maxZoom: 16 });
  }
}

async function calculateOverviewAccessRoute() {
  if (!overviewSearchResult) {
    overviewAccessGeometry = [];
    overviewAccessSelection = null;
    overviewAccessInfo.classList.add("hidden");
    drawOverview();
    return;
  }
  const visibleRoutes = clientRoutes.filter((route) =>
    lineList.querySelector(`[data-toggle="${route.id}"]`)?.checked
  );
  const candidates = [];
  visibleRoutes.forEach((route) => {
    const allPoints = orderedPoints(pointsByRoute.get(String(route.id)) || []);
    const boarding = allPoints.filter((point) => ["primeiro", "manual"].includes(point.tipo_ponto));
    (boarding.length ? boarding : allPoints).forEach((point) => {
      candidates.push({ route, point });
    });
  });
  if (!candidates.length) {
    overviewAccessGeometry = [];
    overviewAccessSelection = null;
    overviewAccessInfo.classList.remove("hidden");
    overviewAccessInfo.textContent = "Marque pelo menos uma linha com pontos para calcular o acesso.";
    drawOverview();
    return;
  }
  overviewAccessSelection = candidates.reduce((closest, candidate) => {
    const directDistance = distanceMeters(
      [overviewSearchResult.lat, overviewSearchResult.lng],
      [Number(candidate.point.latitude), Number(candidate.point.longitude)]
    );
    return !closest || directDistance < closest.directDistance
      ? { ...candidate, directDistance }
      : closest;
  }, null);
  overviewAccessInfo.classList.remove("hidden");
  overviewAccessInfo.textContent = "Calculando o trajeto a pé até o ponto mais próximo das linhas visíveis...";
  const { route, point } = overviewAccessSelection;
  const coordinates =
    `${overviewSearchResult.lng},${overviewSearchResult.lat};` +
    `${point.longitude},${point.latitude}`;
  try {
    const response = await fetch(
      `${WALKING_ROUTER_URL}/${coordinates}?overview=full&geometries=geojson`
    );
    if (!response.ok) throw new Error("serviço de roteirização indisponível");
    const access = (await response.json()).routes?.[0];
    if (!access?.geometry?.coordinates?.length) throw new Error("trajeto de acesso não encontrado");
    overviewAccessGeometry = access.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    overviewAccessDistanceMeters = Number(access.distance) || 0;
    overviewAccessInfo.innerHTML =
      `Trajeto a pé do endereço até o ponto mais próximo das linhas visíveis: ` +
      `<strong>${(overviewAccessDistanceMeters / 1000).toFixed(2)} km</strong> · ` +
      `Linha ${escapeHtml(route.nome_linha || "-")} · ${escapeHtml(route.sentido || "-")} · ` +
      `Ponto ${escapeHtml(point.ordem_ponto || "-")} · ` +
      `${Number(point.latitude).toFixed(6)}, ${Number(point.longitude).toFixed(6)}`;
    drawOverview();
  } catch (error) {
    overviewAccessGeometry = [];
    overviewAccessDistanceMeters = 0;
    overviewAccessInfo.textContent = `Não foi possível calcular o acesso: ${error.message}`;
    drawOverview();
  }
}

function refreshOverviewAccess() {
  if (overviewSearchResult) calculateOverviewAccessRoute();
  else drawOverview();
}

function setOverviewEditing(enabled) {
  overviewEditingEnabled = enabled;
  toggleRouteEditingButton.classList.toggle("active", enabled);
  toggleRouteEditingButton.textContent = enabled
    ? "Desabilitar edição de rota"
    : "Habilitar edição de rota";
  lineList.querySelectorAll("[data-edit]").forEach((button) => {
    button.disabled = !enabled;
  });
  pageStatus.textContent = enabled
    ? "Edição habilitada: clique em qualquer rota visível ou use o botão Novo estudo."
    : "Edição desabilitada. As rotas estão somente para visualização.";
  drawOverview();
}

function closestGeometryIndex(position, geometry = editorGeometry) {
  let best = 0;
  let distance = Infinity;
  geometry.forEach(([lat, lng], index) => {
    const current = Math.hypot(Number(position.lat) - lat, Number(position.lng) - lng);
    if (current < distance) { distance = current; best = index; }
  });
  return best;
}

function editorControls() {
  const points = orderedPoints(editorPoints);
  if (points.length < 2) return [];
  const controls = [
    { lat: Number(points[0].latitude), lng: Number(points[0].longitude), index: 0 },
    ...points.filter((point) => point.tipo_ponto === "manual").map((point) => ({
      lat: Number(point.latitude), lng: Number(point.longitude),
      index: closestGeometryIndex({ lat: point.latitude, lng: point.longitude }),
    })),
    ...editorNodes.map((node) => ({ ...node, index: closestGeometryIndex(node) })),
    {
      lat: Number(points[points.length - 1].latitude),
      lng: Number(points[points.length - 1].longitude),
      index: Math.max(0, editorGeometry.length - 1),
    },
  ];
  return controls.sort((a, b) => a.index - b.index)
    .filter((item, index, array) => index === 0 ||
      Math.hypot(item.lat - array[index - 1].lat, item.lng - array[index - 1].lng) > .000001);
}

function segmentBounds(geometryIndex, ignoredNodeId = null) {
  const anchors = [
    ...editorPoints.filter((point) => ["primeiro", "manual"].includes(point.tipo_ponto)).map((point) => ({
      id: `point-${point.id}`,
      index: closestGeometryIndex({ lat: point.latitude, lng: point.longitude }),
      coordinate: [Number(point.latitude), Number(point.longitude)],
    })),
    ...editorNodes.filter((node) => node.id !== ignoredNodeId).map((node) => ({
      id: node.id,
      index: closestGeometryIndex(node),
      coordinate: [node.lat, node.lng],
    })),
  ].sort((a, b) => a.index - b.index);
  const previous = [...anchors].reverse().find((anchor) => anchor.index < geometryIndex);
  const next = anchors.find((anchor) => anchor.index > geometryIndex);
  const startIndex = previous?.index ?? 0;
  const endIndex = next?.index ?? editorGeometry.length - 1;
  return {
    startIndex,
    endIndex,
    startCoordinate: previous?.coordinate ?? editorGeometry[startIndex],
    endCoordinate: next?.coordinate ?? editorGeometry[endIndex],
  };
}

async function reshapeAt(position, sourceIndex, existingNode = null) {
  const previousGeometry = editorGeometry.map((coordinate) => [...coordinate]);
  const bounds = segmentBounds(sourceIndex, existingNode?.id);
  const routedSegment = await routeThrough([
    { lat: bounds.startCoordinate[0], lng: bounds.startCoordinate[1] },
    { lat: position.lat, lng: position.lng },
    { lat: bounds.endCoordinate[0], lng: bounds.endCoordinate[1] },
  ]);
  editorGeometry = [
    ...previousGeometry.slice(0, bounds.startIndex),
    ...routedSegment,
    ...previousGeometry.slice(bounds.endIndex + 1),
  ];
  const node = existingNode || {
    id: crypto.randomUUID(),
    lat: position.lat,
    lng: position.lng,
    index: bounds.startIndex,
  };
  node.lat = position.lat;
  node.lng = position.lng;
  if (!existingNode) editorNodes.push(node);
  editorNodes.forEach((item) => { item.index = closestGeometryIndex(item); });
  editorNodes.sort((a, b) => a.index - b.index);
  editorDirty = true;
  officializeButton.disabled = false;
}

async function removeEditorNode(node) {
  const previousGeometry = editorGeometry.map((coordinate) => [...coordinate]);
  const bounds = segmentBounds(node.index, node.id);
  const routedSegment = await routeThrough([
    { lat: bounds.startCoordinate[0], lng: bounds.startCoordinate[1] },
    { lat: bounds.endCoordinate[0], lng: bounds.endCoordinate[1] },
  ]);
  editorNodes = editorNodes.filter((item) => item.id !== node.id);
  editorGeometry = [
    ...previousGeometry.slice(0, bounds.startIndex),
    ...routedSegment,
    ...previousGeometry.slice(bounds.endIndex + 1),
  ];
  editorNodes.forEach((item) => { item.index = closestGeometryIndex(item); });
  editorDirty = true;
  officializeButton.disabled = false;
}

function enableLineDragging(line) {
  line.on("mousedown", (event) => {
    if (isAddingManualPoint) return;
    if (event.originalEvent?.button !== undefined && event.originalEvent.button !== 0) return;
    L.DomEvent.stop(event.originalEvent);
    const sourceIndex = closestGeometryIndex(event.latlng);
    const preview = L.circleMarker(event.latlng, {
      radius: 7, color: "#2563eb", fillColor: "#fff", fillOpacity: 1, weight: 3, interactive: false,
    }).addTo(editorLayer);
    editorMap.dragging.disable();
    editorStatus.textContent = "Arraste a linha até a rua desejada e solte.";
    const move = (moveEvent) => preview.setLatLng(moveEvent.latlng);
    const finish = async (upEvent) => {
      editorMap.off("mousemove", move);
      editorMap.off("mouseup", finish);
      document.removeEventListener("mouseup", documentFinish);
      editorMap.dragging.enable();
      const destination = upEvent?.latlng || preview.getLatLng();
      editorStatus.textContent = "Recalculando somente o trecho puxado...";
      try {
        await reshapeAt(destination, sourceIndex);
        editorStatus.textContent = "Trecho ajustado. A rota fora das travas permaneceu inalterada.";
      } catch (error) {
        editorStatus.textContent = `Erro ao recalcular: ${error.message}`;
      }
      renderEditor();
    };
    const documentFinish = () => finish({ latlng: preview.getLatLng() });
    editorMap.on("mousemove", move);
    editorMap.on("mouseup", finish);
    document.addEventListener("mouseup", documentFinish, { once: true });
  });
}

async function routeThrough(controls) {
  if (controls.length < 2) return controls.map((item) => [item.lat, item.lng]);
  const complete = [];
  for (let start = 0; start < controls.length - 1; start += 20) {
    const chunk = controls.slice(start, Math.min(start + 21, controls.length));
    const coordinates = chunk.map((item) => `${item.lng},${item.lat}`).join(";");
    const response = await fetch(`${ROUTER_URL}/${coordinates}?overview=full&geometries=geojson`);
    if (!response.ok) throw new Error("serviço de roteirização indisponível");
    const payload = await response.json();
    const segment = payload.routes?.[0]?.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];
    if (complete.length && segment.length) segment.shift();
    complete.push(...segment);
  }
  if (complete.length < 2) throw new Error("não foi possível calcular a rota pelas ruas");
  return complete;
}

async function recalculateEditor() {
  editorStatus.textContent = "Calculando a rota pelas ruas...";
  editorGeometry = await routeThrough(editorControls());
  editorNodes = editorNodes.map((node) => ({ ...node, index: closestGeometryIndex(node) }));
  editorDirty = true;
  officializeButton.disabled = false;
  editorStatus.textContent = "Prévia alterada. Oficialize para salvar somente esta linha.";
  renderEditor();
}

function markerIcon(className) {
  return L.divIcon({ className: "", html: `<span class="${className}"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] });
}

function deletePopup(onDelete, label) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "popup-danger";
  button.textContent = label;
  button.addEventListener("click", onDelete);
  return button;
}

function pointPopup(point, allowDelete) {
  const container = document.createElement("div");
  const details = document.createElement("p");
  const scheduled = editorRoute
    ? calculateMetrics(editorPoints, editorGeometry).schedule
      .find((item) => String(item.id) === String(point.id))
    : null;
  details.innerHTML =
    `<strong>Ponto ${escapeHtml(point.ordem_ponto || "-")}</strong><br>` +
    `Latitude: ${Number(point.latitude).toFixed(6)}<br>` +
    `Longitude: ${Number(point.longitude).toFixed(6)}<br>` +
    `Horário calculado: ${escapeHtml(scheduled?.calculatedTime || formatPointDateTime(point.data_hora_registro))}`;
  container.appendChild(details);
  if (allowDelete) {
    container.appendChild(deletePopup(() => deleteManualPoint(point), "Excluir ponto manual"));
  }
  return container;
}

function renderEditor() {
  editorLayer.clearLayers();
  if (editorOfficialGeometry.length > 1) {
    L.polyline(editorOfficialGeometry, {
      color: "#64748b",
      weight: 5,
      opacity: .62,
      dashArray: "8 8",
      className: "official-reference-line",
    }).bindTooltip("Versão oficial atual").addTo(editorLayer);
  }
  if (editorGeometry.length > 1) {
    const line = L.polyline(editorGeometry, {
      color: "#116149", weight: 7, opacity: .92, className: "official-layer-line",
    }).addTo(editorLayer);
    enableLineDragging(line);
  }
  if (accessRouteGeometry.length > 1) {
    L.polyline(accessRouteGeometry, {
      color: "#ea8500",
      weight: 6,
      opacity: .95,
      dashArray: "10 7",
    }).bindTooltip(
      `Acesso a pé até o ponto mais próximo: ${(accessRouteDistanceMeters / 1000).toFixed(2)} km`
    ).addTo(editorLayer);
  }
  editorPoints.filter((point) => ["primeiro", "manual"].includes(point.tipo_ponto)).forEach((point) => {
    const isNewStudyPoint = String(point.id).startsWith("study-");
    const marker = L.marker([point.latitude, point.longitude], {
      draggable: point.tipo_ponto === "manual",
      icon: markerIcon(`route-stop${isNewStudyPoint ? " new-point" : ""}`),
    }).addTo(editorLayer);
    marker.bindPopup(pointPopup(point, point.tipo_ponto === "manual"));
    if (point.tipo_ponto === "manual") {
      marker.on("dragend", async () => {
        const position = marker.getLatLng();
        point.latitude = position.lat; point.longitude = position.lng;
        await recalculateEditor();
      });
    }
  });
  removedStudyPoints.forEach((point) => {
    L.circleMarker([point.latitude, point.longitude], {
      radius: 7,
      color: "#fff",
      weight: 2,
      fillColor: "#dc2626",
      fillOpacity: 1,
    }).bindTooltip("Ponto removido no estudo").addTo(editorLayer);
  });
  editorNodes.forEach((node) => {
    const marker = L.marker([node.lat, node.lng], { draggable: true, icon: markerIcon("route-node") }).addTo(editorLayer);
    marker.bindPopup(deletePopup(async () => {
      editorStatus.textContent = "Removendo o nó e recalculando somente o trecho...";
      try {
        await removeEditorNode(node);
        editorStatus.textContent = "Nó removido. Oficialize para salvar.";
        renderEditor();
      } catch (error) {
        editorStatus.textContent = `Erro ao remover o nó: ${error.message}`;
      }
    }, "Excluir nó"));
    marker.on("dragend", async () => {
      const position = marker.getLatLng();
      editorStatus.textContent = "Recalculando somente o trecho entre as travas...";
      try {
        await reshapeAt(position, node.index, node);
        editorStatus.textContent = "Prévia atualizada. Oficialize para salvar.";
        renderEditor();
      } catch (error) {
        editorStatus.textContent = `Erro ao mover o nó: ${error.message}`;
      }
    });
  });
  renderStudyComparison();
}

async function calculateAccessRoute() {
  if (!editorRoute || !accessSearchResult) {
    accessRouteGeometry = [];
    accessRouteDistanceMeters = 0;
    accessRouteNearestPoint = null;
    accessRouteInfo.classList.add("hidden");
    return;
  }
  const boardingPoints = orderedPoints(editorPoints)
    .filter((point) => ["primeiro", "manual"].includes(point.tipo_ponto));
  const candidates = boardingPoints.length ? boardingPoints : orderedPoints(editorPoints);
  if (!candidates.length) return;
  accessRouteNearestPoint = candidates.reduce((closest, point) => {
    const currentDistance = distanceMeters(
      [accessSearchResult.lat, accessSearchResult.lng],
      [Number(point.latitude), Number(point.longitude)]
    );
    return !closest || currentDistance < closest.distance
      ? { point, distance: currentDistance }
      : closest;
  }, null)?.point;
  if (!accessRouteNearestPoint) return;

  accessRouteInfo.classList.remove("hidden");
  accessRouteInfo.textContent = "Calculando o trajeto a pé até o ponto mais próximo...";
  const coordinates =
    `${accessSearchResult.lng},${accessSearchResult.lat};` +
    `${accessRouteNearestPoint.longitude},${accessRouteNearestPoint.latitude}`;
  try {
    const response = await fetch(
      `${WALKING_ROUTER_URL}/${coordinates}?overview=full&geometries=geojson`
    );
    if (!response.ok) throw new Error("serviço de roteirização indisponível");
    const route = (await response.json()).routes?.[0];
    if (!route?.geometry?.coordinates?.length) throw new Error("trajeto de acesso não encontrado");
    accessRouteGeometry = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    accessRouteDistanceMeters = Number(route.distance) || 0;
    accessRouteInfo.innerHTML =
      `Trajeto a pé do endereço pesquisado até o ponto mais próximo: ` +
      `<strong>${(accessRouteDistanceMeters / 1000).toFixed(2)} km</strong> · ` +
      `Ponto ${escapeHtml(accessRouteNearestPoint.ordem_ponto || "-")} · ` +
      `${Number(accessRouteNearestPoint.latitude).toFixed(6)}, ` +
      `${Number(accessRouteNearestPoint.longitude).toFixed(6)}`;
    renderEditor();
    const bounds = [...editorGeometry, ...accessRouteGeometry];
    if (bounds.length) editorMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
  } catch (error) {
    accessRouteGeometry = [];
    accessRouteDistanceMeters = 0;
    accessRouteInfo.textContent = `Não foi possível calcular o acesso pelas ruas: ${error.message}`;
  }
}

function showEditorSearchResult(latitude, longitude, label) {
  accessSearchResult = { lat: Number(latitude), lng: Number(longitude), label };
  if (searchMarker) editorMap.removeLayer(searchMarker);
  const popup = document.createElement("div");
  const description = document.createElement("p");
  description.innerHTML =
    `<strong>Local pesquisado</strong><br>${escapeHtml(label || `${latitude}, ${longitude}`)}<br>` +
    `Latitude: ${Number(latitude).toFixed(6)}<br>` +
    `Longitude: ${Number(longitude).toFixed(6)}`;
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "button secondary";
  addButton.textContent = "Adicionar ponto manual aqui";
  addButton.addEventListener("click", async () => {
    editorStatus.textContent = "Incluindo ponto manual...";
    try {
      await addManualPoint({ lat: latitude, lng: longitude });
      if (searchMarker) editorMap.removeLayer(searchMarker);
      searchMarker = null;
    } catch (error) {
      editorStatus.textContent = `Erro: ${error.message}`;
    }
  });
  popup.append(description, addButton);
  searchMarker = L.marker([latitude, longitude], { title: label || "Local pesquisado" })
    .addTo(editorMap)
    .bindPopup(popup);
}

async function openEditor(routeId) {
  editorRoute = clientRoutes.find((route) => String(route.id) === String(routeId));
  if (!editorRoute) return;
  editorOfficialPoints = orderedPoints(pointsByRoute.get(String(routeId)) || [])
    .map((point) => ({ ...point }));
  editorPoints = editorOfficialPoints.map((point) => ({ ...point }));
  editorGeometry = routeGeometry(editorRoute);
  if (editorGeometry.length < 2) {
    editorGeometry = editorPoints.map((point) => [Number(point.latitude), Number(point.longitude)]);
  }
  editorOfficialGeometry = editorGeometry.map((coordinate) => [...coordinate]);
  accessRouteGeometry = [];
  accessRouteDistanceMeters = 0;
  accessRouteNearestPoint = null;
  accessSearchResult = null;
  accessRouteInfo.classList.add("hidden");
  const baselineMetrics = calculateMetrics(
    editorOfficialPoints,
    editorOfficialGeometry,
    { official: true }
  );
  averageSpeed.value = Number.isFinite(baselineMetrics.speed)
    ? baselineMetrics.speed.toFixed(2)
    : "30";
  removedStudyPoints = [];
  editorNodes = Array.isArray(editorRoute.nos_validacao)
    ? editorRoute.nos_validacao.map((node, index) => ({
        id: node.id || crypto.randomUUID(), lat: Number(node.lat), lng: Number(node.lng), index: Number(node.index ?? index),
      })).filter((node) => Number.isFinite(node.lat) && Number.isFinite(node.lng))
    : [];
  editorDirty = false;
  isAddingManualPoint = false;
  addManualPointButton.classList.remove("active");
  addManualPointButton.textContent = "Adicionar ponto manual";
  officializeButton.disabled = true;
  versionOperator.value = "";
  versionReason.value = "";
  editorTitle.textContent = `${editorRoute.nome_linha} · ${editorRoute.sentido}`;
  editorStatus.textContent =
    "Nova camada de prévia aberta. Somente esta linha será alterada quando for oficializada.";
  locationSearch.value = overviewSearchResult?.query || "";
  editorRmcOnly.checked = overviewRmcOnly.checked;
  routeEditor.classList.remove("hidden");
  setTimeout(() => {
    editorMap.invalidateSize();
    renderEditor();
    const editorBounds = [...editorGeometry];
    if (overviewSearchResult) {
      showEditorSearchResult(
        overviewSearchResult.lat,
        overviewSearchResult.lng,
        overviewSearchResult.label
      );
      searchMarker.openPopup();
      calculateAccessRoute();
      editorBounds.push([overviewSearchResult.lat, overviewSearchResult.lng]);
      editorStatus.textContent =
        `Endereço mantido: ${overviewSearchResult.label}. A nova camada continua vinculada somente a esta linha.`;
    }
    if (editorBounds.length) editorMap.fitBounds(editorBounds, { padding: [25, 25], maxZoom: 16 });
    loadVersionHistory();
  }, 60);
}

function closeEditor(force = false) {
  if (!force && editorDirty &&
      !window.confirm("Descartar este estudo? Nenhuma alteração foi aplicada à linha oficial.")) {
    return;
  }
  routeEditor.classList.add("hidden");
  editorRoute = null;
  isAddingManualPoint = false;
  accessSearchResult = null;
  accessRouteGeometry = [];
  accessRouteDistanceMeters = 0;
  accessRouteNearestPoint = null;
  accessRouteInfo.classList.add("hidden");
  if (searchMarker && editorMap.hasLayer(searchMarker)) {
    editorMap.removeLayer(searchMarker);
  }
  searchMarker = null;
}

async function addManualPoint(position) {
  const geometryIndex = closestGeometryIndex(position);
  const pointsByGeometry = [...editorPoints].sort((a, b) =>
    closestGeometryIndex({ lat: a.latitude, lng: a.longitude }) -
    closestGeometryIndex({ lat: b.latitude, lng: b.longitude })
  );
  const insertionIndex = pointsByGeometry.findIndex((point) =>
    closestGeometryIndex({ lat: point.latitude, lng: point.longitude }) > geometryIndex
  );
  const data = {
    id: `study-${crypto.randomUUID()}`,
    trajeto_id: editorRoute.id,
    latitude: position.lat,
    longitude: position.lng,
    ordem_ponto: 0,
    tipo_ponto: "manual",
    data_hora_registro: new Date().toISOString(),
    precisao: null,
  };
  if (insertionIndex < 0) pointsByGeometry.push(data);
  else pointsByGeometry.splice(insertionIndex, 0, data);
  editorPoints = pointsByGeometry.map((point, index) => ({
    ...point,
    ordem_ponto: index + 1,
  }));
  await recalculateEditor();
  await calculateAccessRoute();
}

async function deleteManualPoint(point) {
  if (!String(point.id).startsWith("study-")) removedStudyPoints.push({ ...point });
  editorPoints = editorPoints.filter((item) => item.id !== point.id);
  await recalculateEditor();
  await calculateAccessRoute();
}

async function handleEditorMapClick(event) {
  if (!editorRoute || event.originalEvent?.target?.closest?.(".leaflet-control, .leaflet-popup")) return;
  if (!isAddingManualPoint) return;
  try {
    editorStatus.textContent = "Incluindo ponto manual...";
    await addManualPoint(event.latlng);
    isAddingManualPoint = false;
    addManualPointButton.classList.remove("active");
    addManualPointButton.textContent = "Adicionar ponto manual";
  } catch (error) {
    editorStatus.textContent = `Erro: ${error.message}`;
  }
}

function distanceMeters(a, b) {
  const radius = 6371000;
  const dLat = (b[0] - a[0]) * Math.PI / 180;
  const dLng = (b[1] - a[1]) * Math.PI / 180;
  const lat1 = a[0] * Math.PI / 180;
  const lat2 = b[0] * Math.PI / 180;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function geometryDistance(geometry) {
  let total = 0;
  for (let index = 1; index < geometry.length; index += 1) {
    total += distanceMeters(geometry[index - 1], geometry[index]);
  }
  return total;
}

function formatClock(date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function studySchedule(points, geometry) {
  const ordered = orderedPoints(points);
  if (!ordered.length || geometry.length < 2) return [];
  const speed = Math.max(5, Number(averageSpeed.value) || 30);
  const cumulative = [0];
  for (let index = 1; index < geometry.length; index += 1) {
    cumulative[index] = cumulative[index - 1] + distanceMeters(geometry[index - 1], geometry[index]);
  }
  const totalSeconds = cumulative[cumulative.length - 1] / (speed * 1000 / 3600);
  const isEntry = normalizedText(editorRoute?.sentido).includes("entrada");
  const referencePoint = isEntry ? ordered[ordered.length - 1] : ordered[0];
  const referenceDate = new Date(referencePoint?.data_hora_registro || Date.now());
  if (Number.isNaN(referenceDate.getTime())) referenceDate.setTime(Date.now());
  const routeStart = new Date(referenceDate.getTime() - (isEntry ? totalSeconds * 1000 : 0));
  return ordered.map((point) => {
    const geometryIndex = closestGeometryIndex({ lat: point.latitude, lng: point.longitude }, geometry);
    const secondsFromStart = cumulative[geometryIndex] / (speed * 1000 / 3600);
    const calculated = new Date(routeStart.getTime() + secondsFromStart * 1000);
    return { ...point, calculatedDate: calculated, calculatedTime: formatClock(calculated) };
  });
}

function calculateMetrics(points, geometry, options = {}) {
  const distance = geometryDistance(geometry);
  let speed = Math.max(5, Number(averageSpeed.value) || 30);
  let seconds = distance / (speed * 1000 / 3600);
  const schedule = studySchedule(points, geometry);
  let start = schedule[0]?.calculatedTime || "-";
  let end = schedule[schedule.length - 1]?.calculatedTime || "-";
  if (options.official && points.length > 1) {
    const ordered = orderedPoints(points);
    const firstDate = new Date(ordered[0].data_hora_registro);
    const lastDate = new Date(ordered[ordered.length - 1].data_hora_registro);
    if (!Number.isNaN(firstDate.getTime()) && !Number.isNaN(lastDate.getTime())) {
      seconds = Math.abs(lastDate.getTime() - firstDate.getTime()) / 1000;
      speed = seconds > 0 ? (distance / 1000) / (seconds / 3600) : speed;
      start = formatClock(firstDate);
      end = formatClock(lastDate);
    }
  }
  const boarding = points.filter((point) => ["primeiro", "manual"].includes(point.tipo_ponto)).length;
  return {
    pointCount: points.length,
    boarding,
    alighting: points.length ? 1 : 0,
    kilometers: distance / 1000,
    seconds,
    averageSeconds: points.length > 1 ? seconds / (points.length - 1) : 0,
    speed,
    start,
    end,
    startDate: schedule[0]?.calculatedDate || new Date(),
    schedule,
  };
}

function metricRows(metrics, comparison = null) {
  const items = [
    ["Pontos", metrics.pointCount, comparison?.pointCount],
    ["Embarques", metrics.boarding, comparison?.boarding],
    ["Desembarques", metrics.alighting, comparison?.alighting],
    ["Quilometragem", `${metrics.kilometers.toFixed(2)} km`, comparison ? `${comparison.kilometers.toFixed(2)} km` : null],
    ["Tempo total", `${Math.round(metrics.seconds / 60)} min`, comparison ? `${Math.round(comparison.seconds / 60)} min` : null],
    ["Média entre pontos", `${(metrics.averageSeconds / 60).toFixed(1)} min`, comparison ? `${(comparison.averageSeconds / 60).toFixed(1)} min` : null],
    ["Velocidade", `${metrics.speed.toFixed(2)} km/h`, comparison ? `${comparison.speed.toFixed(2)} km/h` : null],
    ["Horário inicial", metrics.start, comparison?.start],
    ["Horário final", metrics.end, comparison?.end],
  ];
  return items.map(([label, value, previous]) =>
    `<div class="${previous !== null && previous !== undefined && String(value) !== String(previous) ? "metric-changed" : ""}">` +
    `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`
  ).join("");
}

function metricsForAudit(metrics) {
  return {
    quantidade_pontos: metrics.pointCount,
    quantidade_embarques: metrics.boarding,
    quantidade_desembarques: metrics.alighting,
    quilometragem: Number(metrics.kilometers.toFixed(3)),
    tempo_total_segundos: Math.round(metrics.seconds),
    tempo_medio_segundos: Math.round(metrics.averageSeconds),
    velocidade_media: metrics.speed,
    horario_inicial: metrics.start,
    horario_final: metrics.end,
  };
}

function countStudyPointChanges() {
  const officialById = new Map(editorOfficialPoints.map((point) => [String(point.id), point]));
  let changes = removedStudyPoints.length;
  editorPoints.forEach((point) => {
    if (String(point.id).startsWith("study-")) {
      changes += 1;
      return;
    }
    const previous = officialById.get(String(point.id));
    if (!previous ||
        Number(previous.ordem_ponto) !== Number(point.ordem_ponto) ||
        Math.abs(Number(previous.latitude) - Number(point.latitude)) > 0.0000001 ||
        Math.abs(Number(previous.longitude) - Number(point.longitude)) > 0.0000001) {
      changes += 1;
    }
  });
  return changes;
}

function renderStudyComparison() {
  if (!editorRoute) return;
  const official = calculateMetrics(editorOfficialPoints, editorOfficialGeometry, { official: true });
  const study = editorDirty
    ? calculateMetrics(editorPoints, editorGeometry)
    : official;
  officialMetrics.innerHTML = metricRows(official);
  studyMetrics.innerHTML = metricRows(study, official);
  const scheduleById = new Map(study.schedule.map((point) => [String(point.id), point]));
  const activeStops = orderedPoints(editorPoints)
    .filter((point) => ["primeiro", "manual"].includes(point.tipo_ponto));
  studyPointList.innerHTML = [
    ...activeStops.map((point, index) => {
      const scheduled = scheduleById.get(String(point.id));
      const isNew = String(point.id).startsWith("study-");
      return `<article class="study-point-row ${isNew ? "new" : ""}">
        <div><strong>${isNew ? "Novo ponto" : `Ponto ${point.ordem_ponto}`}</strong><br>
        ${Number(point.latitude).toFixed(6)}, ${Number(point.longitude).toFixed(6)}<br>
        Horário: <strong>${escapeHtml(scheduled?.calculatedTime || "-")}</strong></div>
        <div class="point-order-actions">
          <button type="button" data-move-study="${escapeHtml(point.id)}" data-direction="-1" ${index === 0 ? "disabled" : ""}>↑</button>
          <button type="button" data-move-study="${escapeHtml(point.id)}" data-direction="1" ${index === activeStops.length - 1 ? "disabled" : ""}>↓</button>
        </div>
      </article>`;
    }),
    ...removedStudyPoints.map((point) =>
      `<article class="study-point-row removed"><div><strong>Ponto removido</strong><br>` +
      `${Number(point.latitude).toFixed(6)}, ${Number(point.longitude).toFixed(6)}</div></article>`
    ),
  ].join("") || '<p class="empty">Nenhum ponto de embarque.</p>';
  studyPointList.querySelectorAll("[data-move-study]").forEach((button) => {
    button.addEventListener("click", () => moveStudyPoint(button.dataset.moveStudy, Number(button.dataset.direction)));
  });
}

async function loadVersionHistory() {
  if (!editorRoute) return;
  versionHistory.innerHTML = '<p class="empty">Carregando versões...</p>';
  const { data, error } = await db.from("trajeto_versoes")
    .select("id,numero_versao,operador,motivo,quantidade_pontos_alterados,versao_atual,criada_em,metricas")
    .eq("trajeto_id", editorRoute.id)
    .order("numero_versao", { ascending: false });
  if (error) {
    versionHistory.innerHTML =
      '<p class="empty">Execute o SQL de versionamento para consultar o histórico.</p>';
    return;
  }
  const versions = data || [];
  versionHistory.innerHTML = versions.length
    ? versions.map((version) => `<article class="version-card ${version.versao_atual ? "current" : ""}">
        <strong>Versão ${version.numero_versao}${version.versao_atual ? " · Oficial atual" : ""}</strong>
        <span>${escapeHtml(formatPointDateTime(version.criada_em))}</span>
        <span>Operador: ${escapeHtml(version.operador)}</span>
        <span>Motivo: ${escapeHtml(version.motivo)}</span>
        <span>Pontos alterados: ${version.quantidade_pontos_alterados}</span>
        ${version.versao_atual ? "" :
          `<button class="button secondary" type="button" data-restore-version="${escapeHtml(version.id)}">Restaurar como nova versão</button>`}
      </article>`).join("")
    : '<p class="empty">A primeira versão será criada na oficialização deste estudo.</p>';
  versionHistory.querySelectorAll("[data-restore-version]").forEach((button) => {
    button.addEventListener("click", () => restoreVersion(button.dataset.restoreVersion));
  });
}

async function restoreVersion(versionId) {
  if (!versionOperator.value.trim() || !versionReason.value.trim()) {
    editorStatus.textContent =
      "Informe o operador e a justificativa antes de restaurar uma versão.";
    return;
  }
  if (!window.confirm("Restaurar esta versão como uma nova versão oficial? A versão atual continuará no histórico.")) {
    return;
  }
  editorStatus.textContent = "Restaurando a versão selecionada...";
  const { data, error } = await db.rpc("restore_route_version", {
    p_version_id: versionId,
    p_operator: versionOperator.value.trim(),
    p_reason: versionReason.value.trim(),
  });
  if (error) {
    editorStatus.textContent = `Erro ao restaurar: ${error.message}`;
    return;
  }
  const versionNumber = data?.[0]?.version_number || "-";
  editorStatus.textContent = `Restauração concluída como versão ${versionNumber}.`;
  await selectClient();
  await loadVersionHistory();
  setTimeout(() => closeEditor(true), 700);
}

async function moveStudyPoint(pointId, direction) {
  const stops = orderedPoints(editorPoints).filter((point) => ["primeiro", "manual"].includes(point.tipo_ponto));
  const index = stops.findIndex((point) => String(point.id) === String(pointId));
  const target = index + direction;
  if (index < 0 || target < 0 || target >= stops.length) return;
  const firstOrder = stops[index].ordem_ponto;
  stops[index].ordem_ponto = stops[target].ordem_ponto;
  stops[target].ordem_ponto = firstOrder;
  editorPoints = orderedPoints(editorPoints);
  editorDirty = true;
  officializeButton.disabled = false;
  renderStudyComparison();
}

function sampleGeometry(geometry, spacing = 100) {
  if (geometry.length < 2) return geometry;
  const sampled = [[...geometry[0]]];
  let remainingToNext = spacing;
  for (let index = 1; index < geometry.length; index += 1) {
    let start = [...geometry[index - 1]];
    const end = geometry[index];
    let remaining = distanceMeters(start, end);
    while (remaining >= remainingToNext && remaining > 0) {
      const ratio = remainingToNext / remaining;
      start = [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio];
      sampled.push([...start]);
      remaining = distanceMeters(start, end);
      remainingToNext = spacing;
    }
    remainingToNext -= remaining;
  }
  const last = geometry[geometry.length - 1];
  if (distanceMeters(sampled[sampled.length - 1], last) > 1) sampled.push([...last]);
  return sampled;
}

function replacementPayload() {
  const sampled = sampleGeometry(editorGeometry, 100);
  const metrics = calculateMetrics(editorPoints, editorGeometry);
  const speedMetersPerSecond = metrics.speed * 1000 / 3600;
  let accumulatedMeters = 0;
  const rows = sampled.map(([latitude, longitude], index) => ({
    latitude,
    longitude,
    tipo_ponto: "trajeto",
    data_hora_registro: new Date(
      metrics.startDate.getTime() + (accumulatedMeters / speedMetersPerSecond) * 1000
    ).toISOString(),
    precisao: null, routePosition: index, priority: 1,
  })).map((row, index, array) => {
    if (index < sampled.length - 1) accumulatedMeters += distanceMeters(sampled[index], sampled[index + 1]);
    return row;
  });
  const scheduleById = new Map(metrics.schedule.map((point) => [String(point.id), point]));
  editorPoints.filter((point) => ["primeiro", "manual"].includes(point.tipo_ponto)).forEach((point) => {
    const index = closestGeometryIndex({ lat: point.latitude, lng: point.longitude }, sampled);
    const scheduled = scheduleById.get(String(point.id));
    rows.push({
      latitude: point.latitude, longitude: point.longitude,
      tipo_ponto: point.tipo_ponto,
      data_hora_registro: scheduled?.calculatedDate?.toISOString() || point.data_hora_registro,
      precisao: point.precisao, routePosition: index, priority: point.tipo_ponto === "primeiro" ? 0 : 2,
    });
  });
  return rows.sort((a, b) => a.routePosition - b.routePosition || a.priority - b.priority)
    .map(({ routePosition, priority, ...point }, index) => ({ ...point, ordem_ponto: index + 1 }));
}

async function officialize() {
  if (!editorRoute || !editorDirty || editorGeometry.length < 2) return;
  if (!versionOperator.value.trim()) {
    editorStatus.textContent = "Informe o operador responsável pela oficialização.";
    versionOperator.focus();
    return;
  }
  if (!versionReason.value.trim()) {
    editorStatus.textContent = "Informe o motivo ou a justificativa da alteração.";
    versionReason.focus();
    return;
  }
  officializeButton.disabled = true;
  editorStatus.textContent = "Criando uma nova versão oficial sem apagar a versão anterior...";
  const nodes = editorNodes.map((node) => ({ id: node.id, lat: node.lat, lng: node.lng, index: closestGeometryIndex(node) }));
  const officialAudit = calculateMetrics(editorOfficialPoints, editorOfficialGeometry, { official: true });
  const studyAudit = calculateMetrics(editorPoints, editorGeometry);
  const payload = replacementPayload();
  const { data, error } = await db.rpc("officialize_route_version", {
    p_trajeto_id: editorRoute.id,
    p_geometry: editorGeometry,
    p_nodes: nodes,
    p_points: payload,
    p_operator: versionOperator.value.trim(),
    p_reason: versionReason.value.trim(),
    p_previous_metrics: metricsForAudit(officialAudit),
    p_new_metrics: {
      ...metricsForAudit(studyAudit),
      quantidade_pontos_alterados: countStudyPointChanges(),
    },
  });
  if (error) {
    const missingFunction = error.code === "PGRST202" ||
      error.message?.includes("officialize_route_version");
    editorStatus.textContent = missingFunction
      ? "Execute o arquivo supabase-simulador-versionamento.sql no Supabase antes de oficializar."
      : `Erro ao oficializar a nova versão: ${error.message}`;
    officializeButton.disabled = false;
    return;
  }
  editorRoute.geometria_validada = editorGeometry;
  editorRoute.nos_validacao = nodes;
  if (editorRoute.status === "importado") editorRoute.status = "trajeto";
  const versionNumber = data?.[0]?.version_number || data?.version_number || "-";
  editorStatus.textContent =
    `Versão ${versionNumber} oficializada. A versão anterior foi preservada e as demais linhas não foram alteradas.`;
  editorDirty = false;
  await selectClient();
  setTimeout(() => closeEditor(true), 500);
}

async function searchLocation() {
  const query = locationSearch.value.trim();
  if (!query) return;
  let latitude;
  let longitude;
  let label = query;
  const coordinates = query.split(",").map(Number);
  try {
    if (coordinates.length === 2 && coordinates.every(Number.isFinite)) {
      [latitude, longitude] = coordinates;
    } else {
      const response = await fetch(buildGeocodingUrl(query, editorRmcOnly.checked), {
        headers: { "Accept-Language": "pt-BR" },
      });
      const result = (await response.json())?.[0];
      if (!result) throw new Error("local não encontrado");
      latitude = Number(result.lat); longitude = Number(result.lon);
      label = result.display_name || query;
    }
    showEditorSearchResult(latitude, longitude, label);
    searchMarker.openPopup();
    await calculateAccessRoute();
  } catch (error) {
    editorStatus.textContent = `Busca: ${error.message}`;
  }
}

clientFilter.addEventListener("change", selectClient);
directionFilter.addEventListener("change", selectClient);
toggleRouteEditingButton.addEventListener("click", () => {
  setOverviewEditing(!overviewEditingEnabled);
});
overviewSearchButton.addEventListener("click", searchOverviewLocation);
overviewSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    searchOverviewLocation();
  }
});
showAllButton.addEventListener("click", () => {
  lineList.querySelectorAll("[data-toggle]").forEach((input) => { input.checked = true; });
  refreshOverviewAccess();
});
hideAllButton.addEventListener("click", () => {
  lineList.querySelectorAll("[data-toggle]").forEach((input) => { input.checked = false; });
  refreshOverviewAccess();
});
closeEditorButton.addEventListener("click", () => closeEditor());
routeEditor.querySelector(".editor-backdrop").addEventListener("click", () => closeEditor());
officializeButton.addEventListener("click", officialize);
addManualPointButton.addEventListener("click", () => {
  isAddingManualPoint = !isAddingManualPoint;
  addManualPointButton.classList.toggle("active", isAddingManualPoint);
  addManualPointButton.textContent = isAddingManualPoint
    ? "Cancelar inclusão"
    : "Adicionar ponto manual";
  editorStatus.textContent = isAddingManualPoint
    ? "Clique no mapa para incluir o ponto manual."
    : "Inclusão de ponto manual cancelada.";
});
clearNodesButton.addEventListener("click", async () => {
  editorNodes = [];
  try { await recalculateEditor(); } catch (error) { editorStatus.textContent = `Erro: ${error.message}`; }
});
searchButton.addEventListener("click", searchLocation);
locationSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") { event.preventDefault(); searchLocation(); }
});
averageSpeed.addEventListener("change", () => {
  if (!editorRoute) return;
  editorDirty = true;
  officializeButton.disabled = false;
  renderStudyComparison();
  editorStatus.textContent = "Velocidade alterada. Horários e tempo total foram recalculados no estudo.";
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !routeEditor.classList.contains("hidden")) closeEditor();
});

ensureMaps();
loadRoutes().catch((error) => { pageStatus.textContent = `Erro ao carregar: ${error.message}`; });
