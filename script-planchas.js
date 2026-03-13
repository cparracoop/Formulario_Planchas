// ============================
// CONFIG
// ============================
// 🔴 Reemplaza con tu endpoint real de Power Automate
const endpoint = "https://default3a26d729512149f4b2d9fa86a9ee02.9b.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/859a857cae79496f86e32f22b1521d1b/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=qepMdZoLQJ50PHMnX_hJwhKVOJn9-L8tmYligNAhDYI";

// 🔵 URL PÚBLICA al archivo planchas.json en OneDrive
// Recomendado: usar un enlace de descarga directa. Ejemplos comunes:
// - https://.../planchas.json?download=1
// - https://api.onedrive.com/v1.0/shares/<shareId>/root/content
// Si no es público o OneDrive bloquea CORS, el navegador NO podrá leerlo desde GitHub Pages.
const planchasJsonUrl = "https://default3a26d729512149f4b2d9fa86a9ee02.9b.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/863a2400d5f44e5caa387abdeebd778e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=CcRhpWcp2llYhje73ygYRkbJKzR-mKzQdIYoaAl0Yio";
// 
// https://default3a26d729512149f4b2d9fa86a9ee02.9b.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b8da200cdbde4d86986720723eb1b8c2/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ifDCtwwwdyk2PtUfpdUan_vNjUDzqUMUm5MuCnn8oUY
// Helpers DOM
// ============================
function $(id) { return document.getElementById(id); }

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidCedula(value) {
  const v = onlyDigits(value);
  return v.length >= 5 && v.length <= 12;
}

// ============================
// Loading overlay
// ============================
function setLoading(isLoading, text = "Enviando información...") {
  const overlay = $("loadingOverlay");
  if (overlay) {
    const strong = overlay.querySelector("strong");
    if (strong) strong.textContent = text;

    overlay.classList.toggle("is-open", !!isLoading);
    overlay.setAttribute("aria-hidden", isLoading ? "false" : "true");
  }

  // bloquear UI para evitar doble envío
  const submitBtn = $("submitBtn");
  const addRowBtn = $("addRowBtn");
  const resetBtn  = $("resetBtn");
  if (submitBtn) submitBtn.disabled = !!isLoading;
  if (addRowBtn) addRowBtn.disabled = !!isLoading;
  if (resetBtn)  resetBtn.disabled  = !!isLoading;
}

// ============================
// Modal / Pop-up de resultado
// ============================
function openResultModal(message, isError = false) {
  const modal = $("resultModal");
  if (!modal) return;

  const msgEl = $("resultMessage");
  const iconEl = $("resultIcon");
  const titleEl = $("resultTitle");

  if (msgEl) msgEl.textContent = message || "";
  if (titleEl) titleEl.textContent = isError ? "Ocurrió un error" : "Registro exitoso";
  if (iconEl) iconEl.textContent = isError ? "!" : "✓";

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeResultModal() {
  const modal = $("resultModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

// ============================
// Modal: Planchas registradas (lee planchas.json)
// ============================
function openPlanchasModal() {
  const modal = $("planchasModal");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closePlanchasModal() {
  const modal = $("planchasModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function setPlanchasStatus(text) {
  const el = $("planchasStatus");
  if (el) el.textContent = text || "";
}

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

async function fetchPlanchasJson() {
  if (!planchasJsonUrl || planchasJsonUrl === "PON_AQUI_TU_URL_PUBLICA_DE_ONEDRIVE") {
    throw new Error("Falta configurar la URL pública de OneDrive (planchasJsonUrl). ");
  }

  const res = await fetch(withCacheBuster(planchasJsonUrl), {
    method: "POST",
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) {
    throw new Error(`No se pudo leer el archivo JSON (HTTP ${res.status}).`);
  }

  // OneDrive puede devolver content-type text/plain; parseamos igual
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) {
    const txt = await res.text();
    return JSON.parse(txt);
  }
  return await res.json();
}

function renderPlanchas(data) {
  const container = $("planchasContainer");
  if (!container) return;

  const planchas = Array.isArray(data?.planchas) ? data.planchas : [];
  if (planchas.length === 0) {
    container.innerHTML = `<div class="muted">Aún no hay planchas registradas.</div>`;
    return;
  }

  // Mostrar más recientes arriba
  const ordered = [...planchas].reverse();
  setPlanchasStatus(`Total planchas: ${planchas.length}`);

  container.innerHTML = ordered.map((p) => {
    const planchaId = escapeHtml(p?.plancha || "(sin id)");
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
          <td>${pc}</td>
          <td>${pn}</td>
          <td>${sc}</td>
          <td>${sn}</td>
        </tr>
      `;
    }).join("");

    return `
      <section class="plancha-card">
        <h4 class="plancha-title">Plancha: ${planchaId}</h4>
        <div style="overflow:auto;">
          <table class="plancha-table" aria-label="Plancha ${planchaId}">
            <thead>
              <tr>
                <th style="width:60px;">#</th>
                <th>Principal (cédula)</th>
                <th>Principal (nombre)</th>
                <th>Suplente (cédula)</th>
                <th>Suplente (nombre)</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="5" class="muted">Sin registros</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }).join("");
}

async function loadPlanchas() {
  setPlanchasStatus("Cargando…");
  const container = $("planchasContainer");
  if (container) container.innerHTML = "";

  try {
    const data = await fetchPlanchasJson();
    renderPlanchas(data);
  } catch (err) {
    console.error(err);
    setPlanchasStatus("");
    const msg = err?.message || "No se pudo cargar el historial.";
    if (container) {
      container.innerHTML = `
        <div class="error">${escapeHtml(msg)}</div>
        <div class="muted" style="margin-top:8px;">
          Verifica que el enlace de OneDrive sea público y permita lectura desde el navegador (CORS).
        </div>
      `;
    }
  }
}

// ============================
// Tabla dinámica Principal/Suplente
// ============================
let rowIdSeq = 0;

function clearCellError(tr, field) {
  const el = tr.querySelector(`.cell-error[data-err="${field}"]`);
  if (el) el.textContent = "";
}

function setCellError(tr, field, msg) {
  const el = tr.querySelector(`.cell-error[data-err="${field}"]`);
  if (el) el.textContent = msg || "";
}

function makeRow(index) {
  rowIdSeq += 1;

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><strong class="muted">${index}</strong></td>

    <td>
      <input class="row-input" type="text" inputmode="numeric" autocomplete="off"
             name="principal" placeholder="Ingrese cédula del Principal" />
      <div class="cell-error" data-err="principal"></div>
    </td>

    <td>
      <input class="row-input" type="text" inputmode="numeric" autocomplete="off"
             name="suplente" placeholder="Ingrese cédula del Suplente" />
      <div class="cell-error" data-err="suplente"></div>
    </td>

    <td class="td-actions">
      <button type="button" class="btn btn-small btn-remove">Eliminar</button>
    </td>
  `;

  const principalInput = tr.querySelector('input[name="principal"]');
  const suplenteInput  = tr.querySelector('input[name="suplente"]');

  principalInput.addEventListener("input", () => {
    principalInput.value = onlyDigits(principalInput.value).slice(0, 12);
    clearCellError(tr, "principal");
  });

  suplenteInput.addEventListener("input", () => {
    suplenteInput.value = onlyDigits(suplenteInput.value).slice(0, 12);
    clearCellError(tr, "suplente");
  });

  tr.querySelector(".btn-remove").addEventListener("click", () => {
    const tbody = $("rowsTbody");
    tr.remove();

    // no permitir 0 filas
    if (!tbody.querySelector("tr")) {
      tbody.appendChild(makeRow(1));
    }

    renumberRows();
  });

  return tr;
}

function renumberRows() {
  const rows = Array.from($("rowsTbody").querySelectorAll("tr"));
  rows.forEach((tr, idx) => {
    const cell = tr.querySelector("td strong");
    if (cell) cell.textContent = String(idx + 1);
  });

  const label = $("rowCountLabel");
    if (label) label.textContent = `Renglón: ${rows.length}`;
}

// Limpia la tabla sin mostrar mensajes
function resetFormSilently() {
  const tbody = $("rowsTbody");
  tbody.innerHTML = "";
  tbody.appendChild(makeRow(1));
  renumberRows();
}

// ============================
// JSON para Power Automate
// ============================
function collectRowsJson() {
  const rows = Array.from($("rowsTbody").querySelectorAll("tr"));

  const registros = [];
  const validaciones = [];

  rows.forEach((tr, idx) => {
    const orden = idx + 1;
    const principal = onlyDigits(tr.querySelector('input[name="principal"]')?.value || "");
    const suplente  = onlyDigits(tr.querySelector('input[name="suplente"]')?.value || "");

    registros.push({ orden, principal, suplente });

    validaciones.push({ tipo: "principal", orden, cedula: principal });
    validaciones.push({ tipo: "suplente",  orden, cedula: suplente  });
  });

  return { registros, validaciones };
}


// ============================
// Validación (formato + unicidad global)
// ============================
function validateRows() {
  const rows = Array.from($("rowsTbody").querySelectorAll("tr"));
  let ok = true;

  const seen = new Map(); // cedula -> { tr, field }

  rows.forEach((tr) => {
    const p = onlyDigits(tr.querySelector('input[name="principal"]')?.value || "");
    const s = onlyDigits(tr.querySelector('input[name="suplente"]')?.value || "");

    clearCellError(tr, "principal");
    clearCellError(tr, "suplente");

    // Formato
    if (!isValidCedula(p)) { setCellError(tr, "principal", "Cédula inválida (5–12 dígitos)."); ok = false; }
    if (!isValidCedula(s)) { setCellError(tr, "suplente", "Cédula inválida (5–12 dígitos)."); ok = false; }

    // Unicidad global
    if (isValidCedula(p)) {
      if (seen.has(p)) {
        const prev = seen.get(p);
        setCellError(prev.tr, prev.field, "Cédula repetida (debe ser única).");
        setCellError(tr, "principal", "Cédula repetida (debe ser única).");
        ok = false;
      } else {
        seen.set(p, { tr, field: "principal" });
      }
    }

    if (isValidCedula(s)) {
      if (seen.has(s)) {
        const prev = seen.get(s);
        setCellError(prev.tr, prev.field, "Cédula repetida (debe ser única).");
        setCellError(tr, "suplente", "Cédula repetida (debe ser única).");
        ok = false;
      } else {
        seen.set(s, { tr, field: "suplente" });
      }
    }
  });

  return ok;
}

// ============================
// INIT + SUBMIT
// ============================
document.addEventListener("DOMContentLoaded", () => {
  const form = $("coopetrolForm");
  const tbody = $("rowsTbody");

  // fila inicial
  tbody.appendChild(makeRow(1));
  renumberRows();

  // Agregar fila
  $("addRowBtn")?.addEventListener("click", () => {
    const rows = tbody.querySelectorAll("tr").length;
    tbody.appendChild(makeRow(rows + 1));
    renumberRows();
  });

  // Limpiar manual (sin modal)
  $("resetBtn")?.addEventListener("click", () => {
    resetFormSilently();
  });

  // Modal: cerrar con botón o click en fondo (si usas data-close="1")
  $("resultOkBtn")?.addEventListener("click", closeResultModal);
  $("resultModal")?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close) closeResultModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeResultModal();
  });

  // Modal: Planchas registradas
  $("openPlanchasBtn")?.addEventListener("click", async () => {
    openPlanchasModal();
    await loadPlanchas();
  });

  $("refreshPlanchasBtn")?.addEventListener("click", loadPlanchas);
  $("closePlanchasBtn")?.addEventListener("click", closePlanchasModal);
  $("planchasModal")?.addEventListener("click", (e) => {
    if (e.target?.dataset?.close) closePlanchasModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePlanchasModal();
  });

  // Enviar
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!validateRows()) {
      openResultModal("Revisa los campos marcados en rojo.", true);
      return;
    }

    if (!endpoint || endpoint === "PON_AQUI_TU_ENDPOINT_REAL") {
      openResultModal("Falta configurar el endpoint real del Flow.", true);
      return;
    }

    try {
      setLoading(true, "Enviando información...");

      const rowsJson = collectRowsJson();
      const payload = {
        submittedAt: new Date().toISOString(),
        ...rowsJson
      };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const ct = response.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await response.json() : null;
      const text = data ? "" : await response.text();

      if (!response.ok) {
        const detail = data?.message || text || `HTTP ${response.status}`;
        openResultModal(`${detail}`, true);
        return;
      }

      // éxito: limpiar + modal con mensaje del flow
      const msg = data?.message || "El registro se completó con éxito.";
      resetFormSilently();
      openResultModal(msg, false);

    } catch (err) {
      console.error(err);
      openResultModal("Ocurrió un error al enviar. Revisa consola (F12).", true);
    } finally {
      setLoading(false);
    }
  });
});
