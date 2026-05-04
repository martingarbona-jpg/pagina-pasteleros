/******************************************************
 * APP.JS FINAL ESTABLE - OBRA SOCIAL PASTELEROS
 ******************************************************/

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxHY6kNTNWcrHd0oX6Bx7M858utqxYZayKNxu1m3uiU-twY7TqTAWjYaX8mK_lTgLLN/exec";

/* =========================
   JSONP
========================= */
function jsonp(url, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).substring(2);
    const script = document.createElement("script");
    let done = false;

    function cleanup() {
      if (done) return;
      done = true;
      try { delete window[cb]; } catch (_) {}
      script.remove();
      clearTimeout(timer);
    }

    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };

    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP error"));
    };

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    document.body.appendChild(script);
  });
}

/* =========================
   Hora validación 24hs
========================= */
function fechaHoraValidacion24() {
  const ahora = new Date();

  const fecha = ahora.toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Mendoza",
  });

  const hora = ahora.toLocaleTimeString("es-AR", {
    timeZone: "America/Argentina/Mendoza",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${fecha} ${hora}`;
}

/* =========================
   Plan según regla
========================= */
function calcularPlan(tipoAfiliado) {
  const t = (tipoAfiliado || "").toString().toUpperCase();

  if (t.includes("00 DE LA ACTIVIDAD GENUINO")) return "PLAN UNICO";
  if (t.includes("P.M.I") || t.includes("14")) return "P.M.I.";
  return "PLAN UNICO";
}

/* =========================
   URL QR (DOMINIO AUTOMÁTICO)
========================= */
function urlValidacionQR(dni) {
  return `${window.location.origin}/validar.html?dni=${encodeURIComponent(
    (dni || "").toString().replace(/\D+/g, "")
  )}`;
}
/* =========================
   Animación Cards
========================= */
function activarAnimacionCards() {
  const cards = document.querySelectorAll(".card");
  if (!cards.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in-view");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  cards.forEach((c) => obs.observe(c));
}

/* =========================
   Consultorios
========================= */
function renderConsultorios(container, especialidades) {
  container.innerHTML = "";

  function toggleCard(card) {
    const isOpen = card.classList.contains("is-open");

    container.querySelectorAll(".consultorio-card.is-open").forEach((openCard) => {
      openCard.classList.remove("is-open");
      openCard.setAttribute("aria-expanded", "false");
    });

    if (!isOpen) {
      card.classList.add("is-open");
      card.setAttribute("aria-expanded", "true");
    }
  }

  (especialidades || []).forEach((spec) => {
    const card = document.createElement("article");
    card.className = "card consultorio-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-expanded", "false");

    let html = `<h3 class="consultorio-title">${spec.especialidad || ""}</h3>`;
    html += `<div class="consultorio-detalle"><ul class="consultorio-list">`;

    (spec.profesionales || []).forEach((prof) => {
      html += `
        <li>
          <strong>${prof.nombre || ""}</strong><br>
          <span class="muted">${prof.horarios || ""}</span>
        </li>`;
    });

    html += `</ul></div>`;

    card.innerHTML = html;

    card.addEventListener("click", () => toggleCard(card));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleCard(card);
      }
    });

    container.appendChild(card);
  });

  activarAnimacionCards();
}

function cargarConsultorios() {
  const container = document.getElementById("consultoriosContainer");
  const loader = document.getElementById("consultoriosLoader");

  if (!container) return;

  fetch("consultorios.json?v=" + Date.now(), { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Error HTTP consultorios.json");
      return response.json();
    })
    .then((data) => {
      if (loader) loader.style.display = "none";
      container.style.display = "grid";
      renderConsultorios(container, data.especialidades || []);
    })
    .catch((error) => {
      console.error("Error cargando consultorios:", error);
      if (loader) loader.style.display = "none";
      container.style.display = "grid";
      container.innerHTML = `
        <article class="card">
          <h3>Error al cargar consultorios</h3>
          <p class="muted">No se pudo cargar la información.</p>
        </article>
      `;
      activarAnimacionCards();
    });
}

/* =========================
   Render Carnet Mejorado + QR + botón descargar
========================= */
function renderCarnet(c) {
  const fecha = fechaHoraValidacion24();
  const discapacidad = (c.discapacidad || "-").toString().toUpperCase();
  const tipoAfiliado = (c.TipoAfiliado || c.tipoAfiliado || "").toString().trim();
  const plan = calcularPlan(tipoAfiliado);

  const qrLink = urlValidacionQR(c.dni || "");

  return `
  <div id="carnetDescargable" style="
      position:relative;
      overflow:hidden;
      border-radius:22px;
      background:linear-gradient(180deg,#18b35a 0%, #0f8e45 100%);
      box-shadow:0 18px 40px rgba(0,0,0,0.22);
      font-family:Segoe UI, Arial, sans-serif;
      margin:0 auto;
      width:100%;
      max-width:640px;
    ">

    <div style="
      padding:14px 16px 10px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      color:#fff;
      position:relative;
      z-index:2;
    ">
      <img src="logo-elevar.png" alt="Elevar" style="height:52px;">
      <div style="text-align:right; line-height:1.1;">
        <div style="font-weight:900;font-size:14px;">OBRA SOCIAL</div>
        <div style="font-weight:900;font-size:14px;">PASTELEROS MENDOZA</div>
      </div>
    </div>

    <div style="
      position:absolute;
      left:-20px; right:-20px;
      top:34px;
      height:110px;
      display:flex;
      align-items:center;
      justify-content:center;
      transform:rotate(-12deg);
      font-size:26px;
      font-weight:900;
      letter-spacing:1px;
      color:rgba(255,255,255,0.07);
      pointer-events:none;
      z-index:1;
    ">
      VÁLIDO SOLO ONLINE
    </div>

    <div style="
      background:#fff;
      border-radius:18px;
      margin:10px 14px 14px;
      padding:14px;
      position:relative;
      z-index:2;
      box-shadow:0 10px 25px rgba(0,0,0,0.10);
    ">

      <div style="font-size:16px;font-weight:900;text-align:center;margin-bottom:8px;">
        ${(c.nombre || "").toString().trim()}
      </div>

      <div style="text-align:center;margin-bottom:10px;font-size:13px;">
        <b>DNI/N°AFILIADO:</b> ${c.dni || ""} &nbsp;&nbsp;
        <b>CUIL:</b> ${c.cuil || ""}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">
        <div><b>Discapacidad:</b><br>${discapacidad}</div>
        <div><b>Sexo:</b><br>${c.sexo || ""}</div>
        <div><b>Provincia:</b><br>${c.provincia || ""}</div>
        <div><b>Plan:</b><br>${plan}</div>
      </div>

      <div style="margin-top:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;">
        <div id="qrCarnet" style="
          width:130px;
          height:130px;
          border-radius:10px;
          background:#fff;
          padding:6px;
          border:1px solid #ddd;
          display:flex;
          align-items:center;
          justify-content:center;
        " data-qr="${qrLink}"></div>

        <div style="margin-top:6px;text-align:center;font-size:11px;color:#444;font-weight:700;">
          Escaneá para validar estado online
        </div>
      </div>

      <div style="margin-top:10px;text-align:center;font-size:11px;color:#666;font-weight:700;">
        Validado: ${fecha}
      </div>

    </div>
  </div>

  <div style="margin-top:14px;text-align:center;">
    <button id="btnDescargarCarnet" style="
      background:#0f8e45;
      color:#fff;
      border:none;
      padding:10px 18px;
      border-radius:8px;
      font-weight:700;
      cursor:pointer;
    ">
      Descargar carnet
    </button>
  </div>
  `;
}

function generarQRCarnet() {
  const qrBox = document.getElementById("qrCarnet");
  if (!qrBox || typeof QRCode === "undefined") return;

  const texto = qrBox.getAttribute("data-qr") || "";
  qrBox.innerHTML = "";

  new QRCode(qrBox, {
    text: texto,
    width: 118,
    height: 118,
    correctLevel: QRCode.CorrectLevel.H
  });
}

function activarDescargaCarnet() {
  const btn = document.getElementById("btnDescargarCarnet");
  const carnet = document.getElementById("carnetDescargable");

  if (!btn || !carnet || typeof html2canvas === "undefined") return;

  btn.addEventListener("click", () => {
    html2canvas(carnet, {
      backgroundColor: null,
      scale: 3,
      useCORS: true
    }).then((canvas) => {
      const link = document.createElement("a");
      link.download = "carnet-ospasteleros.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    }).catch((err) => {
      console.error("Error al descargar carnet:", err);
      alert("No se pudo descargar el carnet.");
    });
  });
}


let deferredInstallPrompt = null;

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("service-worker.js?v=2");

      if (reg.update) {
        reg.update();
      }

    } catch (error) {
      console.error("No se pudo registrar el service worker:", error);
    }
  });
}

function alternarPanelInstalacion() {
  const panel = document.getElementById("installPanel");
  const tab = document.getElementById("installPanelTab");
  if (!panel || !tab) return;

  const abrir = !panel.classList.contains("is-open");
  panel.classList.toggle("is-open", abrir);
  tab.setAttribute("aria-expanded", String(abrir));
}

function instalarApp() {
  const msg = document.getElementById("instalarAppMsg");

  if (!deferredInstallPrompt) {
    if (msg) {
      msg.textContent = "Si no aparece el instalador, abrí el menú del navegador y elegí 'Agregar a pantalla principal'.";
    }
    return;
  }

  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.finally(() => {
    deferredInstallPrompt = null;
  });
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function activarBotonInstalarApp() {
  const panel = document.getElementById("installPanel");

  if (
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true
) {
  if (panel) {
    panel.remove();
  }
  return;
}

  const tab = document.getElementById("installPanelTab");
  const btn = document.getElementById("btnInstalarApp");
  const msg = document.getElementById("instalarAppMsg");

  if (!panel || !tab || !btn || !msg) return;

  panel.hidden = window.innerWidth > 900;

  tab.addEventListener("click", alternarPanelInstalacion);
  btn.addEventListener("click", instalarApp);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    msg.textContent = "";
  });

  window.addEventListener("appinstalled", () => {
    msg.textContent = "¡Aplicación instalada correctamente!";
    panel.classList.remove("is-open");
    tab.setAttribute("aria-expanded", "false");
  });

  window.addEventListener("resize", () => {
    const enMovil = window.innerWidth <= 900;
    const ocultarPanel = !enMovil;
    panel.hidden = ocultarPanel;
    if (ocultarPanel) {
      panel.classList.remove("is-open");
      tab.setAttribute("aria-expanded", "false");
    }
  });
}

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {

  if (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  ) {
    document.body.classList.add("is-standalone");
  }

  const anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();

  cargarConsultorios();
  activarAnimacionCards();
  registrarServiceWorker();
  activarBotonInstalarApp();

  const btn = document.getElementById("btnGenerar");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const dni = (document.getElementById("dni")?.value || "").replace(/\D+/g, "");
    const nombre = (document.getElementById("nombre")?.value || "").trim();
    const msg = document.getElementById("msg");
    const wrap = document.getElementById("carnetWrap");
    const loading = document.getElementById("carnetLoading");

    if (msg) msg.textContent = "";
    if (wrap) {
      wrap.style.display = "none";
      wrap.innerHTML = "";
    }

    if (!dni || !nombre) {
      if (msg) msg.textContent = "Completá DNI y nombre.";
      return;
    }

    btn.disabled = true;
    if (loading) loading.style.display = "block";

    try {
      const res = await jsonp(
        `${SCRIPT_URL}?dni=${dni}&nombre=${encodeURIComponent(nombre)}&_=${Date.now()}`
      );

      if (!res || !res.ok) {
        if (msg) msg.textContent = "Datos incorrectos o afiliado INACTIVO.";
        return;
      }

      if (wrap) {
        wrap.innerHTML = renderCarnet(res.carnet);
        wrap.style.display = "block";

        generarQRCarnet();
        activarDescargaCarnet();

        setTimeout(() => {
          wrap.style.display = "none";
          wrap.innerHTML = "";
        }, 120000);
      }

    } catch (e) {
      console.error("Error validando afiliado:", e);
      if (msg) msg.textContent = "No se pudo validar en este momento.";
    } finally {
      btn.disabled = false;
      if (loading) loading.style.display = "none";
    }
  });
});
