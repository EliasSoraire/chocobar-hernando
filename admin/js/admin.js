// ═══════════════════════════════════════════
//   CHOCOBAR HERNANDO — admin.js
// ═══════════════════════════════════════════

// ── SUPABASE ──
const SUPABASE_URL = "https://altycarwoweybgmxecix.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsdHljYXJ3b3dleWJnbXhlY2l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjE3MzAsImV4cCI6MjA5Mjg5NzczMH0.dwCZIsxw0z47XUow-a5aTnXy87Qmm0127F5RhQMEmHs";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── ESTADO ──
let propiedades = [];
let tipos = [];
let fotosNuevas = []; // archivos nuevos a subir
let fotosExistentes = []; // fotos ya guardadas en Supabase
let fotosPrincipalIdx = 0; // índice de foto principal en fotosNuevas
let propIdEliminar = null;

// ── INIT ──
document.addEventListener("DOMContentLoaded", () => {
  verificarSesion();
});

// ═══════════════════════════════
//   AUTENTICACIÓN
// ═══════════════════════════════

async function verificarSesion() {
  const {
    data: { session },
  } = await db.auth.getSession();
  if (session) {
    mostrarDashboard();
  }
}

async function iniciarSesion() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";

  if (!email || !pass) {
    errEl.textContent = "Completá email y contraseña.";
    return;
  }

  const { error } = await db.auth.signInWithPassword({ email, password: pass });
  if (error) {
    errEl.textContent = "Email o contraseña incorrectos.";
    return;
  }

  mostrarDashboard();
}

async function cerrarSesion() {
  await db.auth.signOut();
  document.getElementById("dashboard").classList.add("hidden");
  document.getElementById("loginScreen").style.display = "flex";
}

function mostrarDashboard() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("dashboard").classList.remove("hidden");
  cargarTipos();
  cargarPropiedades();
}

// ── Enter en login ──
document.addEventListener("keydown", (e) => {
  if (
    e.key === "Enter" &&
    document.getElementById("loginScreen").style.display !== "none"
  ) {
    iniciarSesion();
  }
});

// ═══════════════════════════════
//   NAVEGACIÓN
// ═══════════════════════════════

function mostrarSeccion(nombre, btnActivo) {
  document
    .querySelectorAll(".seccion")
    .forEach((s) => s.classList.add("hidden"));
  document.getElementById(`seccion-${nombre}`).classList.remove("hidden");

  document
    .querySelectorAll(".nav-item")
    .forEach((b) => b.classList.remove("activo"));
  if (btnActivo) btnActivo.classList.add("activo");

  if (nombre === "nueva") {
    limpiarFormulario();
    document.getElementById("formTitulo").textContent = "Nueva propiedad";
  }
  if (nombre === "tipos") renderTipos();
}

// ═══════════════════════════════
//   TIPOS DE PROPIEDAD
// ═══════════════════════════════

async function cargarTipos() {
  const { data } = await db.from("tipos_propiedad").select("*").order("nombre");
  tipos = data || [];
  poblarSelectTipos();
}

function poblarSelectTipos() {
  const sel = document.getElementById("propTipo");
  const valorActual = sel.value;
  sel.innerHTML = '<option value="">Seleccioná un tipo</option>';
  tipos.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.id;
    opt.textContent = t.nombre;
    sel.appendChild(opt);
  });
  if (valorActual) sel.value = valorActual;
}

function renderTipos() {
  const lista = document.getElementById("tiposLista");
  if (tipos.length === 0) {
    lista.innerHTML =
      '<li style="color:var(--texto-medio);font-size:0.85rem">No hay tipos cargados.</li>';
    return;
  }
  lista.innerHTML = tipos
    .map(
      (t) => `
    <li class="tipo-item">
      <span>${t.nombre}</span>
      <button onclick="eliminarTipo(${t.id})">Eliminar</button>
    </li>`,
    )
    .join("");
}

async function agregarTipo() {
  const input = document.getElementById("nuevoTipo");
  const nombre = input.value.trim();
  if (!nombre) return;

  const { error } = await db.from("tipos_propiedad").insert({ nombre });
  if (error) {
    alert("Error al agregar tipo.");
    return;
  }

  input.value = "";
  await cargarTipos();
  renderTipos();
}

async function eliminarTipo(id) {
  if (
    !confirm(
      "¿Eliminar este tipo? Las propiedades que lo usen quedarán sin tipo.",
    )
  )
    return;
  await db.from("tipos_propiedad").delete().eq("id", id);
  await cargarTipos();
  renderTipos();
}

// ═══════════════════════════════
//   PROPIEDADES — CARGA Y TABLA
// ═══════════════════════════════

async function cargarPropiedades() {
  const { data } = await db
    .from("propiedades")
    .select(
      "*, tipos_propiedad(nombre), fotos_propiedad(url, orden, es_principal)",
    )
    .order("creado_en", { ascending: false });

  propiedades = data || [];
  renderTabla();
}

function renderTabla() {
  const filtroEstado = document.getElementById("filtroEstadoAdmin").value;
  const filtroOp = document.getElementById("filtroOpAdmin").value;

  let lista = [...propiedades];
  if (filtroEstado !== "todos")
    lista = lista.filter((p) => p.estado === filtroEstado);
  if (filtroOp !== "todos")
    lista = lista.filter((p) => p.operacion === filtroOp);

  const tbody = document.getElementById("tablaPropiedades");

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--texto-medio)">No hay propiedades</td></tr>`;
    return;
  }

  tbody.innerHTML = lista
    .map((p) => {
      const fotos = (p.fotos_propiedad || []).sort((a, b) => a.orden - b.orden);
      const foto = fotos.find((f) => f.es_principal) || fotos[0];
      const precio = p.precio
        ? `USD ${Number(p.precio).toLocaleString("es-AR")}`
        : "—";

      const fotoHTML = foto
        ? `<img src="${foto.url}" class="tabla-foto" alt="${p.titulo}" />`
        : `<div class="tabla-foto-placeholder">🏠</div>`;

      return `
      <tr>
        <td>${fotoHTML}</td>
        <td><strong>${p.titulo}</strong>${p.direccion ? `<br/><small style="color:var(--texto-medio)">${p.direccion}</small>` : ""}</td>
        <td>${p.tipos_propiedad?.nombre || "—"}</td>
        <td><span class="badge badge-${p.operacion}">${p.operacion === "venta" ? "Venta" : "Alquiler"}</span></td>
        <td><span class="badge badge-${p.estado}">${labelEstado(p.estado)}</span></td>
        <td>${precio}</td>
        <td>
          <div class="acciones">
            <button class="btn-accion btn-editar" onclick="editarPropiedad('${p.id}')">Editar</button>
            <button class="btn-accion btn-eliminar" onclick="abrirModalEliminar('${p.id}')">Eliminar</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");
}

function labelEstado(estado) {
  const labels = {
    disponible: "Disponible",
    vendido: "Vendido",
    alquilado: "Alquilado",
    no_disponible: "No disponible",
  };
  return labels[estado] || estado;
}

// ═══════════════════════════════
//   FORMULARIO — NUEVA / EDITAR
// ═══════════════════════════════

function limpiarFormulario() {
  document.getElementById("propId").value = "";
  document.getElementById("propTitulo").value = "";
  document.getElementById("propTipo").value = "";
  document.getElementById("propOperacion").value = "";
  document.getElementById("propEstado").value = "disponible";
  document.getElementById("propPrecio").value = "";
  document.getElementById("propDireccion").value = "";
  document.getElementById("propBarrio").value = "";
  document.getElementById("propAmbientes").value = "";
  document.getElementById("propDormitorios").value = "";
  document.getElementById("propBanos").value = "";
  document.getElementById("propM2Total").value = "";
  document.getElementById("propM2Cub").value = "";
  document.getElementById("propCochera").checked = false;
  document.getElementById("propDestacada").checked = false;
  document.getElementById("propDesc").value = "";
  document.getElementById("formError").textContent = "";
  document.getElementById("formSuccess").textContent = "";
  document.getElementById("fotosPreview").innerHTML = "";
  document.getElementById("fotosExistentes").innerHTML = "";
  document.getElementById("inputFotos").value = "";
  fotosNuevas = [];
  fotosExistentes = [];
  fotosPrincipalIdx = 0;
}

function editarPropiedad(id) {
  const p = propiedades.find((x) => x.id === id);
  if (!p) return;

  limpiarFormulario();
  document.getElementById("formTitulo").textContent = "Editar propiedad";
  document.getElementById("propId").value = p.id;

  document.getElementById("propTitulo").value = p.titulo || "";
  document.getElementById("propTipo").value = p.tipo_id || "";
  document.getElementById("propOperacion").value = p.operacion || "";
  document.getElementById("propEstado").value = p.estado || "disponible";
  document.getElementById("propPrecio").value = p.precio || "";
  document.getElementById("propDireccion").value = p.direccion || "";
  document.getElementById("propBarrio").value = p.barrio || "";
  document.getElementById("propAmbientes").value = p.ambientes || "";
  document.getElementById("propDormitorios").value = p.dormitorios || "";
  document.getElementById("propBanos").value = p.banos || "";
  document.getElementById("propM2Total").value = p.m2_totales || "";
  document.getElementById("propM2Cub").value = p.m2_cubiertos || "";
  document.getElementById("propCochera").checked = p.cochera || false;
  document.getElementById("propDestacada").checked = p.destacada || false;
  document.getElementById("propDesc").value = p.descripcion || "";

  // Fotos existentes
  fotosExistentes = (p.fotos_propiedad || []).sort((a, b) => a.orden - b.orden);
  renderFotosExistentes();

  // Ir a sección
  mostrarSeccion("nueva", document.querySelectorAll(".nav-item")[1]);
}

// ═══════════════════════════════
//   GUARDAR PROPIEDAD
// ═══════════════════════════════

async function guardarPropiedad(e) {
  e.preventDefault();
  const errEl = document.getElementById("formError");
  const okEl = document.getElementById("formSuccess");
  const btn = document.getElementById("btnGuardar");
  errEl.textContent = "";
  okEl.textContent = "";

  const id = document.getElementById("propId").value;
  const titulo = document.getElementById("propTitulo").value.trim();
  const tipo_id = document.getElementById("propTipo").value;
  const operacion = document.getElementById("propOperacion").value;
  const estado = document.getElementById("propEstado").value;
  const precio = document.getElementById("propPrecio").value;
  const direccion = document.getElementById("propDireccion").value.trim();
  const barrio = document.getElementById("propBarrio").value.trim();
  const ambientes = document.getElementById("propAmbientes").value;
  const dormitorios = document.getElementById("propDormitorios").value;
  const banos = document.getElementById("propBanos").value;
  const m2_totales = document.getElementById("propM2Total").value;
  const m2_cubiertos = document.getElementById("propM2Cub").value;
  const cochera = document.getElementById("propCochera").checked;
  const destacada = document.getElementById("propDestacada").checked;
  const descripcion = document.getElementById("propDesc").value.trim();

  if (!titulo || !tipo_id || !operacion || !estado) {
    errEl.textContent = "Completá los campos obligatorios (*)";
    return;
  }

  btn.textContent = "Guardando...";
  btn.disabled = true;

  const payload = {
    titulo,
    tipo_id: parseInt(tipo_id),
    operacion,
    estado,
    precio: precio ? parseFloat(precio) : null,
    direccion: direccion || null,
    barrio: barrio || null,
    ambientes: ambientes ? parseInt(ambientes) : null,
    dormitorios: dormitorios ? parseInt(dormitorios) : null,
    banos: banos ? parseInt(banos) : null,
    m2_totales: m2_totales ? parseFloat(m2_totales) : null,
    m2_cubiertos: m2_cubiertos ? parseFloat(m2_cubiertos) : null,
    cochera,
    destacada,
    descripcion: descripcion || null,
  };

  let propId = id;

  try {
    if (id) {
      // EDITAR
      const { error } = await db
        .from("propiedades")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    } else {
      // NUEVA
      const { data, error } = await db
        .from("propiedades")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      propId = data.id;
    }

    // Subir fotos nuevas
    if (fotosNuevas.length > 0) {
      await subirFotos(propId);
    }

    okEl.textContent = id ? "Propiedad actualizada." : "Propiedad guardada.";
    await cargarPropiedades();

    setTimeout(() => {
      mostrarSeccion("propiedades", document.querySelectorAll(".nav-item")[0]);
    }, 1200);
  } catch (err) {
    console.error(err);
    errEl.textContent = "Error al guardar. Intentá de nuevo.";
  }

  btn.textContent = "Guardar propiedad";
  btn.disabled = false;
}

// ═══════════════════════════════
//   FOTOS
// ═══════════════════════════════

function previsualizarFotos(event) {
  const archivos = Array.from(event.target.files);
  archivos.forEach((file) => {
    if (file.size > 5 * 1024 * 1024) {
      alert(`"${file.name}" supera los 5MB y no se agregó.`);
      return;
    }
    fotosNuevas.push(file);
  });
  renderFotosNuevas();
  event.target.value = "";
}

function renderFotosNuevas() {
  const cont = document.getElementById("fotosPreview");
  cont.innerHTML = fotosNuevas
    .map((file, idx) => {
      const url = URL.createObjectURL(file);
      const esPrincipal =
        idx === fotosPrincipalIdx && fotosExistentes.length === 0;
      return `
      <div class="foto-item" id="foto-nueva-${idx}">
        <img src="${url}" class="${esPrincipal ? "principal" : ""}" alt="foto ${idx}" />
        <div class="foto-item-btns">
          <button class="foto-btn principal-btn" title="Hacer principal" onclick="setPrincipalNueva(${idx})">★</button>
          <button class="foto-btn" title="Eliminar" onclick="eliminarFotoNueva(${idx})">✕</button>
        </div>
        ${esPrincipal ? '<div class="foto-label-principal">PRINCIPAL</div>' : ""}
      </div>`;
    })
    .join("");
}

function renderFotosExistentes() {
  const cont = document.getElementById("fotosExistentes");
  cont.innerHTML = fotosExistentes
    .map(
      (foto, idx) => `
    <div class="foto-item">
      <img src="${foto.url}" class="${foto.es_principal ? "principal" : ""}" alt="foto existente" />
      <div class="foto-item-btns">
        <button class="foto-btn principal-btn" title="Hacer principal" onclick="setPrincipalExistente(${idx})">★</button>
        <button class="foto-btn" title="Eliminar" onclick="eliminarFotoExistente('${foto.url}', ${idx})">✕</button>
      </div>
      ${foto.es_principal ? '<div class="foto-label-principal">PRINCIPAL</div>' : ""}
    </div>`,
    )
    .join("");
}

function setPrincipalNueva(idx) {
  fotosPrincipalIdx = idx;
  // Quitar principal de existentes
  fotosExistentes = fotosExistentes.map((f) => ({ ...f, es_principal: false }));
  renderFotosNuevas();
  renderFotosExistentes();
}

async function setPrincipalExistente(idx) {
  const propId = document.getElementById("propId").value;
  if (!propId) {
    fotosExistentes[idx].es_principal = true;
    renderFotosExistentes();
    return;
  }

  // Quitar principal de todas
  await db
    .from("fotos_propiedad")
    .update({ es_principal: false })
    .eq("propiedad_id", propId);
  // Poner principal en esta
  await db
    .from("fotos_propiedad")
    .update({ es_principal: true })
    .eq("url", fotosExistentes[idx].url);

  fotosExistentes = fotosExistentes.map((f, i) => ({
    ...f,
    es_principal: i === idx,
  }));
  fotosPrincipalIdx = -1;
  renderFotosNuevas();
  renderFotosExistentes();
}

function eliminarFotoNueva(idx) {
  fotosNuevas.splice(idx, 1);
  if (fotosPrincipalIdx >= fotosNuevas.length) fotosPrincipalIdx = 0;
  renderFotosNuevas();
}

async function eliminarFotoExistente(url, idx) {
  const propId = document.getElementById("propId").value;
  if (propId) {
    await db.from("fotos_propiedad").delete().eq("url", url);
    // Borrar del storage
    const path = url.split("/propiedades-fotos/")[1];
    if (path)
      await db.storage
        .from("propiedades-fotos")
        .remove([decodeURIComponent(path)]);
  }
  fotosExistentes.splice(idx, 1);
  renderFotosExistentes();
}

async function subirFotos(propId) {
  const ordenBase = fotosExistentes.length;

  for (let i = 0; i < fotosNuevas.length; i++) {
    const file = fotosNuevas[i];
    const ext = file.name.split(".").pop();
    const path = `${propId}/${Date.now()}_${i}.${ext}`;

    const { data: uploadData, error: uploadError } = await db.storage
      .from("propiedades-fotos")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      console.error("Error subiendo foto:", uploadError);
      continue;
    }

    const { data: urlData } = db.storage
      .from("propiedades-fotos")
      .getPublicUrl(path);
    const esPrincipal = i === fotosPrincipalIdx && fotosExistentes.length === 0;

    await db.from("fotos_propiedad").insert({
      propiedad_id: propId,
      url: urlData.publicUrl,
      orden: ordenBase + i,
      es_principal: esPrincipal,
    });
  }
}

// ═══════════════════════════════
//   ELIMINAR PROPIEDAD
// ═══════════════════════════════

function abrirModalEliminar(id) {
  propIdEliminar = id;
  document.getElementById("modalEliminar").classList.add("open");
}

function cerrarModalEliminar() {
  propIdEliminar = null;
  document.getElementById("modalEliminar").classList.remove("open");
}

async function confirmarEliminar() {
  if (!propIdEliminar) return;

  // Borrar fotos del storage
  const p = propiedades.find((x) => x.id === propIdEliminar);
  if (p?.fotos_propiedad?.length) {
    const paths = p.fotos_propiedad
      .map((f) => {
        const part = f.url.split("/propiedades-fotos/")[1];
        return part ? decodeURIComponent(part) : null;
      })
      .filter(Boolean);
    if (paths.length) await db.storage.from("propiedades-fotos").remove(paths);
  }

  // Borrar propiedad (las fotos en BD se borran en cascada)
  await db.from("propiedades").delete().eq("id", propIdEliminar);

  cerrarModalEliminar();
  await cargarPropiedades();
}
