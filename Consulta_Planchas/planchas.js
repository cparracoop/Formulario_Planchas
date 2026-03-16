// Página: Planchas registradas (sin modal)
// Reutiliza el mismo endpoint que ya usabas en el modal del index.
const planchasJsonUrl = "https://default3a26d729512149f4b2d9fa86a9ee02.9b.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/863a2400d5f44e5caa387abdeebd778e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=CcRhpWcp2llYhje73ygYRkbJKzR-mKzQdIYoaAl0Yio";

function $(id) { return document.getElementById(id); }

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function withCacheBuster(url) {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}t=${Date.now()}`;
}

function setLoading(isLoading, text = "Cargando información...") {
  const overlay = $("loadingOverlay");
  if (overlay) {
    const strong = overlay.querySelector("strong");
    if (strong) strong.textContent = text;
    overlay.classList.toggle("is-open", !!isLoading);
    overlay.setAttribute("aria-hidden", isLoading ? "false" : "true");
  }
}

function setStatus(text) {
  const el = $("planchasStatus");
  if (el) el.textContent = text || "";
}

async function fetchPlanchasJson() {
  if (!planchasJsonUrl || planchasJsonUrl === "PON_AQUI_TU_URL_PUBLICA_DE_ONEDRIVE") {
    throw new Error("Falta configurar la URL pública (planchasJsonUrl).");
  }

  const res = await fetch(withCacheBuster(planchasJsonUrl), {
    method: "POST",
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) {
    throw new Error(`No se pudo leer el archivo JSON (HTTP ${res.status}).`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const txt = await res.text();
    return JSON.parse(txt);
  }
  return await res.json();
}

function normalize(text) {
  return String(text || "").toLowerCase().trim();
}

function getOrganoLabel(value) {
  const normalized = normalize(value);
  if (normalized === "c") return "Consejo";
  if (normalized === "j") return "Junta";
  if (normalized.includes("consejo")) return "Consejo";
  if (normalized.includes("junta")) return "Junta";
  return value || "Sin organismo";
}

function planchaToSearchText(p) {
  const planchaId = p?.plancha || "";
  const organo = getOrganoLabel(p?.organo || "");
  const registros = Array.isArray(p?.registros) ? p.registros : [];
  const parts = [planchaId, organo];

  registros.forEach((r) => {
    parts.push(
      r?.principal?.cedula, r?.principal?.nombre,
      r?.suplente?.cedula,  r?.suplente?.nombre
    );
  });

  return normalize(parts.filter(Boolean).join(" | "));
}

function matchesOrganoFilter(plancha, organoFilter) {
  if (!organoFilter) return true;
  return getOrganoLabel(plancha?.organo || "") === organoFilter;
}

function getCurrentFilters() {
  return {
    text: $("filterInput")?.value || "",
    organo: $("organoFilter")?.value || ""
  };
}

function renderPlanchas(data, filters = {}) {
  const container = $("planchasContainer");
  const emptyState = $("emptyState");
  if (!container) return;

  const planchas = Array.isArray(data?.planchas) ? data.planchas : [];
  if (planchas.length === 0) {
    setStatus("Aún no hay planchas registradas.");
    container.innerHTML = `<div class="muted" style="font-weight:700;">Aún no hay planchas registradas.</div>`;
    if (emptyState) emptyState.style.display = "none";
    return;
  }

  const ordered = [...planchas].reverse();
  const q = normalize(filters.text);
  const organoFilter = filters.organo || "";

  const filtered = ordered.filter((p) => {
    const byOrgano = matchesOrganoFilter(p, organoFilter);
    const byText = q ? planchaToSearchText(p).includes(q) : true;
    return byOrgano && byText;
  });

  const labelFiltro = organoFilter ? ` · Organismo: ${organoFilter}` : "";
  setStatus(`Total planchas: ${planchas.length} · Mostrando: ${filtered.length}${labelFiltro}`);

  if (filtered.length === 0) {
    container.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";

  container.innerHTML = filtered.map((p) => {
    const planchaId = escapeHtml(p?.plancha || "(sin id)");
    const organo = escapeHtml(getOrganoLabel(p?.organo || ""));
    const badgeClass = organo === "Junta" ? "plancha-badge badge-junta" : "plancha-badge badge-consejo";
    const registros = Array.isArray(p?.registros) ? p.registros : [];

    const rows = registros.map((r) => {
      const orden = escapeHtml(r?.orden);
      const pc = escapeHtml(r?.principal?.cedula || "");
      const pn = escapeHtml(r?.principal?.nombre || "");
      const sc = escapeHtml(r?.suplente?.cedula || "");
      const sn = escapeHtml(r?.suplente?.nombre || "");

      return `
        <tr>
          <td><strong class="muted">${orden}</strong></td>
          <td>${organo}</td>
          <td>${pc}</td>
          <td>${pn}</td>
          <td>${sc}</td>
          <td>${sn}</td>
        </tr>
      `;
    }).join("");

    return `
      <section class="plancha-card">
        <div style="display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-bottom:10px;">
          <h4 class="plancha-title" style="margin:0;">Plancha: ${planchaId}</h4>
          <span class="${badgeClass}">${organo}</span>
        </div>
        <div style="overflow:auto;">
          <table class="plancha-table" aria-label="Plancha ${planchaId}">
            <thead>
              <tr>
                <th style="width:60px;">#</th>
                <th style="width:140px;">Organismo</th>
                <th>Principal (cédula)</th>
                <th>Principal (nombre)</th>
                <th>Suplente (cédula)</th>
                <th>Suplente (nombre)</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="6" class="muted">Sin registros</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }).join("");
}

let lastData = null;

async function loadPlanchas() {
  setStatus("Cargando…");
  setLoading(true, "Cargando información...");
  const container = $("planchasContainer");
  if (container) container.innerHTML = "";

  try {
    lastData = await fetchPlanchasJson();
    renderPlanchas(lastData, getCurrentFilters());
  } catch (err) {
    console.error(err);
    setStatus("");
    const msg = err?.message || "No se pudo cargar el historial.";
    if (container) {
      container.innerHTML = `
        <div class="error">${escapeHtml(msg)}</div>
        <div class="muted" style="margin-top:8px;">
          Verifica que el endpoint sea accesible desde el navegador (CORS/permisos).
        </div>
      `;
    }
  } finally {
    setLoading(false);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("refreshBtn")?.addEventListener("click", loadPlanchas);
  $("backBtn")?.addEventListener("click", () => window.location.href = "../index.html");

  $("filterInput")?.addEventListener("input", () => {
    if (!lastData) return;
    renderPlanchas(lastData, getCurrentFilters());
  });

  $("organoFilter")?.addEventListener("change", () => {
    if (!lastData) return;
    renderPlanchas(lastData, getCurrentFilters());
  });

  loadPlanchas();
});
