(function () {
  "use strict";

  const SUPABASE_URL = "https://tytiezeamgwmqrrygoia.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_gP0qRTSoUiO8-yMq8dgWEQ_1E3MTt7p";
  const client = window.appSupabaseClient || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  window.appSupabaseClient = client;

  function loginUrl() {
    const returnTo = location.protocol === "file:"
      ? `${location.pathname.split("/").pop() || "painel.html"}${location.search}${location.hash}`
      : `${location.pathname}${location.search}${location.hash}`;
    return `login.html?return=${encodeURIComponent(returnTo)}`;
  }

  async function getAccess() {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return null;
    const { data: baseProfile, error } = await client
      .from("app_usuarios")
      .select("user_id,nome,usuario,email,perfil,ativo")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (error || !baseProfile || !baseProfile.ativo) {
      await client.auth.signOut();
      return null;
    }
    const { data: customization } = await client
      .from("app_usuarios")
      .select("permissoes_customizadas,empresas_customizadas")
      .eq("user_id", session.user.id)
      .maybeSingle();
    const profile = { ...baseProfile, ...(customization || {}) };
    const { data: grants } = await client
      .from("app_usuario_empresas")
      .select("empresa")
      .eq("user_id", session.user.id);
    const role = profile.perfil === "administrador" ? "geral" : profile.perfil;
    const { data: roleRecord } = await client
      .from("app_perfis")
      .select("slug,nome,permissoes,todas_empresas")
      .eq("slug", role)
      .maybeSingle();
    const { data: roleGrants } = await client
      .from("app_perfil_empresas")
      .select("empresa")
      .eq("perfil_slug", role);
    const effectiveCompanies = profile.empresas_customizadas ? (grants || []) : ((roleGrants || []).length ? roleGrants : grants || []);
    return {
      session,
      profile,
      role,
      roleName: roleRecord?.nome || role,
      permissions: Array.isArray(profile.permissoes_customizadas)
        ? profile.permissoes_customizadas
        : (Array.isArray(roleRecord?.permissoes) ? roleRecord.permissoes : null),
      companies: effectiveCompanies.map((item) => item.empresa),
      allCompanies: Boolean((roleRecord?.todas_empresas || role === "geral") && !profile.empresas_customizadas),
      isAdmin: Boolean(roleRecord?.permissoes?.includes("gerenciador.gerenciar") || role === "geral")
    };
  }

  const rolePermissions = {
    pesquisa: ["pesquisar"],
    nivel_1: ["pesquisar", "editar"],
    geral: ["pesquisar", "editar", "excluir", "importar", "exportar", "gerenciar"]
  };

  function pageFromUrl(url) {
    const value = String(url || "").toLowerCase();
    if (value.includes("consolidado-linhas")) return "consolidado";
    if (value.includes("gerenciador-acessos")) return "gerenciador";
    if (value.includes("painel")) return "painel";
    return null;
  }

  function hasPageAccess(access, page) {
    if (!access || !page) return false;
    if (page === "gerenciador") return access.isAdmin;
    if (Array.isArray(access.permissions)) {
      return access.permissions.some((permission) => String(permission).startsWith(`${page}.`));
    }
    return ["pesquisa", "nivel_1", "geral"].includes(access.role) && ["painel", "consolidado"].includes(page);
  }

  function homeUrl(access, preferredUrl) {
    if (access?.profile?.usuario === "master") return "gerenciador-acessos.html";
    const preferredPage = pageFromUrl(preferredUrl);
    if (preferredPage && hasPageAccess(access, preferredPage)) return preferredUrl;
    if (hasPageAccess(access, "consolidado")) return "consolidado-linhas.html";
    if (hasPageAccess(access, "painel")) return "painel.html";
    if (hasPageAccess(access, "gerenciador")) return "gerenciador-acessos.html";
    return null;
  }

  function can(permission, access = window.appAccess) {
    if (!access) return false;
    const page = location.pathname.toLowerCase().includes("consolidado") ? "consolidado"
      : location.pathname.toLowerCase().includes("gerenciador") ? "gerenciador" : "painel";
    if (Array.isArray(access.permissions)) {
      return access.permissions.includes(permission) || access.permissions.includes(`${page}.${permission}`);
    }
    return (rolePermissions[access.role] || []).includes(permission);
  }

  function applyPermissions(root = document) {
    const selectors = {
      editar: ["#validateSelectedButton", "#previousStatusButton", "#openLayerEditorButton", "#finishSelectedButton", "#editMapButton", "#officializeRouteButton", "#undoPointOrderButton", "#addLayerManualPointButton", "#clearLayerNodesButton", "#saveOfficialLayerButton", "#clearNodesButton", "#officializeButton", "#helpAnswerForm", "#alignmentForm"],
      excluir: ["#trashButton", "#deleteSelectedButton", "#deleteSelectedPointsButton", "#deletePointRangeButton", "#undoDeletePointsButton", "#deleteHelpQuestionButton"],
      exportar: ["#exportJsonButton", "#exportExcelButton"]
    };
    Object.entries(selectors).forEach(([permission, list]) => {
      root.querySelectorAll(list.join(",")).forEach((element) => { element.dataset.permission = permission; });
    });
    root.querySelectorAll("[data-permission]").forEach((element) => {
      const allowed = can(element.dataset.permission);
      element.classList.toggle("permission-hidden", !allowed);
      if ("disabled" in element && !allowed) element.disabled = true;
      element.setAttribute("aria-hidden", String(!allowed));
    });
  }

  document.addEventListener("click", (event) => {
    const protectedControl = event.target.closest?.("[data-permission]");
    if (protectedControl && !can(protectedControl.dataset.permission)) {
      event.preventDefault(); event.stopImmediatePropagation();
    } else if (protectedControl) {
      log(`acionou_${protectedControl.dataset.permission}`, protectedControl.id || protectedControl.dataset.action || protectedControl.textContent.trim().slice(0, 80), null, {});
    }
  }, true);
  document.addEventListener("submit", (event) => {
    const protectedForm = event.target.closest?.("[data-permission]");
    if (protectedForm && !can(protectedForm.dataset.permission)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);

  function renderSessionBar(access) {
    if (document.getElementById("appSideMenu")) return;
    const currentPage = pageFromUrl(location.pathname);
    const items = [
      { page: "painel", href: "painel.html", icon: "P", label: "Painel de Pontos", description: "Acompanhar trajetos" },
      { page: "consolidado", href: "consolidado-linhas.html", icon: "C", label: "Consolidado", description: "Linhas e estudos" },
      { page: "gerenciador", href: "gerenciador-acessos.html", icon: "A", label: "Acessos e logs", description: "Usuários e permissões" },
    ].filter((item) => hasPageAccess(access, item.page));

    const toggle = document.createElement("button");
    toggle.id = "appMenuToggle";
    toggle.className = "app-menu-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Abrir menu do sistema");
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = '<span aria-hidden="true">☰</span>';

    const backdrop = document.createElement("div");
    backdrop.id = "appMenuBackdrop";
    backdrop.className = "app-menu-backdrop";

    const menu = document.createElement("aside");
    menu.id = "appSideMenu";
    menu.className = "app-side-menu";
    menu.setAttribute("aria-hidden", "true");
    menu.innerHTML = `
      <header class="app-menu-header">
        <div class="app-menu-brand">
          <img src="logo-princesa-doeste.png" alt="" />
          <div><small>Sistema de trajetos</small><strong>Menu principal</strong></div>
        </div>
        <button class="app-menu-close" type="button" aria-label="Fechar menu">×</button>
      </header>
      <nav class="app-menu-nav" aria-label="Telas do sistema">
        ${items.map((item) => `
          <a href="${item.href}" class="app-menu-link${currentPage === item.page ? " active" : ""}"
             ${currentPage === item.page ? 'aria-current="page"' : ""}>
            <span class="app-menu-icon" aria-hidden="true">${item.icon}</span>
            <span><strong>${item.label}</strong><small>${item.description}</small></span>
          </a>`).join("")}
        <div class="app-menu-section-label">Aplicativos públicos</div>
        <div class="app-menu-public-row">
          <a href="index.html" class="app-menu-link app-menu-public-link" target="_blank" rel="noopener">
            <span class="app-menu-icon" aria-hidden="true">V1</span>
            <span><strong>APP V1</strong><small>Abrir index.html</small></span>
          </a>
          <button type="button" class="app-menu-copy-link" data-copy-app="index.html" aria-label="Copiar link do APP V1">Copiar link</button>
        </div>
        <div class="app-menu-public-row">
          <a href="index2.html" class="app-menu-link app-menu-public-link" target="_blank" rel="noopener">
            <span class="app-menu-icon" aria-hidden="true">V2</span>
            <span><strong>APP V2</strong><small>Abrir index2.html</small></span>
          </a>
          <button type="button" class="app-menu-copy-link" data-copy-app="index2.html" aria-label="Copiar link do APP V2">Copiar link</button>
        </div>
      </nav>
      <footer class="app-menu-footer">
        <div class="app-menu-user">
          <span class="app-menu-avatar" aria-hidden="true">${escapeMenuText((access.profile.nome || access.profile.usuario || "U").charAt(0).toUpperCase())}</span>
          <span><strong>${escapeMenuText(access.profile.nome || access.profile.usuario || access.profile.email)}</strong><small>${escapeMenuText(access.roleName || access.role)}</small></span>
        </div>
        <button class="app-menu-logout" type="button">Sair do sistema</button>
      </footer>`;

    function setOpen(open) {
      menu.classList.toggle("open", open);
      backdrop.classList.toggle("open", open);
      toggle.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu do sistema" : "Abrir menu do sistema");
      menu.setAttribute("aria-hidden", String(!open));
      if (open) menu.querySelector(".app-menu-close")?.focus();
    }

    toggle.addEventListener("click", () => setOpen(!menu.classList.contains("open")));
    backdrop.addEventListener("click", () => setOpen(false));
    menu.querySelector(".app-menu-close").addEventListener("click", () => setOpen(false));
    menu.querySelector(".app-menu-logout").addEventListener("click", async () => {
      await client.auth.signOut();
      location.replace("login.html");
    });
    menu.querySelectorAll("[data-copy-app]").forEach((button) => {
      button.addEventListener("click", async () => {
        const link = new URL(button.dataset.copyApp, window.location.href).href;
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(link);
          } else {
            const input = document.createElement("textarea");
            input.value = link;
            input.setAttribute("readonly", "");
            input.style.position = "fixed";
            input.style.left = "-9999px";
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            input.remove();
          }
          const previousText = button.textContent;
          button.textContent = "Link copiado";
          window.setTimeout(() => { button.textContent = previousText; }, 1800);
        } catch (_error) {
          window.prompt("Copie o link do aplicativo:", link);
        }
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("open")) setOpen(false);
    });
    document.body.append(backdrop, menu);
    const brand = document.querySelector(".brand-heading");
    const logo = brand?.querySelector("img");
    if (logo) logo.insertAdjacentElement("afterend", toggle);
    else (document.querySelector("body > header") || document.body).prepend(toggle);
  }

  function escapeMenuText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    }[character]));
  }

  async function log(acao, recurso, empresa, detalhes) {
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;
    await client.from("app_logs").insert({
      user_id: user.id,
      email: window.appAccess?.profile?.usuario || user.email,
      empresa: empresa || null,
      acao,
      recurso: recurso || null,
      detalhes: detalhes || {}
    });
  }

  async function requireAccess(options) {
    const access = await getAccess();
    if (!access) {
      location.replace(loginUrl());
      throw new Error("Autenticação necessária.");
    }
    if (options && options.admin && !access.isAdmin) {
      location.replace(homeUrl(access) || "login.html");
      throw new Error("Acesso restrito a administradores.");
    }
    const currentPage = pageFromUrl(location.pathname);
    if (currentPage && !hasPageAccess(access, currentPage)) {
      const destination = homeUrl(access);
      if (destination) location.replace(destination);
      else { await client.auth.signOut(); location.replace("login.html?denied=1"); }
      throw new Error("O perfil não possui permissão para esta tela.");
    }
    window.appAccess = access;
    document.documentElement.classList.remove("auth-pending");
    renderSessionBar(access);
    applyPermissions();
    log("visualizou_tela", location.pathname.split("/").pop() || "painel", null, { titulo: document.title });
    return access;
  }

  window.AppAccess = { client, getAccess, requireAccess, log, can, applyPermissions, hasPageAccess, homeUrl };
})();
