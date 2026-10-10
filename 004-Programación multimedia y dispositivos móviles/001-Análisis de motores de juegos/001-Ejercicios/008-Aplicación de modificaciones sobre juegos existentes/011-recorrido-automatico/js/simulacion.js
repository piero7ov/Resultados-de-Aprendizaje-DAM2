import { Recorrido, TOTAL_PAQUETES } from "./recorrido.js";
import { seleccionarEstacion } from "./camara.js";
import { animarOperarios } from "./animaciones-operarios.js";

function crearProducto(THREE, piezas, grupo) {
  const producto = new THREE.Group();
  producto.name = "Producto en recorrido";
  const contenido = new THREE.Group();
  piezas.caja(contenido, 0, -.035, 0, .58, .42, .47, "#387e98", true);
  piezas.caja(contenido, 0, .19, 0, .32, .06, .27, "#b8d0d6", true);
  producto.add(contenido);
  const embalaje = new THREE.Group();
  piezas.paquete(embalaje, 0, 0, 0, 1);
  producto.add(embalaje);
  const aro = new THREE.Mesh(
    new THREE.TorusGeometry(.58, .026, 8, 40),
    new THREE.MeshBasicMaterial({ color: "#e8b64b" })
  );
  aro.rotation.x = -Math.PI / 2;
  aro.position.y = -.29;
  producto.add(aro);
  grupo.add(producto);
  return { producto, contenido, embalaje, aro };
}

function crearDescarte(THREE, piezas, grupo) {
  const canal = new THREE.Group();
  canal.position.set(-2.1, .97, 1.375);
  canal.rotation.y = Math.atan2(1.8, 2.75);
  const longitud = Math.hypot(1.8, 2.75);
  piezas.caja(canal, 0, 0, 0, .9, .12, longitud, "#7f949a", true);
  for (const x of [-.47, .47]) piezas.caja(canal, x, .11, 0, .06, .18, longitud, "#c5a360", true);
  grupo.add(canal);
  for (const [x, z] of [[-2.45, .85], [-1.55, 2.2]]) {
    piezas.caja(grupo, x, .46, z, .12, .92, .12, "#718b91", true);
  }
  // Contenedor abierto sobre la zona de descarte ya presente en la nave.
  piezas.caja(grupo, -1.2, .16, 2.75, 1.12, .2, .94, "#805550", true);
  for (const x of [-1.76, -.64]) piezas.caja(grupo, x, .4, 2.75, .06, .48, .98, "#b57065", true);
  for (const z of [2.28, 3.22]) piezas.caja(grupo, -1.2, .4, z, 1.12, .48, .06, "#b57065", true);
  piezas.caja(grupo, -2.15, 1.1, 2.05, .08, 2.2, .08, "#52666d", true);
  const luz = piezas.esfera(grupo, -2.15, 2.28, 2.05, .14, "#e8b64b");
  luz.material = new THREE.MeshStandardMaterial({ color: "#e8b64b", emissive: "#e8b64b", emissiveIntensity: .65 });
  return luz;
}

export function iniciarSimulacion(THREE, piezas, nave) {
  const motor = new Recorrido();
  const grupo = new THREE.Group();
  nave.add(grupo);
  const { producto, contenido, embalaje, aro } = crearProducto(THREE, piezas, grupo);
  const luz = crearDescarte(THREE, piezas, grupo);
  const iniciar = document.querySelector("#iniciar-recorrido");
  const pausar = document.querySelector("#pausar-recorrido");
  const reiniciar = document.querySelector("#reiniciar-recorrido");
  const seguir = document.querySelector("#seguir-paquete");
  const mensaje = document.querySelector("#mensaje-recorrido");
  const numero = document.querySelector("#numero-paquete");
  const avance = document.querySelector("#avance-paquete");
  const entregados = document.querySelector("#total-entregados");
  const descartados = document.querySelector("#total-descartados");
  const reducido = window.matchMedia("(prefers-reduced-motion: reduce)");
  let ultimaEtapa = "";
  let ultimoMensaje = "";
  let ultimaInterfaz = "";
  let tiempoCinta = 0;
  let instanteAnterior = null;

  function representar() {
    const estado = motor.obtenerEstado();
    const { paso, fraccion } = estado;
    const suave = fraccion * fraccion * (3 - 2 * fraccion);
    const interpolacion = paso.cinta ? fraccion : suave;
    producto.position.set(...paso.desde.map((valor, indice) => valor + (paso.hasta[indice] - valor) * interpolacion));
    producto.rotation.z = paso.id === "descarte" ? -.2 * suave : 0;
    producto.visible = estado.estado !== "listo";
    const embalando = paso.id === "embalaje";
    const empaquetado = ["hacia-expedicion", "expedicion", "salida"].includes(paso.id)
      || (embalando && fraccion >= .25);
    embalaje.visible = empaquetado;
    embalaje.children[1].visible = !embalando || fraccion >= .6;
    embalaje.children[2].visible = !embalando || fraccion >= .85;
    contenido.visible = !empaquetado;
    const color = paso.rechazado ? "#d4594e"
      : ["embalaje", "expedicion"].includes(paso.estacion) ? "#5baf85" : "#e8b64b";
    aro.material.color.set(color);
    luz.material.color.set(color);
    luz.material.emissive.set(color);
    aro.visible = estado.estado !== "completado";
    animarOperarios(THREE, estado, reducido.matches);

    nave.userData.rodillos.forEach(function ({ malla, origen }) {
      malla.position.x = -11.4 + ((origen + 11.4 + tiempoCinta * 2) % 23.1);
    });
    const clave = estado.numero + "-" + paso.id;
    if (clave !== ultimaEtapa) {
      ultimaEtapa = clave;
      if (seguir.checked && estado.estado === "en-marcha") seleccionarEstacion(paso.estacion);
    }
    const texto = estado.estado === "listo" ? "Listo para iniciar."
      : estado.estado === "completado" ? "Lote completado · 4 paquetes listos para salida y 2 descartados."
      : (estado.estado === "pausado" ? "En pausa · " : "") + paso.texto;
    if (texto !== ultimoMensaje) {
      mensaje.textContent = texto;
      ultimoMensaje = texto;
    }
    avance.value = estado.progreso;
    const claveInterfaz = [estado.estado, clave, estado.entregados, estado.descartados].join("/");
    if (claveInterfaz === ultimaInterfaz) return;
    ultimaInterfaz = claveInterfaz;
    numero.textContent = estado.estado === "listo" ? "Lote de " + TOTAL_PAQUETES + " paquetes" : "Paquete " + String(estado.numero).padStart(2, "0") + " / " + TOTAL_PAQUETES;
    entregados.textContent = estado.entregados;
    descartados.textContent = estado.descartados;
    document.querySelector("#simulacion").dataset.estado = estado.estado;
    document.querySelector("#simulacion").dataset.etapa = paso.id;
    iniciar.disabled = estado.estado === "en-marcha" || estado.estado === "completado";
    const accion = estado.estado === "pausado" ? "Continuar" : "Iniciar";
    iniciar.setAttribute("aria-label", accion);
    iniciar.title = accion;
    pausar.disabled = estado.estado !== "en-marcha";
    reiniciar.disabled = estado.estado === "listo";
  }

  iniciar.addEventListener("click", function () {
    motor.iniciar();
    ultimaEtapa = "";
    representar();
  });
  pausar.addEventListener("click", function () { motor.pausar(); representar(); });
  reiniciar.addEventListener("click", function () {
    motor.reiniciar();
    tiempoCinta = 0;
    ultimaEtapa = "";
    representar();
  });
  seguir.addEventListener("change", function () {
    if (seguir.checked && motor.estado !== "listo") seleccionarEstacion(motor.obtenerEstado().paso.estacion);
  });
  document.addEventListener("visibilitychange", function () {
    instanteAnterior = null;
    if (document.hidden) { motor.pausar(); representar(); }
  });
  function animar(instante) {
    const segundos = instanteAnterior === null ? 0 : Math.min((instante - instanteAnterior) / 1000, .1);
    instanteAnterior = instante;
    const anterior = motor.obtenerEstado();
    if (anterior.estado === "en-marcha" && anterior.paso.cinta && !reducido.matches) tiempoCinta += segundos;
    motor.actualizar(segundos);
    representar();
    requestAnimationFrame(animar);
  }
  representar();
  requestAnimationFrame(animar);
}
