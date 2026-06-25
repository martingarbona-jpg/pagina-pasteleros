/******************************************************
 * APP.JS FINAL ESTABLE - OBRA SOCIAL PASTELEROS
 ******************************************************/

const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby86fvv4wOHh3eth7mLTmvSwXiD6INr7syd0tJ7DPQ0gPeH7SvoCfdk6wb5pCRSDh81/exec";
const ESTUDIOS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzqxIr6at79rPnuHJKt9IRRX2hHzo1RpMXmO9H5hVu4MJo7Hxt8RnMdJ30l6fQxP2pw/exec";
const AUTORIZACIONES_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzPaE0KQeE1xvX1HkSrBJn-u-45-aYcX2Ub3TTj-l5ybKFOdFKDVzVfIHFX-by4k5-u7Q/exec";
const ALTAS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw53UsYFzWj-WMnaePao8zDwabcRGlcYHfFdGqLJ8FPy0ALysSd8w2JTLMqytqJLwTd/exec";

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
let consultoriosEspecialidades = [];

function normalizarTextoConsultorios(valor) {
  return (valor || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function filtrarConsultorios(especialidades, busqueda) {
  const termino = normalizarTextoConsultorios(busqueda);
  if (!termino) return especialidades || [];

  return (especialidades || []).reduce((resultados, spec) => {
    const especialidad = spec.especialidad || "";
    const coincideEspecialidad = normalizarTextoConsultorios(especialidad).includes(termino);

    if (coincideEspecialidad) {
      resultados.push(spec);
      return resultados;
    }

    const profesionales = (spec.profesionales || []).filter((prof) => {
      const nombre = normalizarTextoConsultorios(prof.nombre);
      const horarios = normalizarTextoConsultorios(prof.horarios);
      return nombre.includes(termino) || horarios.includes(termino);
    });

    if (profesionales.length) {
      resultados.push({ ...spec, profesionales });
    }

    return resultados;
  }, []);
}

function setConsultoriosOpen(open) {
  const container = document.getElementById("consultoriosContainer");
  const toggle = document.getElementById("btnToggleConsultorios");

  if (container) {
    container.classList.toggle("is-open", open);
  }

  if (toggle) {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Ocultar especialidades" : "Ver especialidades";
  }
}

function isConsultoriosMobile() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function renderConsultorios(container, especialidades) {
  container.innerHTML = "";

  if (!(especialidades || []).length) {
    container.innerHTML = `<article class="consultorios-empty">No se encontraron especialidades.</article>`;
    return;
  }

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
      const nombre = prof.nombre || "";
      const horarios = prof.whatsapp ? "" : (prof.horarios || "");
      const whatsapp = (prof.whatsapp || "").toString().trim();

      html += `
        <li>
          <strong>${nombre}</strong>`;

      if (horarios) {
        html += `<br><span class="muted">${horarios}</span>`;
      }

      if (whatsapp) {
        const isFonoaudiologia = (spec.especialidad || "").toLowerCase() === "fonoaudiología";
        const turnoLabel = isFonoaudiologia ? '<span class="consultorio-whatsapp-label">Pedir turno</span>' : "";

        html += `
          <div class="consultorio-whatsapp-wrap${isFonoaudiologia ? " consultorio-whatsapp-wrap--turno" : ""}">
            <a class="consultorio-whatsapp-btn" href="https://wa.me/${encodeURIComponent(whatsapp)}" target="_blank" rel="noopener" aria-label="Contactar por WhatsApp">
              <svg viewBox="0 0 32 32" class="consultorio-whatsapp-icon" aria-hidden="true">
                <path fill="currentColor" d="M19.11 17.57c-.27-.14-1.6-.79-1.85-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.15-.42-2.2-1.35-.81-.72-1.36-1.6-1.52-1.87-.16-.27-.02-.42.12-.56.13-.13.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.83-2.01-.22-.54-.44-.47-.61-.48h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.98 2.64 1.12 2.82c.14.18 1.94 2.96 4.7 4.15.66.28 1.18.45 1.58.58.66.21 1.26.18 1.74.11.53-.08 1.6-.65 1.83-1.27.23-.61.23-1.14.16-1.27-.07-.13-.25-.2-.52-.34z"/>
                <path fill="currentColor" d="M16 0C7.16 0 0 7.16 0 16c0 2.82.73 5.58 2.12 8.03L0 32l8.17-2.14C10.56 31.27 13.27 32 16 32c8.84 0 16-7.16 16-16S24.84 0 16 0zm0 29.09c-2.46 0-4.86-.66-6.97-1.9l-.5-.3-4.85 1.27 1.29-4.73-.33-.49A12.97 12.97 0 013.01 16C3.01 8.83 8.83 3.01 16 3.01S28.99 8.83 28.99 16 23.17 29.09 16 29.09z"/>
              </svg>
              ${turnoLabel}
            </a>
          </div>`;
      }

      html += `</li>`;
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
  const buscador = document.getElementById("buscadorConsultorios");
  const toggle = document.getElementById("btnToggleConsultorios");

  if (!container) return;

  toggle?.addEventListener("click", () => {
    setConsultoriosOpen(!container.classList.contains("is-open"));
  });

  buscador?.addEventListener("input", () => {
    const resultados = filtrarConsultorios(consultoriosEspecialidades, buscador.value);
    renderConsultorios(container, resultados);

    if (isConsultoriosMobile() && buscador.value.trim()) {
      setConsultoriosOpen(true);
    }
  });

  fetch("consultorios.json?v=" + Date.now(), { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Error HTTP consultorios.json");
      return response.json();
    })
    .then((data) => {
      if (loader) loader.style.display = "none";
      container.style.display = "grid";
      consultoriosEspecialidades = data.especialidades || [];
      renderConsultorios(container, filtrarConsultorios(consultoriosEspecialidades, buscador?.value || ""));
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
      const reg = await navigator.serviceWorker.register("service-worker.js?v=5");

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
  activarSolicitudEstudios();
  activarSolicitudAutorizaciones();
  activarSolicitudAltas();

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


function abrirModalEstudios() {
  const modal = document.getElementById("estudiosModal");
  const msg = document.getElementById("estudiosMsg");

  if (!modal) return;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (msg) {
    msg.textContent = "";
    msg.classList.remove("is-error");
  }

  setTimeout(() => {
    document.getElementById("estudiosNombre")?.focus();
  }, 80);
}

function abrirModalAutorizaciones() {
  const modal = document.getElementById("autorizacionesModal");
  const msg = document.getElementById("autorizacionesMsg");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  if (msg) {
    msg.textContent = "";
    msg.classList.remove("is-error");
  }
  setTimeout(() => document.getElementById("autorizacionesNombre")?.focus(), 80);
}

function cerrarModalAutorizaciones() {
  const modal = document.getElementById("autorizacionesModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function validarFormularioAutorizaciones({ nombre, dniTitular, email, comentarios }) {
  return Boolean(nombre && dniTitular && email && comentarios);
}

function leerArchivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : "";
      resolve({ nombre: file.name, mimeType: file.type, base64 });
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

async function convertirArchivosABase64(files) {
  return Promise.all((files || []).map((file) => leerArchivoComoBase64(file)));
}

function actualizarResumenArchivosAutorizaciones(files) {
  const resumen = document.getElementById("autorizacionesArchivosResumen");
  if (!resumen) return;
  if (!files.length) {
    resumen.textContent = "Sin archivos seleccionados.";
    return;
  }
  const nombres = files.map((file) => file.name).join(", ");
  resumen.innerHTML = `<strong>${files.length}</strong> archivo(s) seleccionado(s): ${nombres}`;
}


function abrirModalAltas() {
  const modal = document.getElementById("altasModal");
  const msg = document.getElementById("altasMsg");
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  if (msg) {
    msg.textContent = "";
    msg.classList.remove("is-error");
  }
  setTimeout(() => document.getElementById("altasNombre")?.focus(), 80);
}

function cerrarModalAltas() {
  const modal = document.getElementById("altasModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function validarFormularioAltas({ nombre, dni, email, dniFrente, dniDorso, bonoSueldo }) {
  return Boolean(nombre && dni && email && dniFrente && dniDorso && bonoSueldo);
}

function actualizarResumenArchivoAlta(inputId, resumenId) {
  const input = document.getElementById(inputId);
  const resumen = document.getElementById(resumenId);
  if (!resumen) return;
  const file = input?.files?.[0];
  resumen.textContent = file ? `Archivo seleccionado: ${file.name}` : "Sin archivo seleccionado.";
}

async function activarSolicitudAltas() {
  const btnAbrir = document.getElementById("btnAbrirAltas");
  const form = document.getElementById("altasForm");
  const btnEnviar = document.getElementById("btnEnviarAltas");
  const msg = document.getElementById("altasMsg");
  const dniFrenteInput = document.getElementById("altasDniFrente");
  const dniDorsoInput = document.getElementById("altasDniDorso");
  const bonoSueldoInput = document.getElementById("altasBonoSueldo");
  const archivosFamiliaresInput = document.getElementById("altasArchivosFamiliares");

  btnAbrir?.addEventListener("click", abrirModalAltas);
  document.querySelectorAll("[data-close-altas]").forEach((el) => el.addEventListener("click", cerrarModalAltas));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cerrarModalAltas();
  });

  dniFrenteInput?.addEventListener("change", () => actualizarResumenArchivoAlta("altasDniFrente", "altasDniFrenteResumen"));
  dniDorsoInput?.addEventListener("change", () => actualizarResumenArchivoAlta("altasDniDorso", "altasDniDorsoResumen"));
  bonoSueldoInput?.addEventListener("change", () => actualizarResumenArchivoAlta("altasBonoSueldo", "altasBonoSueldoResumen"));

  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nombre = (document.getElementById("altasNombre")?.value || "").trim();
    const dni = (document.getElementById("altasDni")?.value || "").replace(/\D+/g, "");
    const email = (document.getElementById("altasEmail")?.value || "").trim();
    const comentarios = (document.getElementById("altasComentarios")?.value || "").trim();
    const dniFrente = dniFrenteInput?.files?.[0];
    const dniDorso = dniDorsoInput?.files?.[0];
    const bonoSueldo = bonoSueldoInput?.files?.[0];
    const archivosFamiliaresFiles = Array.from(archivosFamiliaresInput?.files || []);

    if (!validarFormularioAltas({ nombre, dni, email, dniFrente, dniDorso, bonoSueldo })) {
      if (msg) {
        msg.textContent = "Completá los campos obligatorios y adjuntá la documentación.";
        msg.classList.add("is-error");
      }
      return;
    }

    if (btnEnviar) {
      btnEnviar.disabled = true;
      btnEnviar.textContent = "Enviando solicitud...";
    }
    if (msg) {
      msg.textContent = "Enviando solicitud...";
      msg.classList.remove("is-error");
    }

    try {
      const archivos = await Promise.all([
        leerArchivoComoBase64(dniFrente),
        leerArchivoComoBase64(dniDorso),
        leerArchivoComoBase64(bonoSueldo),
      ]);

      const archivosNombrados = [
        { ...archivos[0], nombre: `DNI Frente - ${archivos[0].nombre}` },
        { ...archivos[1], nombre: `DNI Dorso - ${archivos[1].nombre}` },
        { ...archivos[2], nombre: `Bono de Sueldo - ${archivos[2].nombre}` },
      ];
      const archivosFamiliares = await convertirArchivosABase64(archivosFamiliaresFiles);

      await fetch(ALTAS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ nombre, dni, email, comentarios, archivos: archivosNombrados, archivosFamiliares }),
      });

      if (msg) {
        msg.textContent = "Solicitud enviada correctamente.";
        msg.classList.remove("is-error");
      }
      form.reset();
      actualizarResumenArchivoAlta("altasDniFrente", "altasDniFrenteResumen");
      actualizarResumenArchivoAlta("altasDniDorso", "altasDniDorsoResumen");
      actualizarResumenArchivoAlta("altasBonoSueldo", "altasBonoSueldoResumen");
      setTimeout(() => cerrarModalAltas(), 1600);
    } catch (error) {
      console.error("Error enviando alta:", error);
      if (msg) {
        msg.textContent = "No se pudo enviar la solicitud. Intentá nuevamente.";
        msg.classList.add("is-error");
      }
    } finally {
      if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.textContent = "Enviar solicitud";
      }
    }
  });
}

function activarSolicitudAutorizaciones() {
  const btnAbrir = document.getElementById("btnAbrirAutorizaciones");
  const form = document.getElementById("autorizacionesForm");
  const inputArchivos = document.getElementById("autorizacionesArchivos");
  const btnEnviar = document.getElementById("btnEnviarAutorizaciones");
  const msg = document.getElementById("autorizacionesMsg");

  btnAbrir?.addEventListener("click", abrirModalAutorizaciones);
  document.querySelectorAll("[data-close-autorizaciones]").forEach((el) => {
    el.addEventListener("click", cerrarModalAutorizaciones);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cerrarModalAutorizaciones();
  });

  inputArchivos?.addEventListener("change", () => {
    const files = Array.from(inputArchivos.files || []);
    actualizarResumenArchivosAutorizaciones(files);
  });

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nombre = (document.getElementById("autorizacionesNombre")?.value || "").trim();
    const dniTitular = (document.getElementById("autorizacionesDniTitular")?.value || "").replace(/\D+/g, "");
    const dniPaciente = (document.getElementById("autorizacionesDniPaciente")?.value || "").replace(/\D+/g, "");
    const email = (document.getElementById("autorizacionesEmail")?.value || "").trim();
    const comentarios = (document.getElementById("autorizacionesComentarios")?.value || "").trim();
    const files = Array.from(inputArchivos?.files || []);

    if (!validarFormularioAutorizaciones({ nombre, dniTitular, email, comentarios })) {
      if (msg) {
        msg.textContent = "Completá los campos obligatorios.";
        msg.classList.add("is-error");
      }
      return;
    }

    if (btnEnviar) {
      btnEnviar.disabled = true;
      btnEnviar.textContent = "Enviando solicitud...";
    }
    if (msg) {
      msg.textContent = "Enviando solicitud...";
      msg.classList.remove("is-error");
    }

    try {
      const archivos = await convertirArchivosABase64(files);
      await fetch(AUTORIZACIONES_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          nombre,
          dniTitular,
          dniPaciente,
          email,
          comentarios,
          archivos,
        }),
      });

      if (msg) {
        msg.textContent = "Solicitud enviada correctamente.";
        msg.classList.remove("is-error");
      }
      form.reset();
      actualizarResumenArchivosAutorizaciones([]);
      setTimeout(() => cerrarModalAutorizaciones(), 1600);
    } catch (error) {
      console.error("Error enviando autorización:", error);
      if (msg) {
        msg.textContent = "No se pudo enviar la solicitud. Intentá nuevamente.";
        msg.classList.add("is-error");
      }
    } finally {
      if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.textContent = "Enviar solicitud";
      }
    }
  });
}

function cerrarModalEstudios() {
  const modal = document.getElementById("estudiosModal");

  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function activarSolicitudEstudios() {
  const btnAbrir = document.getElementById("btnAbrirEstudios");
  const form = document.getElementById("estudiosForm");
  const msg = document.getElementById("estudiosMsg");
  const btnEnviar = document.getElementById("btnEnviarEstudios");

  if (btnAbrir) {
    btnAbrir.addEventListener("click", abrirModalEstudios);
  }

  document.querySelectorAll("[data-close-estudios]").forEach((el) => {
    el.addEventListener("click", cerrarModalEstudios);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") cerrarModalEstudios();
  });

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const nombre = (document.getElementById("estudiosNombre")?.value || "").trim();
    const dni = (document.getElementById("estudiosDni")?.value || "").replace(/\D+/g, "");
    const email = (document.getElementById("estudiosEmail")?.value || "").trim();
    const fechaEstudio = document.getElementById("estudiosFecha")?.value || "";
    const tipoEstudio = document.getElementById("estudiosTipo")?.value || "";

    if (!nombre || !dni || !email || !fechaEstudio || !tipoEstudio) {
      if (msg) {
        msg.textContent = "Completá todos los campos.";
        msg.classList.add("is-error");
      }
      return;
    }

    if (btnEnviar) {
      btnEnviar.disabled = true;
      btnEnviar.textContent = "Enviando...";
    }

    if (msg) {
      msg.textContent = "Enviando solicitud...";
      msg.classList.remove("is-error");
    }

    try {
      await fetch(ESTUDIOS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify({
          nombre,
          dni,
          email,
          fechaEstudio,
          tipoEstudio,
        }),
      });

      if (msg) {
        msg.textContent = "Solicitud enviada correctamente.";
        msg.classList.remove("is-error");
      }

      form.reset();

      setTimeout(() => {
        cerrarModalEstudios();
      }, 1600);
    } catch (error) {
      console.error("Error enviando solicitud de estudios:", error);

      if (msg) {
        msg.textContent = "No se pudo enviar la solicitud. Intentá nuevamente.";
        msg.classList.add("is-error");
      }
    } finally {
      if (btnEnviar) {
        btnEnviar.disabled = false;
        btnEnviar.textContent = "Enviar solicitud";
      }
    }
  });
}
