(async function () {
  "use strict";
  const access = await AppAccess.requireAccess({ admin: true });
  const db = AppAccess.client;
  const companyOptions = document.getElementById("companyOptions");
  const usersBody = document.getElementById("usersBody");
  const logsBody = document.getElementById("logsBody");
  const status = document.getElementById("userStatus");
  const userFormTitle = document.getElementById("userFormTitle");
  const userNameInput = document.getElementById("userName");
  const userLoginInput = document.getElementById("userLogin");
  const userPasswordInput = document.getElementById("userPassword");
  const userProfileNameInput = document.getElementById("userProfileName");
  const userRoleSelect = document.getElementById("userRole");
  const selectAllCompanies = document.getElementById("selectAllCompanies");
  const userPermissionOptions = document.getElementById("userPermissionOptions");
  const saveUserButton = document.getElementById("saveUserButton");
  const cancelUserEdit = document.getElementById("cancelUserEdit");
  const managerDatabaseUsage = document.getElementById("managerDatabaseUsage");
  const managerAppDatabaseUsage = document.getElementById("managerAppDatabaseUsage");
  const managerDatabaseUsageStatus = document.getElementById("managerDatabaseUsageStatus");
  let editingUserId = null;
  let cachedUsers = [];
  let cachedGrants = [];
  let cachedProfiles = [];
  let cachedProfileGrants = [];

  function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value == null ? "" : String(value); return div.innerHTML; }
  async function edgeFunctionErrorMessage(error, data) {
    if (data?.error) return String(data.error);
    const response = error?.context;
    if (response && typeof response.clone === "function") {
      try {
        const payload = await response.clone().json();
        if (payload?.error) return String(payload.error);
        if (payload?.message) return String(payload.message);
      } catch (_jsonError) {
        try {
          const text = await response.clone().text();
          if (text) return text;
        } catch (_textError) { /* mantém a mensagem padrão */ }
      }
    }
    return error?.message || "Não foi possível criar o usuário.";
  }
  function formatStorageBytes(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = Number(bytes || 0); let unit = 0;
    while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
    return `${value.toFixed(unit >= 3 ? 2 : unit === 0 ? 0 : 1)} ${units[unit]}`;
  }
  async function loadDatabaseUsage() {
    managerDatabaseUsage.textContent = "Carregando...";
    managerAppDatabaseUsage.textContent = "Carregando...";
    managerDatabaseUsageStatus.textContent = "Consultando armazenamento do projeto...";
    try {
      const { data, error } = await db.rpc("get_database_usage");
      if (error) throw error;
      const usage = Array.isArray(data) ? data[0] : data;
      const usedBytes = Number(usage?.used_bytes);
      const limitBytes = Number(usage?.limit_bytes);
      const appUsedBytes = Number(usage?.app_used_bytes);
      if (!Number.isFinite(usedBytes) || !Number.isFinite(limitBytes)) throw new Error("retorno inválido");
      managerDatabaseUsage.textContent = `${formatStorageBytes(usedBytes)} / ${formatStorageBytes(limitBytes)}`;
      managerAppDatabaseUsage.textContent = Number.isFinite(appUsedBytes) ? formatStorageBytes(appUsedBytes) : "Atualizar SQL";
      managerDatabaseUsageStatus.textContent = "Espaço usado pelo banco e pelas tabelas do aplicativo.";
    } catch (error) {
      const missingRpc = error?.code === "PGRST202" || String(error?.message || "").includes("get_database_usage");
      managerDatabaseUsage.textContent = missingRpc ? "Executar SQL" : "Indisponível";
      managerAppDatabaseUsage.textContent = "—";
      managerDatabaseUsageStatus.textContent = missingRpc
        ? "Execute a função get_database_usage do arquivo supabase.sql."
        : `Não foi possível consultar: ${error?.message || "erro desconhecido"}`;
    }
  }
  function updateSelectAllCompanies() {
    const inputs = [...companyOptions.querySelectorAll('input[type="checkbox"]')];
    const selected = inputs.filter((input) => input.checked).length;
    selectAllCompanies.checked = inputs.length > 0 && selected === inputs.length;
    selectAllCompanies.indeterminate = selected > 0 && selected < inputs.length;
  }
  async function loadProfiles() {
    const { data, error } = await db.from("app_perfis").select("slug,nome,permissoes,todas_empresas,perfil_sistema").order("nome");
    if (error) throw error;
    cachedProfiles = data || [];
    const { data: grants, error: grantsError } = await db.from("app_perfil_empresas").select("perfil_slug,empresa");
    if (grantsError) throw grantsError;
    cachedProfileGrants = grants || [];
    userRoleSelect.innerHTML = cachedProfiles.map((profile) => `<option value="${escapeHtml(profile.slug)}">${escapeHtml(profile.nome)}</option>`).join("");
  }
  async function loadCompanies() {
    const { data, error } = await db.from("trajetos").select("cliente").order("cliente");
    if (error) throw error;
    const names = [...new Set((data || []).map((x) => x.cliente).filter(Boolean))];
    const options = names.map((name) => `<label><input type="checkbox" value="${escapeHtml(name)}">${escapeHtml(name)}</label>`).join("") || "Nenhuma empresa encontrada.";
    companyOptions.innerHTML = options;
    companyOptions.querySelectorAll('input[type="checkbox"]').forEach((input) => input.addEventListener("change", updateSelectAllCompanies));
    updateSelectAllCompanies();
  }
  async function loadUsers() {
    const { data: syncData, error: syncError } = await db.functions.invoke("manage-app-user", { body: { action: "sync" } });
    if (syncError || syncData?.error) console.warn("Não foi possível sincronizar usuários do Authentication:", syncData?.error || syncError?.message);
    const { data: users, error } = await db.from("app_usuarios").select("user_id,nome,usuario,perfil,ativo,permissoes_customizadas,empresas_customizadas").order("nome");
    if (error) throw error;
    const { data: grants } = await db.from("app_usuario_empresas").select("user_id,empresa");
    cachedUsers = users || [];
    cachedGrants = grants || [];
    usersBody.innerHTML = cachedUsers.map((u) => {
      const profile = cachedProfiles.find((item) => item.slug === u.perfil);
      const userCompanies = (grants || []).filter((g) => g.user_id === u.user_id).map((g) => g.empresa);
      const inheritedCompanies = cachedProfileGrants.filter((g) => g.perfil_slug === u.perfil).map((g) => g.empresa);
      const companies = u.empresas_customizadas
        ? (userCompanies.join(", ") || "Nenhuma")
        : (profile?.todas_empresas ? "Todas" : (inheritedCompanies.join(", ") || "Nenhuma"));
      const profileLabel = `${profile?.nome || u.perfil}${Array.isArray(u.permissoes_customizadas) ? " (ajustado)" : ""}`;
      return `<tr><td>${escapeHtml(u.nome)}</td><td>${escapeHtml(u.usuario)}</td><td>${escapeHtml(profileLabel)}</td><td>${escapeHtml(companies)}</td><td>${u.ativo ? "Ativo" : "Bloqueado"}</td><td><button type="button" data-edit-user="${u.user_id}">Editar acesso</button></td></tr>`;
    }).join("");
    usersBody.querySelectorAll("[data-edit-user]").forEach((button) => button.addEventListener("click", () => beginEdit(button.dataset.editUser)));
  }
  function setUserPermissionFlags(permissions) {
    const allowed = new Set(permissions || []);
    userPermissionOptions.querySelectorAll("input").forEach((input) => { input.checked = allowed.has(input.value); });
  }
  function fillFromSelectedProfile() {
    const profile = cachedProfiles.find((item) => item.slug === userRoleSelect.value);
    setUserPermissionFlags(profile?.permissoes || []);
    const inheritedCompanies = new Set(cachedProfileGrants.filter((item) => item.perfil_slug === profile?.slug).map((item) => item.empresa));
    companyOptions.querySelectorAll("input").forEach((input) => { input.checked = Boolean(profile?.todas_empresas || inheritedCompanies.has(input.value)); });
    updateSelectAllCompanies();
    status.textContent = profile ? `Permissões preenchidas pelo perfil ${profile.nome}. Você pode desmarcar.` : "";
  }
  function resetForm() {
    editingUserId = null; document.getElementById("userForm").reset();
    userNameInput.disabled = false; userLoginInput.disabled = false; userPasswordInput.required = true;
    userProfileNameInput.disabled = false; userProfileNameInput.required = false;
    userFormTitle.textContent = "Criar login"; saveUserButton.textContent = "Criar login"; cancelUserEdit.classList.add("hidden");
    fillFromSelectedProfile();
  }
  function beginEdit(userId) {
    const user = cachedUsers.find((item) => item.user_id === userId); if (!user) return;
    editingUserId = userId; userNameInput.value = user.nome; userLoginInput.value = user.usuario;
    const isMaster = user.usuario === "master";
    userRoleSelect.value = user.perfil; userNameInput.disabled = isMaster; userLoginInput.disabled = isMaster;
    const profile = cachedProfiles.find((item) => item.slug === user.perfil);
    userProfileNameInput.value = ""; userProfileNameInput.disabled = true; userProfileNameInput.required = false;
    userPasswordInput.value = ""; userPasswordInput.required = false;
    const inherited = cachedProfileGrants.filter((g) => g.perfil_slug === user.perfil).map((g) => g.empresa);
    const allowed = new Set(user.empresas_customizadas
      ? cachedGrants.filter((g) => g.user_id === userId).map((g) => g.empresa)
      : (profile?.todas_empresas ? [...companyOptions.querySelectorAll("input")].map((input) => input.value) : inherited));
    companyOptions.querySelectorAll("input").forEach((input) => { input.checked = allowed.has(input.value); });
    updateSelectAllCompanies();
    setUserPermissionFlags(Array.isArray(user.permissoes_customizadas) ? user.permissoes_customizadas : profile?.permissoes);
    userFormTitle.textContent = `Editar usuário: ${user.nome}`;
    saveUserButton.textContent = "Salvar usuário e acesso"; cancelUserEdit.classList.remove("hidden");
    status.textContent = isMaster ? "O identificador do Master é protegido; permissões e empresas podem ser ajustadas." : "Nome, usuário, senha, perfil e acessos podem ser alterados.";
  }
  async function loadLogs() {
    if (!AppAccess.can("logs")) return;
    const { data, error } = await db.from("app_logs").select("created_at,email,empresa,acao,recurso").order("created_at", { ascending: false }).limit(300);
    if (error) throw error;
    logsBody.innerHTML = (data || []).map((log) => `<tr><td>${new Date(log.created_at).toLocaleString("pt-BR")}</td><td>${escapeHtml(log.email)}</td><td>${escapeHtml(log.empresa || "—")}</td><td>${escapeHtml(log.acao)}</td><td>${escapeHtml(log.recurso || "—")}</td></tr>`).join("");
  }
  document.getElementById("userForm").addEventListener("submit", async (event) => {
    event.preventDefault(); status.textContent = "Criando...";
    const companies = [...companyOptions.querySelectorAll("input:checked")].map((x) => x.value);
    const permissions = [...userPermissionOptions.querySelectorAll("input:checked")].map((x) => x.value);
    const payload = editingUserId
      ? { action: "update", user_id: editingUserId, nome: userNameInput.value.trim(), usuario: userLoginInput.value.trim(), password: userPasswordInput.value, perfil: userRoleSelect.value, permissoes: permissions, ativo: true, companies, all_companies: selectAllCompanies.checked }
      : { action: "create", nome: userNameInput.value.trim(), usuario: userLoginInput.value.trim(), password: userPasswordInput.value, profile_name: userProfileNameInput.value.trim(), perfil: userRoleSelect.value, permissoes: permissions, companies, all_companies: selectAllCompanies.checked };
    const { data, error } = await db.functions.invoke("manage-app-user", { body: payload });
    if (error || data?.error) {
      status.textContent = `Erro: ${await edgeFunctionErrorMessage(error, data)}`;
      return;
    }
    if (data?.api_version !== 3) {
      status.textContent = "A função manage-app-user do Supabase está desatualizada. Publique novamente o arquivo index.ts atual antes de salvar.";
      return;
    }
    await AppAccess.log(editingUserId ? "alterou_permissoes" : "criou_login", "app_usuarios", null, { usuario: userLoginInput.value.trim(), perfil: userRoleSelect.value, permissoes: permissions, empresas: companies });
    const wasEditing = Boolean(editingUserId);
    if (!wasEditing) await loadProfiles();
    resetForm();
    status.textContent = wasEditing ? "Usuário e acessos atualizados." : "Login e perfil criados.";
    await Promise.all([loadUsers(), loadLogs()]);
  });
  cancelUserEdit.addEventListener("click", resetForm);
  userRoleSelect.addEventListener("change", fillFromSelectedProfile);
  selectAllCompanies.addEventListener("change", () => {
    companyOptions.querySelectorAll('input[type="checkbox"]').forEach((input) => { input.checked = selectAllCompanies.checked; });
    selectAllCompanies.indeterminate = false;
  });
  document.getElementById("refreshLogs").addEventListener("click", loadLogs);
  document.getElementById("refreshDatabaseUsage").addEventListener("click", loadDatabaseUsage);
  await loadProfiles();
  fillFromSelectedProfile();
  await Promise.all([loadCompanies(), loadUsers(), loadLogs(), loadDatabaseUsage()]);
})();
