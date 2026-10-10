import { estaciones } from "./datos-estaciones.js";
import { iniciarInterfazEstaciones, mostrarPanelEstacion, ocultarPanelEstacion } from "./interfaz-estaciones.js";

const camara = document.querySelector("#camara");
const estado = document.querySelector("#estado");
const marcadores = new Map();
let animacion = null;
let estacionSeleccionada = null;
let desplazamientoActual = 0;

function desplazarEncuadre(desplazamiento) {
  desplazamientoActual = desplazamiento;
  const escena = document.querySelector("a-scene");
  const limites = escena.canvas.getBoundingClientRect();
  // Desplaza el enfoque sin redimensionar ni vaciar el lienzo WebGL.
  escena.camera.setViewOffset(limites.width, limites.height, desplazamiento, 0, limites.width, limites.height);
}

function moverCamara(destino, inmediato = false) {
  if (animacion !== null) cancelAnimationFrame(animacion);
  animacion = null;

  const objeto = camara.object3D;
  if (inmediato || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    objeto.position.set(destino.x, destino.y, destino.z);
    objeto.rotation.x = destino.angulo * Math.PI / 180;
    desplazarEncuadre(destino.desplazamiento);
    return;
  }
  const origen = objeto.position.clone();
  const anguloInicial = objeto.rotation.x;
  const desplazamientoInicial = desplazamientoActual;
  const inicio = performance.now();
  const duracion = 900;
  const anguloFinal = destino.angulo * Math.PI / 180;

  function avanzar(instante) {
    destino = obtenerEncuadre();
    const progreso = Math.min((instante - inicio) / duracion, 1);
    const suavizado = progreso < .5
      ? 4 * progreso * progreso * progreso
      : 1 - Math.pow(-2 * progreso + 2, 3) / 2;

    objeto.position.set(
      origen.x + (destino.x - origen.x) * suavizado,
      origen.y + (destino.y - origen.y) * suavizado,
      origen.z + (destino.z - origen.z) * suavizado
    );
    objeto.rotation.x = anguloInicial + (anguloFinal - anguloInicial) * suavizado;
    desplazarEncuadre(desplazamientoInicial + (destino.desplazamiento - desplazamientoInicial) * suavizado);

    if (progreso < 1) animacion = requestAnimationFrame(avanzar);
    else animacion = null;
  }

  animacion = requestAnimationFrame(avanzar);
}

function obtenerEncuadre() {
  const estacion = estaciones.find(function (candidata) { return candidata.id === estacionSeleccionada; });
  const destino = !estacion
    ? { x: 3, y: 14.5, z: 21, angulo: -32 }
    : estacion.id === "expedicion"
      ? { x: estacion.x + 1.8, y: 8.2, z: 10, angulo: -39 }
      : { x: estacion.x, y: 7.5, z: 8.8, angulo: -40 };
  const limites = document.querySelector(".visor").getBoundingClientRect();
  const anchuraTotal = document.querySelector("#explorador").getBoundingClientRect().width;
  const panelLateral = estacion && !window.matchMedia("(max-width: 900px)").matches;
  const anchuraPanel = panelLateral
    ? parseFloat(getComputedStyle(document.querySelector("#panel-estacion")).width) + 16 : 0;
  destino.desplazamiento = anchuraPanel / 2;
  // El panel se superpone; la estación se centra en la zona que queda libre.
  const proporcion = (anchuraTotal - anchuraPanel) / Math.max(1, limites.height);
  const amplitud = Math.max(1, (estacion ? 1.15 : 2) / Math.max(.3, proporcion));
  const alturaObjetivo = destino.y - Math.tan(-destino.angulo * Math.PI / 180) * destino.z;
  destino.y = alturaObjetivo + (destino.y - alturaObjetivo) * amplitud;
  destino.z *= amplitud;
  return destino;
}

function actualizarSeleccion(id) {
  document.querySelectorAll(".controles button").forEach(function (boton) {
    const seleccionado = id === null ? boton.dataset.vista === "general" : boton.dataset.estacion === id;
    boton.setAttribute("aria-pressed", String(seleccionado));
  });
  marcadores.forEach(function (marcador, clave) {
    marcador.setAttribute("scale", clave === id ? "1.3 1.3 1.3" : "1 1 1");
  });
}

export function seleccionarEstacion(id) {
  const estacion = estaciones.find(function (candidata) { return candidata.id === id; });
  if (!estacion) return;

  estacionSeleccionada = id;
  mostrarPanelEstacion(estacion);
  moverCamara(obtenerEncuadre());
  actualizarSeleccion(id);
  estado.textContent = `Estación ${String(estaciones.indexOf(estacion) + 1).padStart(2, "0")} · ${estacion.nombre}`;
}

function mostrarVistaGeneral() {
  document.querySelector("#seguir-paquete").checked = false;
  estacionSeleccionada = null;
  ocultarPanelEstacion();
  moverCamara(obtenerEncuadre());
  actualizarSeleccion(null);
  estado.textContent = "Vista general · Selecciona una estación";
}

function crearMarcadores() {
  const contenedor = document.querySelector("#marcadores");
  estaciones.forEach(function (estacion, indice) {
    const marcador = document.createElement("a-entity");
    marcador.classList.add("marcador-estacion");
    marcador.setAttribute("geometry", "primitive: sphere; radius: 0.24");
    marcador.setAttribute("material", `color: ${estacion.color}; emissive: ${estacion.color}; emissiveIntensity: 0.35`);
    marcador.setAttribute("position", `${estacion.x} 3.75 -2.3`);
    marcador.setAttribute("title", `Acercarse a ${estacion.nombre}`);
    const numero = document.createElement("a-text");
    numero.setAttribute("value", String(indice + 1).padStart(2, "0"));
    numero.setAttribute("align", "center");
    numero.setAttribute("color", "#ffffff");
    numero.setAttribute("width", "1.5");
    numero.setAttribute("position", "0 0 0.25");
    marcador.appendChild(numero);
    contenedor.appendChild(marcador);
    marcadores.set(estacion.id, marcador);
  });
}

function activarSeleccionEnEscena() {
  const THREE = window.AFRAME.THREE;
  const escena = document.querySelector("a-scene");
  const rayo = new THREE.Raycaster();
  const punto = new THREE.Vector2();

  escena.canvas.addEventListener("click", function (evento) {
    const limites = escena.canvas.getBoundingClientRect();
    punto.set(
      (evento.clientX - limites.left) / limites.width * 2 - 1,
      -(evento.clientY - limites.top) / limites.height * 2 + 1
    );
    rayo.setFromCamera(punto, escena.camera);

    let seleccion = null;
    let distancia = Infinity;
    marcadores.forEach(function (marcador, id) {
      const esfera = marcador.getObject3D("mesh");
      if (!esfera) return;
      const cruces = rayo.intersectObject(esfera, true);
      if (cruces.length && cruces[0].distance < distancia) {
        seleccion = id;
        distancia = cruces[0].distance;
      }
    });
    if (seleccion) {
      document.querySelector("#seguir-paquete").checked = false;
      seleccionarEstacion(seleccion);
    }
  });
}

export function iniciarAcercamientos() {
  iniciarInterfazEstaciones(window.AFRAME.THREE, mostrarVistaGeneral);
  crearMarcadores();
  activarSeleccionEnEscena();
  document.querySelectorAll("[data-estacion]").forEach(function (boton) {
    boton.addEventListener("click", function () {
      document.querySelector("#seguir-paquete").checked = false;
      seleccionarEstacion(boton.dataset.estacion);
    });
  });
  document.querySelector("[data-vista='general']").addEventListener("click", function () {
    document.querySelector("#seguir-paquete").checked = false;
    mostrarVistaGeneral();
  });
  const escena = document.querySelector("a-scene");
  const observador = new ResizeObserver(function () {
    escena.resize();
    if (animacion === null) moverCamara(obtenerEncuadre(), true);
  });
  observador.observe(document.querySelector(".visor"));
}
