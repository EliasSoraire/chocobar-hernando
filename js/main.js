// ═══════════════════════════════════════════
//   CHOCOBAR HERNANDO PROPIEDADES — main.js
// ═══════════════════════════════════════════

// ── SUPABASE CONFIG ──
const SUPABASE_URL = "https://altycarwoweybgmxecix.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdHljYXJ3b3dleWJnbXhlY2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjE3MzAsImV4cCI6MjA5Mjg5NzczMH0.dwCZIsxw0z47XUow-a5aTnXy87Qmm0127F5RhQMEmHs";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ESTADO GLOBAL ──
let todasLasPropiedades = [];
let filtroOperacion = "todos";
let filtroTipo = "todos";
let fotosModal = [];
let fotoActual = 0;

// ── NÚMERO DE WHATSAPP ──
const WSP_NUM = "543813638521";

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  cargarTipos();
  cargarPropiedades();
});

// ═══════════════════════════════
//   CARGA DE DATOS
// ═══════════════════════════════

async function cargarTipos() {
  try {
    const { data, error } = await db
      .from("tipos_propiedad")
      .select("*")
      .order("nombre");

    if (error) throw error;
    if (!data || data.length === 0) return;

    const cont = document.getElementById("filtrosTipo");
    data.forEach((t) => {
      const btn = document.createElement("button");
      btn.className = "filtro-btn";
      btn.textContent = t.nombre;
      btn.onclick = () => setFiltroTipo(t.id, btn);
      cont.appendChild(btn);
    });
  } catch (err) {
    console.error("Error cargando tipos:", err);
  }
}

async function cargarPropiedades() {
  try {
    const { data, error } = await db
      .from("propiedades")
      .select(
        `
        *,
        tipos_propiedad(nombre),
        fotos_propiedad(url, orden, es_principal)
      `,
      )
      .order("destacada", { ascending: false })
      .order("creado_en", { ascending: false });

    if (error) throw error;

    todasLasPropiedades = data || [];
    renderPropiedades();
  } catch (err) {
    console.error("Error cargando propiedades:", err);
    document.getElementById("propiedadesGrid").innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>No se pudieron cargar las propiedades. Intentá de nuevo más tarde.</p>
      </div>`;
  }
}

// ═══════════════════════════════
//   RENDER DE CARDS
// ═══════════════════════════════

function renderPropiedades() {
  const grid = document.getElementById("propiedadesGrid");
  let filtradas = [...todasLasPropiedades];

  if (filtroOperacion !== "todos") {
    filtradas = filtradas.filter((p) => p.operacion === filtroOperacion);
  }
  if (filtroTipo !== "todos") {
    filtradas = filtradas.filter((p) => p.tipo_id == filtroTipo);
  }

  if (filtradas.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <p>No hay propiedades en esta categoría</p>
      </div>`;
    return;
  }

  grid.innerHTML = filtradas.map((p) => buildCard(p)).join("");
}

function buildCard(p) {
  const fotos = ordenarFotos(p.fotos_propiedad || []);
  const fotoPrincipal = fotos.find((f) => f.es_principal) || fotos[0];
  const noDisp = p.estado !== "disponible";
  const sellos = {
    vendido: "VENDIDO",
    alquilado: "ALQUILADO",
    no_disponible: "NO DISPONIBLE",
  };

  // Imagen
  const imgHTML = fotoPrincipal
    ? `<img class="card-img" src="${fotoPrincipal.url}" alt="${escapeHTML(p.titulo)}" loading="lazy" />`
    : `<div class="card-img-placeholder">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>Sin fotos</span>
       </div>`;

  // Overlay estado
  const overlayHTML = noDisp
    ? `<div class="estado-overlay">
        <div class="estado-sello">${sellos[p.estado] || "NO DISPONIBLE"}</div>
       </div>`
    : "";

  // Precio
  const precioHTML = p.precio
    ? `<div class="card-precio">USD ${Number(p.precio).toLocaleString("es-AR")}</div>`
    : `<div class="card-precio" style="font-size:0.9rem;color:var(--texto-medio)">Consultar precio</div>`;

  // Botón WhatsApp
  const wspMsg = encodeURIComponent(
    `Hola! Me interesa la propiedad: ${p.titulo}${p.direccion ? " en " + p.direccion : ""}`,
  );
  const wspHTML = noDisp
    ? `<span style="font-size:0.8rem;color:var(--texto-medio);font-weight:500">No disponible</span>`
    : `<a href="https://wa.me/${WSP_NUM}?text=${wspMsg}" target="_blank" class="btn-wsp" onclick="event.stopPropagation()">
        ${iconoWsp(16)} Consultar
       </a>`;

  // Features
  const features = [];
  if (p.ambientes) features.push(`🏠 ${p.ambientes} amb.`);
  if (p.dormitorios) features.push(`🛏 ${p.dormitorios} dorm.`);
  if (p.banos) features.push(`🚿 ${p.banos} baño${p.banos > 1 ? "s" : ""}`);
  if (p.m2_cubiertos) features.push(`📐 ${p.m2_cubiertos}m²`);
  if (p.cochera) features.push(`🚗 Cochera`);

  const featuresHTML = features.length
    ? `<div class="card-features">${features.map((f) => `<span class="feature-chip">${f}</span>`).join("")}</div>`
    : "";

  return `
    <div class="card ${noDisp ? "card-no-disponible" : ""}" onclick="abrirModal('${p.id}')">
      <div class="card-img-wrap">
        ${imgHTML}
        ${overlayHTML}
        <span class="badge-operacion badge-${p.operacion}">
          ${p.operacion === "venta" ? "Venta" : "Alquiler"}
        </span>
        ${p.destacada ? '<span class="badge-destacada">⭐ Destacada</span>' : ""}
      </div>
      <div class="card-body">
        <div class="card-tipo">${p.tipos_propiedad?.nombre || ""}</div>
        <h3 class="card-titulo">${escapeHTML(p.titulo)}</h3>
        ${p.direccion ? `<div class="card-direccion">📍 ${escapeHTML(p.direccion)}${p.barrio ? ", " + escapeHTML(p.barrio) : ""}</div>` : ""}
        ${p.descripcion ? `<p class="card-descripcion">${escapeHTML(p.descripcion)}</p>` : ""}
        ${featuresHTML}
        <div class="card-footer">
          ${precioHTML}
          ${wspHTML}
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════
//   FILTROS
// ═══════════════════════════════

function setFiltroOperacion(val, btn) {
  filtroOperacion = val;
  document
    .querySelectorAll("#filtrosOperacion .filtro-btn")
    .forEach((b) => b.classList.remove("activo-operacion"));
  btn.classList.add("activo-operacion");
  renderPropiedades();
}

function setFiltroTipo(val, btn) {
  filtroTipo = val;
  document
    .querySelectorAll("#filtrosTipo .filtro-btn")
    .forEach((b) => b.classList.remove("activo"));
  btn.classList.add("activo");
  renderPropiedades();
}

// ═══════════════════════════════
//   MODAL
// ═══════════════════════════════

function abrirModal(id) {
  const p = todasLasPropiedades.find((x) => x.id === id);
  if (!p) return;

  fotosModal = ordenarFotos(p.fotos_propiedad || []);
  fotoActual = 0;

  // Título
  document.getElementById("modalTitulo").textContent = p.titulo;

  // Descripción
  document.getElementById("modalDesc").textContent =
    p.descripcion || "Sin descripción disponible.";

  // Precio
  const precioStr = p.precio
    ? `USD ${Number(p.precio).toLocaleString("es-AR")}`
    : "Consultar precio";
  document.getElementById("modalPrecio").textContent = precioStr;

  // Botón WhatsApp
  const noDisp = p.estado !== "disponible";
  const btnWsp = document.getElementById("modalBtnWsp");
  if (noDisp) {
    btnWsp.style.display = "none";
  } else {
    btnWsp.style.display = "inline-flex";
    const msg = encodeURIComponent(
      `Hola! Me interesa la propiedad: ${p.titulo}${p.direccion ? " en " + p.direccion : ""}. Precio: ${precioStr}`,
    );
    btnWsp.href = `https://wa.me/${WSP_NUM}?text=${msg}`;
  }

  // Info chips
  const chips = [];
  if (p.tipos_propiedad?.nombre) chips.push([p.tipos_propiedad.nombre, "Tipo"]);
  if (p.operacion)
    chips.push([p.operacion === "venta" ? "Venta" : "Alquiler", "Operación"]);
  if (p.ambientes) chips.push([p.ambientes, "Ambientes"]);
  if (p.dormitorios) chips.push([p.dormitorios, "Dormitorios"]);
  if (p.banos) chips.push([p.banos, "Baños"]);
  if (p.m2_totales) chips.push([`${p.m2_totales}m²`, "Sup. Total"]);
  if (p.m2_cubiertos) chips.push([`${p.m2_cubiertos}m²`, "Sup. Cubierta"]);
  if (p.cochera) chips.push(["Sí", "Cochera"]);

  document.getElementById("modalInfoGrid").innerHTML = chips
    .map(
      ([v, l]) => `
      <div class="info-chip">
        <div class="info-chip-val">${v}</div>
        <div class="info-chip-label">${l}</div>
      </div>`,
    )
    .join("");

  actualizarGaleria();
  document.getElementById("modalOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function actualizarGaleria() {
  const gallery = document.getElementById("modalGallery");

  if (fotosModal.length === 0) {
    gallery.innerHTML = `
      <div class="card-img-placeholder" style="height:100%">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:0.3">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>Sin fotos disponibles</span>
      </div>`;
    return;
  }

  // Restaurar estructura si fue reemplazada
  if (!document.getElementById("modalImgPrincipal")) {
    gallery.innerHTML = `
      <img id="modalImgPrincipal" src="" alt="" />
      <button class="gallery-nav gallery-prev" onclick="galeriaAnterior()">‹</button>
      <button class="gallery-nav gallery-next" onclick="galeriaSiguiente()">›</button>
      <div class="gallery-counter" id="galeriaCounter">1 / 1</div>`;
  }

  document.getElementById("modalImgPrincipal").src = fotosModal[fotoActual].url;
  document.getElementById("galeriaCounter").textContent =
    `${fotoActual + 1} / ${fotosModal.length}`;
}

function galeriaSiguiente() {
  if (!fotosModal.length) return;
  fotoActual = (fotoActual + 1) % fotosModal.length;
  actualizarGaleria();
}

function galeriaAnterior() {
  if (!fotosModal.length) return;
  fotoActual = (fotoActual - 1 + fotosModal.length) % fotosModal.length;
  actualizarGaleria();
}

function cerrarModal(e) {
  if (e.target === document.getElementById("modalOverlay")) {
    cerrarModalBtn();
  }
}

function cerrarModalBtn() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

// Cerrar modal con tecla Escape
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") cerrarModalBtn();
});

// ═══════════════════════════════
//   NAVBAR
// ═══════════════════════════════

function toggleMenu() {
  document.getElementById("navLinks").classList.toggle("open");
}

// Cerrar menú al hacer click en un link
document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    document.getElementById("navLinks").classList.remove("open");
  });
});

window.addEventListener("scroll", () => {
  const nav = document.getElementById("navbar");
  if (window.scrollY > 60) {
    nav.style.background = "rgba(10,22,40,1)";
  } else {
    nav.style.background = "rgba(10,22,40,0.97)";
  }
});

// ═══════════════════════════════
//   UTILIDADES
// ═══════════════════════════════

function ordenarFotos(fotos) {
  return [...fotos].sort((a, b) => a.orden - b.orden);
}

function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function iconoWsp(size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.525 5.845L.057 23.082a.75.75 0 0 0 .921.921l5.297-1.458A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.712 9.712 0 0 1-4.953-1.354l-.355-.21-3.676 1.012 1.034-3.574-.231-.368A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
  </svg>`;
}
