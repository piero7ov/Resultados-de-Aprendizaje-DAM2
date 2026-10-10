// Aplicación específica: el motor de 001 se reutiliza sin modificar sus clases.
// Todos los datos, barcos y señales GPS de esta demostración son simulados.
const canvas = document.querySelector("#escenario");
const motor = new Motor(canvas);
const anchoPlano = canvas.width;
const altoPlano = canvas.height;

const interfaz = {
  barco: document.querySelector("#barco_seleccionado"),
  muelle: document.querySelector("#muelle_seleccionado"),
  asignar: document.querySelector("#asignar"),
  practicar: document.querySelector("#practicar"),
  terminar: document.querySelector("#terminar_practica"),
  ayuda: document.querySelector("#ayuda"),
  mensaje: document.querySelector("#mensaje"),
  tabla: document.querySelector("#tabla_flota"),
  transito: document.querySelector("#barcos_transito"),
  atracados: document.querySelector("#barcos_atracados"),
  disponibles: document.querySelector("#muelles_disponibles"),
  hora: document.querySelector("#hora_actualizacion")
};

const islas = [
  { x: 285, y: 65, ancho: 125, alto: 125 },
  { x: 470, y: 245, ancho: 145, alto: 125 },
  { x: 300, y: 440, ancho: 135, alto: 110 }
];
const muelles = [
  { id: "MUELLE-01", x: 840, y: 90, ancho: 130, alto: 105, barco: null, ocupado: false },
  { id: "MUELLE-02", x: 840, y: 260, ancho: 130, alto: 105, barco: null, ocupado: false },
  { id: "MUELLE-03", x: 840, y: 430, ancho: 130, alto: 105, barco: null, ocupado: false }
];

// Los sprites proceden de la copia de 020. El dibujo básico funciona si tardan en cargar.
function cargarImagen(ruta) {
  const imagen = new Image();
  imagen.src = ruta;
  return imagen;
}
const imagenBarco = cargarImagen("recursos/barco.png");
const imagenIsla = cargarImagen("recursos/isla.png");
const imagenPuerto = cargarImagen("recursos/puerto.png");

function dibujarImagen(contexto, imagen, x, y, ancho, alto, color) {
  if (imagen.complete && imagen.naturalWidth > 0) {
    contexto.drawImage(imagen, x, y, ancho, alto);
  } else {
    contexto.fillStyle = color;
    contexto.fillRect(x, y, ancho, alto);
  }
}

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Representamos una zona GPS ficticia. La conversión mantiene la relación entre
// el punto del plano y la lectura que aparece en la tabla mientras navega el barco.
function gpsSimulado(barco) {
  const latitud = 36.70 + (altoPlano - barco.y) / altoPlano * 0.04;
  const longitud = -6.45 + barco.x / anchoPlano * 0.06;
  return `${latitud.toFixed(5)}, ${longitud.toFixed(5)}`;
}

function dentroDeIsla(x, y, margen = 16) {
  return islas.some(isla => x > isla.x - margen && x < isla.x + isla.ancho + margen &&
    y > isla.y - margen && y < isla.y + isla.alto + margen);
}

function puntoValido(x, y) {
  return x >= 18 && x <= anchoPlano - 18 && y >= 18 && y <= altoPlano - 18 &&
    !dentroDeIsla(x, y);
}

// Buscar una ruta en cuadrícula permite que el piloto automático rodee las islas.
// La cuadrícula pertenece a esta aplicación; el motor no sabe nada de puertos.
function calcularRuta(origen, destino) {
  const paso = 20;
  const columnas = Math.floor(anchoPlano / paso);
  const filas = Math.floor(altoPlano / paso);
  const celda = punto => ({ x: Math.floor(punto.x / paso), y: Math.floor(punto.y / paso) });
  const inicio = celda(origen);
  const final = celda(destino);
  const clave = punto => `${punto.x},${punto.y}`;
  const pendientes = [inicio];
  const visitados = new Set([clave(inicio)]);
  const anteriores = new Map();
  let indice = 0;

  while (indice < pendientes.length) {
    const actual = pendientes[indice++];
    if (actual.x === final.x && actual.y === final.y) {
      const ruta = [];
      let pasoActual = actual;
      while (clave(pasoActual) !== clave(inicio)) {
        ruta.unshift({ x: (pasoActual.x + .5) * paso, y: (pasoActual.y + .5) * paso });
        pasoActual = anteriores.get(clave(pasoActual));
      }
      ruta.push(destino);
      return ruta;
    }
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const siguiente = { x: actual.x + dx, y: actual.y + dy };
      const identificador = clave(siguiente);
      if (siguiente.x < 0 || siguiente.x >= columnas || siguiente.y < 0 || siguiente.y >= filas ||
          visitados.has(identificador) || !puntoValido((siguiente.x + .5) * paso, (siguiente.y + .5) * paso)) {
        continue;
      }
      visitados.add(identificador);
      anteriores.set(identificador, actual);
      pendientes.push(siguiente);
    }
  }
  return null;
}

let barcoEnPractica = null;

function muelleDe(barco) {
  return muelles.find(muelle => muelle.id === barco.muelleId);
}

function atracar(barco) {
  const muelle = muelleDe(barco);
  if (!muelle || barco.estado === "Atracado") return;
  barco.estado = "Atracado";
  barco.ruta = [];
  barco.v = 0;
  muelle.ocupado = true;
  if (barcoEnPractica === barco) terminarPractica();
  mostrarMensaje(`${barco.id} ha atracado en ${muelle.id}.`);
  actualizarInterfaz();
}

function destinoMuelle(muelle) {
  return { x: muelle.x + 44, y: muelle.y + muelle.alto / 2 };
}

function moverAutomaticamente(barco, tiempo) {
  if (barco.estado !== "En tránsito" || barco === barcoEnPractica) return;
  let restante = Math.min(tiempo, .1) * 85;
  while (restante > 0 && barco.ruta.length) {
    const objetivo = barco.ruta[0];
    const separacion = distancia(barco, objetivo);
    if (separacion < 1) { barco.ruta.shift(); continue; }
    const avance = Math.min(restante, separacion);
    barco.a = Math.atan2(objetivo.y - barco.y, objetivo.x - barco.x);
    barco.x += Math.cos(barco.a) * avance;
    barco.y += Math.sin(barco.a) * avance;
    restante -= avance;
    if (avance >= separacion - .001) barco.ruta.shift();
  }
  if (!barco.ruta.length) atracar(barco);
}

function moverManualmente(barco, tiempo) {
  if (barco !== barcoEnPractica) return;
  const anterior = { x: barco.x, y: barco.y };
  const segundos = Math.min(tiempo, .1);
  barco.x += Math.cos(barco.a) * barco.v * segundos;
  barco.y += Math.sin(barco.a) * barco.v * segundos;
  barco.v *= Math.max(0, 1 - segundos * .75);
  if (!puntoValido(barco.x, barco.y)) {
    barco.x = anterior.x;
    barco.y = anterior.y;
    barco.v = 0;
  }
  const muelle = muelleDe(barco);
  if (muelle && distancia(barco, destinoMuelle(muelle)) < 23 && barco.v < 35) atracar(barco);
}

function dibujarBarco(barco, contexto) {
  contexto.save();
  contexto.translate(barco.x, barco.y);
  contexto.rotate(barco.a);
  dibujarImagen(contexto, imagenBarco, -21, -13, 42, 26, "#174e63");
  contexto.restore();
  contexto.fillStyle = barco === barcoEnPractica ? "#7b4c00" : "#17465a";
  contexto.font = "bold 13px Arial";
  contexto.textAlign = "center";
  contexto.fillText(barco.id, barco.x, barco.y - 23);
}

const controles = {
  acelerar: { teclas: ["ArrowUp"], modo: "continua" },
  frenar: { teclas: ["ArrowDown"], modo: "continua" },
  izquierda: { teclas: ["ArrowLeft"], modo: "continua" },
  derecha: { teclas: ["ArrowRight"], modo: "continua" }
};
const acciones = {
  acelerar: (barco, escena, tiempo) => { if (barco === barcoEnPractica) barco.v = Math.min(105, barco.v + 90 * tiempo); },
  frenar: (barco, escena, tiempo) => { if (barco === barcoEnPractica) barco.v = Math.max(0, barco.v - 125 * tiempo); },
  izquierda: (barco, escena, tiempo) => { if (barco === barcoEnPractica) barco.a -= 2.3 * tiempo; },
  derecha: (barco, escena, tiempo) => { if (barco === barcoEnPractica) barco.a += 2.3 * tiempo; }
};

const datosBarcos = [
  { id: "BARCO-01", x: 80, y: 165 },
  { id: "BARCO-02", x: 105, y: 325 },
  { id: "BARCO-03", x: 80, y: 505 }
];
const escena = new Escena({
  colisionesAutomaticas: false,
  alDibujar: (escena, contexto) => {
    contexto.fillStyle = "#a8d7e0";
    contexto.fillRect(0, 0, anchoPlano, altoPlano);
    contexto.strokeStyle = "#ffffff55";
    contexto.lineWidth = 1;
    for (let x = 0; x < anchoPlano; x += 50) {
      contexto.beginPath(); contexto.moveTo(x, 0); contexto.lineTo(x, altoPlano); contexto.stroke();
    }
    for (let y = 0; y < altoPlano; y += 50) {
      contexto.beginPath(); contexto.moveTo(0, y); contexto.lineTo(anchoPlano, y); contexto.stroke();
    }
    for (const barco of escena.buscar("barco")) {
      if (!barco.ruta.length) continue;
      contexto.beginPath();
      contexto.moveTo(barco.x, barco.y);
      for (const punto of barco.ruta) contexto.lineTo(punto.x, punto.y);
      contexto.strokeStyle = barco === barcoEnPractica ? "#c37b19" : "#14627b";
      contexto.lineWidth = 3;
      contexto.setLineDash([7, 7]);
      contexto.stroke();
      contexto.setLineDash([]);
    }
  }
});

for (const isla of islas) {
  escena.agregar(new Actor({
    x: isla.x, y: isla.y, datos: isla, etiquetas: ["isla"],
    alDibujar: (actor, contexto) => dibujarImagen(contexto, imagenIsla, actor.x, actor.y, actor.ancho, actor.alto, "#6d9d6b")
  }));
}
for (const muelle of muelles) {
  escena.agregar(new Actor({
    x: muelle.x, y: muelle.y, datos: muelle, etiquetas: ["muelle"],
    alDibujar: (actor, contexto) => {
      dibujarImagen(contexto, imagenPuerto, actor.x, actor.y, actor.ancho, actor.alto, "#b8a381");
      contexto.fillStyle = "#173047";
      contexto.fillRect(actor.x + 8, actor.y + 6, 108, 22);
      contexto.fillStyle = "white";
      contexto.font = "bold 12px Arial";
      contexto.textAlign = "left";
      contexto.fillText(actor.id, actor.x + 13, actor.y + 22);
    }
  }));
}
const barcos = datosBarcos.map(datos => escena.agregar(new Jugador({
  x: datos.x, y: datos.y, datos: { id: datos.id, muelleId: null, estado: "En espera", ruta: [] },
  etiquetas: ["barco"], controles, acciones,
  alActualizar: (barco, tiempo) => { moverAutomaticamente(barco, tiempo); moverManualmente(barco, tiempo); },
  alDibujar: dibujarBarco
})));

function mostrarMensaje(texto) { interfaz.mensaje.textContent = texto; }
function barcoSeleccionado() { return barcos.find(barco => barco.id === interfaz.barco.value); }

function actualizarInterfaz() {
  // La tabla recibe nuevas señales cada medio segundo. Reconstruir los selectores
  // solo cuando cambien sus opciones evita interrumpir una selección en curso.
  const idsBarcos = barcos.map(barco => barco.id);
  if ([...interfaz.barco.options].map(opcion => opcion.value).join() !== idsBarcos.join()) {
    const barcoAnterior = interfaz.barco.value;
    interfaz.barco.replaceChildren(...idsBarcos.map(id => new Option(id, id)));
    if (idsBarcos.includes(barcoAnterior)) interfaz.barco.value = barcoAnterior;
  }
  const idsMuelles = muelles.filter(muelle => !muelle.barco).map(muelle => muelle.id);
  if ([...interfaz.muelle.options].map(opcion => opcion.value).join() !== idsMuelles.join()) {
    const muelleAnterior = interfaz.muelle.value;
    interfaz.muelle.replaceChildren(...idsMuelles.map(id => new Option(id, id)));
    if (idsMuelles.includes(muelleAnterior)) interfaz.muelle.value = muelleAnterior;
  }

  interfaz.tabla.replaceChildren();
  for (const barco of barcos) {
    const fila = interfaz.tabla.insertRow();
    fila.insertCell().textContent = barco.id;
    fila.insertCell().textContent = gpsSimulado(barco);
    fila.insertCell().textContent = barco.muelleId ?? "Sin asignar";
    const estado = document.createElement("span");
    estado.className = `estado ${barco === barcoEnPractica ? "practica" : barco.estado === "Atracado" ? "atracado" : ""}`;
    estado.textContent = barco === barcoEnPractica ? "En práctica" : barco.estado;
    fila.insertCell().append(estado);
    fila.insertCell().textContent = new Date().toLocaleTimeString("es-ES");
  }
  interfaz.transito.textContent = barcos.filter(barco => barco.estado === "En tránsito").length;
  interfaz.atracados.textContent = barcos.filter(barco => barco.estado === "Atracado").length;
  interfaz.disponibles.textContent = muelles.filter(muelle => !muelle.barco).length;
  interfaz.hora.textContent = `Actualizado ${new Date().toLocaleTimeString("es-ES")}`;
  interfaz.asignar.disabled = !interfaz.muelle.value || !barcoSeleccionado() || !!barcoSeleccionado().muelleId;
  interfaz.practicar.disabled = !barcoSeleccionado()?.muelleId || barcoSeleccionado()?.estado === "Atracado" || !!barcoEnPractica;
}

function terminarPractica() {
  if (!barcoEnPractica) return;
  const barco = barcoEnPractica;
  barcoEnPractica = null;
  barco.v = 0;
  if (barco.estado === "En tránsito") barco.ruta = calcularRuta(barco, destinoMuelle(muelleDe(barco))) ?? [];
  interfaz.practicar.hidden = false;
  interfaz.terminar.hidden = true;
  interfaz.ayuda.hidden = true;
  mostrarMensaje(`${barco.id} vuelve al seguimiento automático.`);
  actualizarInterfaz();
}

interfaz.asignar.addEventListener("click", () => {
  const barco = barcoSeleccionado();
  const muelle = muelles.find(item => item.id === interfaz.muelle.value);
  if (!barco || !muelle || barco.muelleId || muelle.barco) return;
  const ruta = calcularRuta(barco, destinoMuelle(muelle));
  if (!ruta) { mostrarMensaje("No se ha encontrado una ruta segura para este atraque."); return; }
  barco.muelleId = muelle.id;
  barco.ruta = ruta;
  barco.estado = "En tránsito";
  muelle.barco = barco.id;
  mostrarMensaje(`${barco.id} asignado a ${muelle.id}. Ruta simulada en marcha.`);
  actualizarInterfaz();
});
interfaz.practicar.addEventListener("click", () => {
  const barco = barcoSeleccionado();
  if (!barco?.muelleId || barco.estado === "Atracado" || barcoEnPractica) return;
  barcoEnPractica = barco;
  barco.ruta = [];
  barco.v = 0;
  interfaz.practicar.hidden = true;
  interfaz.terminar.hidden = false;
  interfaz.ayuda.hidden = false;
  mostrarMensaje(`Control manual de ${barco.id}. Atraca despacio en ${barco.muelleId}.`);
  actualizarInterfaz();
});
interfaz.terminar.addEventListener("click", terminarPractica);
interfaz.barco.addEventListener("change", actualizarInterfaz);

motor.cargar(escena);
actualizarInterfaz();
motor.iniciar();
setInterval(actualizarInterfaz, 500);
