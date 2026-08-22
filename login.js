(async function () {
  "use strict";
  const form = document.getElementById("loginForm");
  const status = document.getElementById("loginStatus");
  const button = document.getElementById("loginButton");
  const params = new URLSearchParams(location.search);
  const requested = params.get("return") || "painel.html";
  const fileName = requested.split(/[\\/]/).pop() || "painel.html";
  const safeReturn = location.protocol === "file:"
    ? (/^[\w.-]+(?:[?#].*)?$/.test(fileName) ? fileName : "painel.html")
    : (/^(?![a-z]+:|\/\/)[\w./?=&%#-]+$/i.test(requested) ? requested : "painel.html");
  const loginUserInput = document.getElementById("loginUser");

  function technicalEmail(userName) {
    const normalized = userName.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    return normalized ? `${normalized}@acesso.trajetocaptura.com.br` : "";
  }

  const existing = await AppAccess.getAccess();
  if (existing) location.replace(AppAccess.homeUrl(existing, safeReturn) || "login.html?denied=1");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    button.disabled = true;
    status.textContent = "Verificando acesso...";
    const { error } = await AppAccess.client.auth.signInWithPassword({
      email: technicalEmail(document.getElementById("loginUser").value),
      password: document.getElementById("loginPassword").value
    });
    if (error) {
      const message = String(error.message || "").toLowerCase();
      const friendlyMessage = message.includes("email not confirmed")
        ? "O usuário ainda não foi confirmado no Supabase."
        : message.includes("invalid login credentials")
          ? "Usuário ou senha inválidos. Confira o nome de usuário e a senha cadastrados."
          : `Não foi possível entrar: ${error.message}`;
      const diagnostic = [error.code, error.status].filter(Boolean).join(" / ");
      status.textContent = `${friendlyMessage}${diagnostic ? ` (${diagnostic})` : ""}`;
      console.error("Detalhes do login Supabase:", {
        code: error.code,
        status: error.status,
        message: error.message,
        technicalUser: technicalEmail(document.getElementById("loginUser").value)
      });
      button.disabled = false;
      return;
    }
    const access = await AppAccess.getAccess();
    if (!access) {
      status.textContent = "Usuário sem acesso ativo. Procure o administrador.";
      button.disabled = false;
      return;
    }
    await AppAccess.log("login", "autenticacao", null, {});
    const destination = AppAccess.homeUrl(access, safeReturn);
    if (!destination) {
      await AppAccess.client.auth.signOut();
      status.textContent = "Usuário ativo, mas sem permissão para acessar nenhuma tela.";
      button.disabled = false;
      return;
    }
    location.replace(destination);
  });
})();
