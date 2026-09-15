const copyDialog = document.querySelector('#copyOfficialDialog');
const copyForm = document.querySelector('#copyOfficialForm');
const copyTarget = document.querySelector('#copyOfficialTarget');
const copyDate = document.querySelector('#copyOfficialDate');
const copyTime = document.querySelector('#copyOfficialTime');
const copyPreview = document.querySelector('#copyOfficialPreview');
const copyMessage = document.querySelector('#copyOfficialMessage');
const copyConfirm = document.querySelector('#confirmCopyOfficial');
const copyCancel = document.querySelector('#cancelCopyOfficial');
let copySource = null;
let copySourcePoints = [];
let copySourceGeometry = [];
let copyBusy = false;
let copyFixedDestination = null;
let copyOriginOptions = [];
let copyLoadRequest = 0;
const copyPicker = document.querySelector('#copyOfficialSourcePicker');
const copySearch = document.querySelector('#copyOfficialSearch');
const copyOrigin = document.querySelector('#copyOfficialOrigin');
const copyClient = document.querySelector('#copyOfficialClient');

function filterOfficialCopySources(executions, destination, search = '') {
  const query = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return executions.filter(route => !route.deleted_at &&
    route.cliente === destination.cliente && route.sentido === destination.sentido &&
    route.nome_linha !== destination.nome_linha && ['trajeto','importado'].includes(route.status) &&
    (getOfficialRouteGeometry(route).length >= 2 || Number(route.trajeto_pontos?.[0]?.count) >= 2) &&
    String(route.nome_linha || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(query));
}

function renderCopyOrigins() {
  const selected = copyOrigin.value;
  copyOrigin.replaceChildren(new Option(copyClient.value ? 'Selecione uma linha abaixo' : 'Selecione primeiro um cliente', ''));
  const destination = {...copyFixedDestination, cliente:copyClient.value,
    nome_linha:copyClient.value === copyFixedDestination.cliente ? copyFixedDestination.nome_linha : ''};
  const officialRoutes = filterOfficialCopySources(copyOriginOptions, destination, copySearch.value);
  officialRoutes.forEach(route => {
    const date = route.created_at ? new Date(route.created_at).toLocaleString('pt-BR') : '';
    copyOrigin.add(new Option(`${route.nome_linha} · ${route.sentido}${date ? ` · ${date}` : ''}`, route.id));
  });
  if (copyClient.value && !officialRoutes.length) {
    copyOrigin.options[0].textContent = copySearch.value ? 'Nenhuma rota oficial encontrada nesta busca' : 'Nenhuma rota oficial disponível neste sentido';
  }
  copyOrigin.value = selected;
  if (selected && copyOrigin.value !== selected) {
    copyLoadRequest++;
    copySource = null;
    copySourcePoints = [];
    updateCopyPreview();
  }
}

async function openCopyOfficialForDestination(destination) {
  if (!AppAccess.can('editar') || copyBusy) return;
  copyLoadRequest++;
  copyFixedDestination = {...destination};
  copySource = null;
  copySourcePoints = [];
  copyPicker.hidden = false;
  copyTarget.replaceChildren(new Option(destination.nome_linha, destination.nome_linha));
  copyTarget.disabled = true;
  copyDate.value = '';
  copyTime.value = '';
  copySearch.value = '';
  copyClient.replaceChildren(new Option('Selecione um cliente', ''));
  const access = window.appAccess;
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const allowed = new Set((access?.companies || []).map(normalize));
  [...new Set(routeOptions.map(option => option.cliente))].filter(client => access?.allCompanies || allowed.has(normalize(client))).sort().forEach(client => copyClient.add(new Option(client,client)));
  copyClient.value = destination.cliente;
  copyClient.disabled = true;
  copyOriginOptions = [];
  renderCopyOrigins();
  copyMessage.textContent = '';
  document.querySelector('#copyOfficialSource').textContent = `Destino: ${destination.cliente} · ${destination.nome_linha} · ${destination.sentido}`;
  updateCopyPreview();
  copyDialog.showModal();
  const request = copyLoadRequest;
  try {
    const {data, error} = await supabaseClient.from('trajetos')
      .select('id,cliente,sentido,nome_linha,status,geometria_validada,created_at,trajeto_pontos(count)')
      .is('deleted_at', null).in('status', ['trajeto','importado']).order('created_at', {ascending:false});
    if (request !== copyLoadRequest) return;
    if (error) throw error;
    copyOriginOptions = data || [];
    renderCopyOrigins();
    copyMessage.textContent = 'A lista mostra execuções oficiais do mesmo sentido. Para execuções antigas, a linha será calculada a partir dos pontos salvos.';
  } catch (error) { if (request === copyLoadRequest) copyMessage.textContent = error.message; }
  finally { copyClient.disabled = false; }
}

function getUntraveledCopyDestinations(options, source, executions) {
  const occupied = new Set(executions.filter(route =>
    !route.deleted_at && route.cliente === source.cliente && route.sentido === source.sentido
  ).map(route => route.nome_linha));
  return [...new Set(options.filter(option =>
    option.cliente === source.cliente && option.sentido === source.sentido &&
    option.nome_linha !== source.nome_linha && !occupied.has(option.nome_linha)
  ).map(option => option.nome_linha))].sort((a,b) => a.localeCompare(b, 'pt-BR', {numeric:true}));
}

function calculateCopySchedule(points, direction, date, time) {
  const ordered = [...points].sort((a, b) => Number(a.ordem_ponto) - Number(b.ordem_ponto));
  const stops = ordered.filter(p => ['primeiro', 'manual'].includes(p.tipo_ponto));
  if (ordered.length < 2 || !stops.length) throw new Error('A origem precisa de pontos e horários válidos.');
  const anchor = String(direction).toLowerCase() === 'entrada' ? stops[stops.length - 1] : stops[0];
  const reference = new Date(`${date}T${time}-03:00`).getTime();
  const originalReference = anchor.data_hora_registro ? new Date(anchor.data_hora_registro).getTime() : NaN;
  if (!date || !time || !Number.isFinite(reference) || !Number.isFinite(originalReference)) throw new Error('Informe uma data e um horário válidos.');
  const shift = reference - originalReference;
  const shifted = ordered.map(p => {
    const original = p.data_hora_registro ? new Date(p.data_hora_registro).getTime() : NaN;
    if (!Number.isFinite(original)) throw new Error('Existe um ponto sem horário válido na origem.');
    return { ...p, data_hora_registro: new Date(original + shift).toISOString() };
  });
  return { points: shifted, start: shifted[0].data_hora_registro, end: shifted[shifted.length - 1].data_hora_registro };
}

function updateCopyPreview() {
  copyConfirm.disabled = true;
  if (!copySource || !copyTarget.value || !copyDate.value || !copyTime.value) {
    copyPreview.textContent = 'Selecione a linha e informe a data e o horário.';
    return;
  }
  try {
    const schedule = calculateCopySchedule(copySourcePoints, copySource.sentido, copyDate.value, copyTime.value);
    const formatter = new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo', dateStyle:'short', timeStyle:'medium'});
    copyPreview.textContent = `Início: ${formatter.format(new Date(schedule.start))}. Fim: ${formatter.format(new Date(schedule.end))}. ${schedule.points.length} registros, preservando os intervalos da origem.`;
    copyConfirm.disabled = copyBusy;
  } catch (error) { copyPreview.textContent = error.message; }
}

async function openCopyOfficial(selectedRoute = null, fixedDestination = null) {
  const selected = selectedRoute?.id ? selectedRoute : getSelectedRoute();
  if (!selected || !AppAccess.can('editar')) { setMessage('Selecione uma rota oficial com permissão de edição.', 'error'); return; }
  const request = ++copyLoadRequest;
  copyFixedDestination = fixedDestination;
  copyPicker.hidden = !fixedDestination;
  copyTarget.disabled = Boolean(fixedDestination);
  copySource = null;
  copyTarget.replaceChildren();
  copySourcePoints = [];
  copyMessage.textContent = '';
  copyDate.value = '';
  copyTime.value = '';
  copyPreview.textContent = 'Carregando a versão oficial salva...';
  copyConfirm.disabled = true;
  document.querySelector('#copyOfficialSource').textContent = `${selected.cliente} · ${selected.nome_linha} · ${selected.sentido}`;
  if (!copyDialog.open) copyDialog.showModal();
  try {
    const [routeResult, pointResult] = await Promise.all([
      supabaseClient.from('trajetos').select('id,cliente,sentido,nome_linha,status,geometria_validada').eq('id', selected.id).is('deleted_at', null).single(),
      supabaseClient.from('trajeto_pontos').select('id,latitude,longitude,ordem_ponto,tipo_ponto,data_hora_registro').eq('trajeto_id', selected.id).order('ordem_ponto'),
    ]);
    if (request !== copyLoadRequest) return;
    if (routeResult.error) throw routeResult.error;
    if (pointResult.error) throw pointResult.error;
    const source = routeResult.data;
    if (!['trajeto','importado'].includes(source.status)) throw new Error('A origem precisa estar oficializada ou importada.');
    copySourcePoints = pointResult.data || [];
    if (copySourcePoints.length < 2) throw new Error('A origem não possui pontos suficientes para copiar.');
    let geometry = getOfficialRouteGeometry(source);
    if (geometry.length < 2) {
      copyPreview.textContent = 'Calculando o itinerário pelas ruas a partir dos pontos da execução...';
      geometry = await fetchRoutedLatLngs(getRoutingControlPoints(copySourcePoints));
      if (request !== copyLoadRequest) return;
      if (geometry.length < 2) throw new Error('Não foi possível calcular a linha da execução antiga.');
    }
    copySourceGeometry = geometry;
    copySource = source;
    const executionResult = await supabaseClient.from('trajetos')
      .select('cliente,sentido,nome_linha').eq('cliente', fixedDestination?.cliente || source.cliente)
      .eq('sentido', fixedDestination?.sentido || source.sentido).is('deleted_at', null);
    if (executionResult.error) throw executionResult.error;
    if (request !== copyLoadRequest) return;
    const destinations = getUntraveledCopyDestinations(routeOptions, fixedDestination ? {...fixedDestination,nome_linha:''} : source, executionResult.data || []);
    copyTarget.add(new Option('Selecione uma linha não percorrida', ''));
    destinations.forEach(name => copyTarget.add(new Option(name, name)));
    if (fixedDestination) {
      if (!destinations.includes(fixedDestination.nome_linha)) throw new Error('A linha de destino já possui execução ou não está disponível para cópia.');
      copyTarget.value = fixedDestination.nome_linha;
    }
    if (!destinations.length) throw new Error('Não há linhas não percorridas disponíveis para este cliente e sentido.');
    const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const part = type => parts.find(p => p.type === type).value;
    copyDate.value = `${part('year')}-${part('month')}-${part('day')}`;
    document.querySelector('#copyOfficialTimeLabel').textContent = source.sentido.toLowerCase() === 'entrada' ? 'Chegada ao cliente (último ponto)' : 'Partida (primeiro ponto)';
    updateCopyPreview();
  } catch (error) { if (request === copyLoadRequest) { copySource = null; copyConfirm.disabled = true; copyMessage.textContent = error.message; } }
}

document.querySelector('#copyOfficialRouteButton').addEventListener('click', () => openCopyOfficial());
copySearch.addEventListener('input', renderCopyOrigins);
copyClient.addEventListener('change', () => {
  copyLoadRequest++;
  copySource = null;
  copySourcePoints = [];
  copyOrigin.value = '';
  copySearch.value = '';
  renderCopyOrigins();
  updateCopyPreview();
});
copyOrigin.addEventListener('change', () => {
  const source = copyOriginOptions.find(route => route.id === copyOrigin.value);
  if (source) openCopyOfficial(source, copyFixedDestination);
  else { copyLoadRequest++; copySource = null; copySourcePoints = []; updateCopyPreview(); }
});
[copyTarget, copyDate, copyTime].forEach(input => input.addEventListener('input', updateCopyPreview));
copyCancel.addEventListener('click', () => { if (!copyBusy) copyDialog.close(); });
copyDialog.addEventListener('keydown', event => event.stopPropagation());
copyDialog.addEventListener('cancel', event => { if (copyBusy) event.preventDefault(); });
copyForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (copyBusy || copyConfirm.disabled || !copySource || !copyForm.reportValidity()) return;
  copyBusy = true;
  copyConfirm.disabled = true;
  copyCancel.disabled = true;
  copySearch.disabled = true;
  copyOrigin.disabled = true;
  copyClient.disabled = true;
  copyMessage.textContent = '';
  copyPreview.textContent = 'Criando a cópia oficial...';
  let created = false;
  try {
    const {data:authData, error:authError} = await AppAccess.client.auth.getUser();
    if (authError || !authData?.user) throw new Error('Sua sessão expirou ou não está autenticada. Entre novamente no painel antes de copiar.');
    const {data, error} = await supabaseClient.rpc('copy_official_route', {p_source_id:copySource.id, p_target_line:copyTarget.value, p_date:copyDate.value, p_time:copyTime.value, p_target_client:copyFixedDestination?.cliente || copySource.cliente, p_geometry:copySourceGeometry});
    if (error) throw error;
    if (!data) throw new Error('O banco não confirmou a criação. Confira a linha de destino antes de tentar novamente.');
    created = true;
    copyDialog.close();
    await refreshDashboard();
    setMessage('Cópia vinculada à origem criada. Alterações oficiais serão refletidas mantendo o horário próprio do destino.', 'success');
  } catch (error) {
    if (created) setMessage('A cópia foi criada, mas o painel não atualizou. Use Atualizar para localizar a linha de destino.', 'error');
    else copyMessage.textContent = error.code === 'PGRST202' || error.message === 'Sem permissão para copiar uma rota oficial'
      ? 'Execute a versão atualizada de supabase-copiar-rota-oficial.sql no SQL Editor do Supabase e tente novamente. A função instalada ainda não reconhece as permissões desta atualização.'
      : error.message;
  } finally {
    copyBusy = false;
    copyCancel.disabled = false;
    copySearch.disabled = false;
    copyOrigin.disabled = false;
    copyClient.disabled = false;
    updateCopyPreview();
  }
});
