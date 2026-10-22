const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(__dirname);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const icon = (body) => `<span class="servicio-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg></span>`;
const documentIcon = '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>';
const cards = [
  ['card gestiones-imagen-card gestiones-autorizaciones-card', 'card servicio-card', icon('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 12l3 3 5-6"/>'), 'Solicitar autorización', 'Completá el formulario y adjuntá la documentación para tu solicitud.'],
  ['card gestiones-imagen-card gestiones-altas-card', 'card servicio-card', icon('<circle cx="10" cy="8" r="4"/><path d="M3 21v-2a7 7 0 0 1 12-5M19 13v8M15 17h8"/>'), 'Iniciar alta', 'Iniciá tu afiliación y enviá la documentación necesaria desde aquí.'],
  ['card gestiones-imagen-card gestiones-recetas-card', 'card servicio-card', icon('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M12 5v6M9 15h6M9 18h4"/>'), 'Solicitar receta', 'Comunicate por WhatsApp para gestionar tu solicitud de receta.'],
  ['card turnos-consultorios-card', 'card servicio-card servicio-card--turnos', icon('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 16h2M14 16h2"/>')],
  ['card estudios-consultorios-card', 'card servicio-card', icon('<path d="M9 3h6M10 3v6l-6 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-6-9V3M8 15h8"/>')],
  ['card doc-imagen-card cartilla-imagen-card', 'card servicio-card servicio-card--documento', icon(documentIcon), 'Cartilla Médica', 'Consultá los prestadores y centros de atención de nuestra cartilla.'],
  ['card doc-imagen-card coseguros-imagen-card', 'card servicio-card servicio-card--documento', icon(documentIcon), 'Coseguros', 'Consultá la información de coseguros para tus prestaciones.'],
];
for (const [before, after, svg, title, description] of cards) {
  const needle = `<article class="${before}">`;
  if (!html.includes(needle)) throw new Error('No se encontró ' + before);
  html = html.replace(needle, `<article class="${after}">\n            ${svg}${title ? `\n            <h3>${title}</h3>\n            <p class="muted">${description}</p>` : ''}`);
}
html = html.replace('<h3>Solicite Aquí sus Estudios</h3>', '<h3>Solicitar Estudios</h3>');
html = html.replace('class="consultorios-search"', 'class="consultorios-search"\n            aria-label="Buscar especialidad o profesional"');
fs.writeFileSync(path.join(root, 'index.html'), html);
