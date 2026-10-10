import { estaciones } from "./datos-estaciones.js";

const camara = document.querySelector("#camara");
const estado = document.querySelector("#estado");
const detalle = document.querySelector("#detalle");
const marcadores = new Map();
let animacion = null;

const descripciones = {
  recepcion: "Recepción: el operario recibe el producto y comprueba su identificación antes de pasarlo a la cinta.",
  calidad: "Control de calidad: se inspecciona el producto. Si no supera el control, pasa a revisión.",
  embalaje: "Embalaje: se protege el producto, se introduce en una caja y se coloca su etiqueta.",
  expedicion: "Expedición: se verifica el paquete terminado y se prepara para su salida."
};

function moverCamara(destino) {
  if (animacion !== null) cancelAnimationFrame(animacion);

  const objeto = camara.object3D;
  const origen = objeto.position.clone();
  const anguloInicial = objeto.rotation.x;
  const inicio = performance.now();
  const duracion = 900;
  const anguloFinal = destino.angulo * Math.PI / 180;

  function avanzar(instante) {
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

    if (progreso < 1) animacion = requestAnimationFrame(avanzar);
    else animacion = null;
  }

  animacion = requestAnimationFrame(avanzar);
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

function seleccionarEstacion(id) {
  const estacion = estaciones.find(function (candidata) { return candidata.id === id; });
  if (!estacion) return;

  const acercamiento = estacion.id === "expedicion"
    ? { x: estacion.x + 1.8, y: 8.2, z: 10, angulo: -39 }
    : { x: estacion.x, y: 7.5, z: 8.8, angulo: -40 };
  moverCamara(acercamiento);
  actualizarSeleccion(id);
  estado.textContent = `Estación ${String(estaciones.indexOf(estacion) + 1).padStart(2, "0")} · ${estacion.nombre}`;
  detalle.textContent = descripciones[id];
}

function mostrarVistaGeneral() {
  moverCamara({ x: 3, y: 14.5, z: 21, angulo: -32 });
  actualizarSeleccion(null);
  estado.textContent = "Vista general · Selecciona una estación";
  detalle.textContent = "Pulsa un botón o un marcador de color en la escena para ver una estación de cerca.";
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
    if (seleccion) seleccionarEstacion(seleccion);
  });
}

export function iniciarAcercamientos() {
  crearMarcadores();
  activarSeleccionEnEscena();
  document.querySelectorAll("[data-estacion]").forEach(function (boton) {
    boton.addEventListener("click", function () { seleccionarEstacion(boton.dataset.estacion); });
  });
  document.querySelector("[data-vista='general']").addEventListener("click", mostrarVistaGeneral);
}
