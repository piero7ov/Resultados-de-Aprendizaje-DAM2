import { estaciones } from "./datos-estaciones.js";
import { Piezas } from "./piezas.js";
import { crearRecepcion, crearCalidad, crearEmbalaje, crearExpedicion } from "./estaciones.js";
import { iniciarAcercamientos } from "./camara.js";
import { iniciarAvatares } from "./avatar.js";
import { crearEntorno } from "./entorno.js";

function construirNave(THREE) {
  const grupo = new THREE.Group();
  const piezas = new Piezas(THREE);
  const crear = [crearRecepcion, crearCalidad, crearEmbalaje, crearExpedicion];

  piezas.caja(grupo, 0, -.24, 0, 25.2, .42, 8.6, "#829fa2");
  estaciones.forEach(function (estacion, indice) {
    piezas.caja(grupo, estacion.x, -.015, 0, 6.1, .05, 8.25, indice % 2 ? "#dce7e4" : "#e8efec");
    piezas.caja(grupo, estacion.x, .028, 4.05, 5.98, .03, .09, estacion.color);
    crear[indice](piezas, grupo, estacion.x, estacion.color);
  });

  const puntos = [];
  for (let x = -12; x <= 12; x += 1) {
    puntos.push(x, .018, -4.1, x, .018, 4.1);
  }
  for (let z = -4; z <= 4; z += 1) {
    puntos.push(-12.3, .018, z, 12.3, .018, z);
  }
  const suelo = new THREE.BufferGeometry();
  suelo.setAttribute("position", new THREE.Float32BufferAttribute(puntos, 3));
  grupo.add(new THREE.LineSegments(suelo, new THREE.LineBasicMaterial({ color: "#c2d0ce" })));

  // Bastidores de seguridad que separan visualmente cada puesto.
  for (const x of [-12.25, -6, 0, 6, 12.25]) {
    for (const z of [-3.8, 3.7]) {
      piezas.caja(grupo, x, 1.7, z, .09, 3.4, .09, "#a8b9bc", true);
    }
    piezas.caja(grupo, x, 3.36, -.05, .09, .09, 7.6, "#b8c7c9", true);
  }
  piezas.caja(grupo, 0, 3.36, -3.8, 24.5, .09, .09, "#b8c7c9", true);

  // Cinta única de izquierda a derecha, con rodillos y soportes.
  for (const x of [-10, -5, 0, 5, 10]) {
    for (const z of [-.48, .48]) piezas.caja(grupo, x, .4, z, .12, .8, .12, "#718b91", true);
  }
  piezas.caja(grupo, 0, .88, 0, 23.2, .18, 1.28, "#364950", true);
  for (let x = -11.4; x < 11.55; x += .42) {
    piezas.caja(grupo, x, .984, 0, .055, .015, 1.07, "#9eafb1", true);
  }
  for (const z of [-.67, .67]) piezas.caja(grupo, 0, 1.02, z, 23.4, .06, .07, "#cbd9d9", true);
  for (const x of [-9, -3, 3, 9]) piezas.paquete(grupo, x, 1.39, 0, .78);

  return grupo;
}

const escena = document.querySelector("a-scene");
const estado = document.querySelector("#estado");

function iniciar() {
  try {
    const THREE = window.AFRAME?.THREE || window.THREE;
    if (!THREE) throw new Error("Three.js no está disponible en A-Frame.");
    const piezas = new Piezas(THREE);
    document.querySelector("#entorno").object3D.add(crearEntorno(THREE, piezas));
    document.querySelector("#mundo").object3D.add(construirNave(THREE));
    iniciarAvatares();
    iniciarAcercamientos();
    estado.textContent = "Vista general · Selecciona una estación";
  } catch (error) {
    estado.textContent = "No se pudo cargar la maqueta 3D. Comprueba la conexión a A-Frame.";
    console.error(error);
  }
}

if (escena.hasLoaded) iniciar();
else escena.addEventListener("loaded", iniciar, { once: true });
