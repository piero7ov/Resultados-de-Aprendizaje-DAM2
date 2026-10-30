// Adaptación para ERIN del concepto de entidades y flechas FK de jocarsa/diagrama.
let diagrama = structuredClone(window.DIAGRAMA_INICIAL);
let seleccionada = null;
let pendiente = false;
const lienzo = document.querySelector("#lienzo");
const escenario = document.querySelector("#escenario");
const mundo = document.querySelector("#mundo");
const entidades = document.querySelector("#entidades");
const flechas = document.querySelector("#flechas");
const lista = document.querySelector("#lista");
const editor = document.querySelector("#editor");
const estado = document.querySelector("#estado");
const mapa = document.querySelector("#mapa");
let zoom = diagrama.tablas.length > 30 ? 0.65 : 0.85;
let anchoMundo = 1100;
let altoMundo = 750;

function aplicarZoom(){
  mundo.style.transform = `scale(${zoom})`;
  escenario.style.width = anchoMundo * zoom + "px";
  escenario.style.height = altoMundo * zoom + "px";
  document.querySelector("#nivel_zoom").textContent = Math.round(zoom * 100) + "%";
  dibujarPanorama();
}

function cambiarZoom(valor){
  const nuevo = Math.max(0.12, Math.min(2.5, valor));
  const centroX = (lienzo.scrollLeft + lienzo.clientWidth / 2) / zoom;
  const centroY = (lienzo.scrollTop + lienzo.clientHeight / 2) / zoom;
  zoom = nuevo;
  aplicarZoom();
  lienzo.scrollTo(centroX * zoom - lienzo.clientWidth / 2, centroY * zoom - lienzo.clientHeight / 2);
}

function encajarVista(){
  const escala = Math.min((lienzo.clientWidth - 40) / anchoMundo, (lienzo.clientHeight - 40) / altoMundo);
  zoom = Math.max(0.12, Math.min(1, escala));
  aplicarZoom();
  lienzo.scrollTo(0, 0);
}

function dibujarPanorama(){
  const contexto = mapa.getContext("2d");
  const margen = 8;
  const escala = Math.min((mapa.width - margen * 2) / anchoMundo, (mapa.height - margen * 2) / altoMundo);
  const izquierda = (mapa.width - anchoMundo * escala) / 2;
  const arriba = (mapa.height - altoMundo * escala) / 2;
  contexto.clearRect(0, 0, mapa.width, mapa.height);
  contexto.fillStyle = "#fffaf2";
  contexto.fillRect(0, 0, mapa.width, mapa.height);
  contexto.fillStyle = "#bd573e";
  for(const tabla of diagrama.tablas){
    contexto.fillRect(izquierda + tabla.x * escala, arriba + tabla.y * escala, Math.max(2, 270 * escala), Math.max(2, (65 + tabla.campos.length * 23) * escala));
  }
  contexto.strokeStyle = "#382d29";
  contexto.lineWidth = 2;
  contexto.strokeRect(
    izquierda + lienzo.scrollLeft / zoom * escala,
    arriba + lienzo.scrollTop / zoom * escala,
    Math.min(anchoMundo, lienzo.clientWidth / zoom) * escala,
    Math.min(altoMundo, lienzo.clientHeight / zoom) * escala
  );
  mapa.dataset.escala = escala;
  mapa.dataset.izquierda = izquierda;
  mapa.dataset.arriba = arriba;
}

function avisar(texto, error = false){
  estado.textContent = texto;
  estado.classList.toggle("error", error);
}

function cambiado(){
  pendiente = true;
  avisar("Cambios sin guardar");
  dibujar();
}

function tablaSeleccionada(){
  return diagrama.tablas.find(tabla => tabla.nombre === seleccionada);
}

function ordenar(){
  const columnas = diagrama.tablas.length <= 16 ? 4 : 8;
  diagrama.tablas.forEach((tabla, indice) => {
    tabla.x = 80 + indice % columnas * 330;
    tabla.y = 80 + Math.floor(indice / columnas) * 420;
  });
  cambiado();
}

function dibujarFlechas(){
  flechas.replaceChildren();
  flechas.setAttribute("width", mundo.scrollWidth);
  flechas.setAttribute("height", mundo.scrollHeight);
  const posiciones = new Map(diagrama.tablas.map(tabla => [tabla.nombre, tabla]));
  for(const tabla of diagrama.tablas){
    for(const [indice, campo] of tabla.campos.entries()){
      const destino = posiciones.get(campo.fk);
      if(!destino) continue;
      const inicioX = tabla.x + 270;
      const inicioY = tabla.y + 72 + indice * 23;
      const finX = destino.x;
      const finY = destino.y + 49;
      const curva = document.createElementNS("http://www.w3.org/2000/svg", "path");
      curva.setAttribute("d", `M ${inicioX} ${inicioY} C ${inicioX + 75} ${inicioY}, ${finX - 75} ${finY}, ${finX} ${finY}`);
      curva.setAttribute("class", "flecha");
      curva.setAttribute("marker-end", "url(#punta)");
      const titulo = document.createElementNS("http://www.w3.org/2000/svg", "title");
      titulo.textContent = `${tabla.nombre}.${campo.nombre} → ${destino.nombre}.Identificador`;
      curva.append(titulo);
      flechas.append(curva);
    }
  }
  flechas.insertAdjacentHTML("afterbegin", '<defs><marker id="punta" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#bd573e"/></marker></defs>');
}

function dibujar(){
  const filtro = document.querySelector("#filtrar").value.trim().toLocaleLowerCase();
  entidades.replaceChildren();
  lista.replaceChildren();
  let ancho = 1100;
  let alto = 750;
  for(const tabla of diagrama.tablas){
    const tarjeta = document.createElement("article");
    tarjeta.className = "entidad" + (tabla.nombre === seleccionada ? " activa" : "");
    tarjeta.style.left = tabla.x + "px";
    tarjeta.style.top = tabla.y + "px";
    tarjeta.dataset.nombre = tabla.nombre;
    const titulo = document.createElement("h3");
    titulo.textContent = tabla.nombre;
    tarjeta.append(titulo);
    const pk = document.createElement("div");
    pk.className = "campo pk";
    pk.textContent = "◆ Identificador · INTEGER";
    tarjeta.append(pk);
    for(const campo of tabla.campos){
      const fila = document.createElement("div");
      fila.className = "campo";
      fila.textContent = `${campo.fk ? "↗ " : ""}${campo.nombre} · ${campo.tipo}`;
      tarjeta.append(fila);
    }
    tarjeta.addEventListener("pointerdown", empezarArrastre);
    tarjeta.addEventListener("click", () => seleccionar(tabla.nombre));
    entidades.append(tarjeta);
    const opcion = document.createElement("button");
    opcion.textContent = tabla.nombre;
    opcion.hidden = !tabla.nombre.toLocaleLowerCase().includes(filtro);
    opcion.className = tabla.nombre === seleccionada ? "activa" : "";
    opcion.addEventListener("click", () => {
      seleccionar(tabla.nombre);
      lienzo.scrollTo({left: Math.max(0, tabla.x * zoom - 100), top: Math.max(0, tabla.y * zoom - 100), behavior: "smooth"});
    });
    lista.append(opcion);
    ancho = Math.max(ancho, tabla.x + 500);
    alto = Math.max(alto, tabla.y + Math.max(400, tabla.campos.length * 23 + 120));
  }
  anchoMundo = ancho;
  altoMundo = alto;
  mundo.style.width = ancho + "px";
  mundo.style.height = alto + "px";
  aplicarZoom();
  dibujarFlechas();
  dibujarEditor();
}

function seleccionar(nombre){
  seleccionada = nombre;
  dibujar();
}

function empezarArrastre(evento){
  if(evento.button !== 0) return;
  const nombre = evento.currentTarget.dataset.nombre;
  const tabla = diagrama.tablas.find(item => item.nombre === nombre);
  const inicioX = evento.clientX;
  const inicioY = evento.clientY;
  const x = tabla.x;
  const y = tabla.y;
  const tarjeta = evento.currentTarget;
  tarjeta.setPointerCapture(evento.pointerId);
  tarjeta.onpointermove = movimiento => {
    tabla.x = Math.max(10, x + (movimiento.clientX - inicioX) / zoom);
    tabla.y = Math.max(10, y + (movimiento.clientY - inicioY) / zoom);
    tarjeta.style.left = tabla.x + "px";
    tarjeta.style.top = tabla.y + "px";
    dibujarFlechas();
    pendiente = true;
  };
  tarjeta.onpointerup = () => {
    tarjeta.onpointermove = null;
    tarjeta.onpointerup = null;
    seleccionada = nombre;
    if(pendiente) avisar("Cambios sin guardar");
    dibujar();
  };
}

function dibujarEditor(){
  const tabla = tablaSeleccionada();
  editor.hidden = !tabla;
  if(!tabla) return;
  document.querySelector("#nombre_entidad").value = tabla.nombre;
  const contenedor = document.querySelector("#campos");
  contenedor.replaceChildren();
  tabla.campos.forEach((campo, indice) => {
    const fila = document.createElement("div");
    fila.className = "editor-campo";
    const nombre = document.createElement("input");
    nombre.type = "text";
    nombre.value = campo.nombre;
    nombre.title = "Nombre del campo";
    nombre.addEventListener("change", () => {campo.nombre = nombre.value.trim(); cambiado();});
    const tipo = document.createElement("select");
    for(const valor of ["TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC"]){
      tipo.add(new Option(valor, valor, false, campo.tipo === valor));
    }
    tipo.addEventListener("change", () => {
      campo.tipo = tipo.value;
      if(campo.tipo !== "INTEGER") campo.fk = null;
      cambiado();
    });
    const referencia = document.createElement("select");
    referencia.title = "Referencia FK";
    referencia.add(new Option("Sin FK", ""));
    for(const destino of diagrama.tablas){
      referencia.add(new Option("FK → " + destino.nombre, destino.nombre, false, campo.fk === destino.nombre));
    }
    referencia.addEventListener("change", () => {
      campo.fk = referencia.value || null;
      if(campo.fk) campo.tipo = "INTEGER";
      cambiado();
    });
    const eliminar = document.createElement("button");
    eliminar.textContent = "×";
    eliminar.title = "Eliminar campo";
    eliminar.addEventListener("click", () => {
      if(confirm(`¿Eliminar ${tabla.nombre}.${campo.nombre}?`)){
        tabla.campos.splice(indice, 1);
        cambiado();
      }
    });
    fila.append(nombre, tipo, referencia, eliminar);
    contenedor.append(fila);
  });
}

document.querySelector("#nombre_entidad").addEventListener("change", evento => {
  const tabla = tablaSeleccionada();
  const anterior = tabla.nombre;
  const nuevo = evento.target.value.trim();
  tabla.nombre = nuevo;
  for(const otra of diagrama.tablas){
    for(const campo of otra.campos){
      if(campo.fk === anterior) campo.fk = nuevo;
    }
  }
  seleccionada = nuevo;
  cambiado();
});
document.querySelector("#anadir_campo").addEventListener("click", () => {
  const tabla = tablaSeleccionada();
  let numero = tabla.campos.length + 1;
  while(tabla.campos.some(campo => campo.nombre === "campo_" + numero)) numero++;
  tabla.campos.push({nombre:"campo_" + numero, tipo:"TEXT", fk:null});
  cambiado();
});
document.querySelector("#eliminar_entidad").addEventListener("click", () => {
  if(!seleccionada || !confirm(`¿Eliminar ${seleccionada} y sus relaciones?`)) return;
  diagrama.tablas = diagrama.tablas.filter(tabla => tabla.nombre !== seleccionada);
  for(const tabla of diagrama.tablas){
    for(const campo of tabla.campos){
      if(campo.fk === seleccionada) campo.fk = null;
    }
  }
  seleccionada = null;
  cambiado();
});
document.querySelector("#nueva").addEventListener("click", () => {
  let numero = 1;
  while(diagrama.tablas.some(tabla => tabla.nombre === "NuevaEntidad" + numero)) numero++;
  const tabla = {nombre:"NuevaEntidad" + numero, x:lienzo.scrollLeft / zoom + 100, y:lienzo.scrollTop / zoom + 100, campos:[]};
  diagrama.tablas.push(tabla);
  seleccionada = tabla.nombre;
  cambiado();
});
document.querySelector("#ordenar").addEventListener("click", ordenar);
document.querySelector("#vaciar").addEventListener("click", () => {
  if(confirm("¿Vaciar todas las entidades del diagrama? Los cambios no afectarán a la base hasta aplicar la migración.")){
    diagrama.tablas = [];
    seleccionada = null;
    cambiado();
  }
});
document.querySelector("#filtrar").addEventListener("input", dibujar);
document.querySelector("#guardar").addEventListener("click", async () => {
  try{
    const respuesta = await fetch("disenador.php", {
      method:"POST",
      headers:{"Content-Type":"application/json", "X-Token-Modelo":window.TOKEN_MODELO},
      body:JSON.stringify(diagrama)
    });
    const datos = await respuesta.json();
    if(!respuesta.ok) throw new Error(datos.error || "No se puede guardar");
    pendiente = false;
    avisar(`Modelo guardado: ${datos.tablas} entidades. Revisa la migración antes de aplicarla.`);
  }catch(error){
    avisar(error.message, true);
  }
});
window.addEventListener("beforeunload", evento => {
  if(pendiente){evento.preventDefault(); evento.returnValue = "";}
});
document.querySelector("#alejar").addEventListener("click", () => cambiarZoom(zoom / 1.25));
document.querySelector("#acercar").addEventListener("click", () => cambiarZoom(zoom * 1.25));
document.querySelector("#encajar").addEventListener("click", encajarVista);
lienzo.addEventListener("scroll", dibujarPanorama);
lienzo.addEventListener("wheel", evento => {
  evento.preventDefault();
  cambiarZoom(zoom * (evento.deltaY < 0 ? 1.1 : 1 / 1.1));
}, {passive:false});
lienzo.addEventListener("auxclick", evento => {
  if(evento.button === 1){ evento.preventDefault(); }
});
lienzo.addEventListener("pointerdown", evento => {
  if(evento.button !== 1 && (evento.button !== 0 || evento.target.closest(".entidad"))) return;
  evento.preventDefault();
  const inicioX = evento.clientX;
  const inicioY = evento.clientY;
  const scrollX = lienzo.scrollLeft;
  const scrollY = lienzo.scrollTop;
  lienzo.setPointerCapture(evento.pointerId);
  const mover = movimiento => {
    lienzo.scrollTo(scrollX - movimiento.clientX + inicioX, scrollY - movimiento.clientY + inicioY);
  };
  const soltar = () => {
    lienzo.removeEventListener("pointermove", mover);
    lienzo.removeEventListener("pointerup", soltar);
    lienzo.removeEventListener("pointercancel", soltar);
  };
  lienzo.addEventListener("pointermove", mover);
  lienzo.addEventListener("pointerup", soltar);
  lienzo.addEventListener("pointercancel", soltar);
});
mapa.addEventListener("click", evento => {
  const rectangulo = mapa.getBoundingClientRect();
  const x = (evento.clientX - rectangulo.left - Number(mapa.dataset.izquierda)) / Number(mapa.dataset.escala);
  const y = (evento.clientY - rectangulo.top - Number(mapa.dataset.arriba)) / Number(mapa.dataset.escala);
  lienzo.scrollTo({left:x * zoom - lienzo.clientWidth / 2, top:y * zoom - lienzo.clientHeight / 2, behavior:"smooth"});
});
window.addEventListener("resize", dibujarPanorama);
dibujar();
