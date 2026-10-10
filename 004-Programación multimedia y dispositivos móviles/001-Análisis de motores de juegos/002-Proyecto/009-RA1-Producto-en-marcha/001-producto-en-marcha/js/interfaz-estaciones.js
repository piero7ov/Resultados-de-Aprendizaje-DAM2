import { estaciones } from "./datos-estaciones.js";

const explicaciones = {
  recepcion: {
    resumen: "Es la entrada del producto a la línea. Aquí se comprueba qué llega y se prepara su paso al control de calidad.",
    tareas: ["Identificar el producto recibido.", "Comprobar su etiqueta y su estado exterior.", "Preparar su incorporación a la cinta."],
    entrada: "Producto pendiente de identificar.",
    salida: "Producto identificado y preparado para inspección."
  },
  calidad: {
    resumen: "Este puesto comprueba que el producto reúne las condiciones necesarias para continuar por la línea.",
    tareas: ["Revisar la integridad del producto y su embalaje.", "Detectar daños o incidencias.", "Determinar si continúa o se descarta."],
    entrada: "Producto recibido e identificado.",
    salida: "Producto conforme hacia embalaje; defectuoso hacia descarte."
  },
  embalaje: {
    resumen: "El producto que supera el control se protege y se prepara para que pueda transportarse correctamente.",
    tareas: ["Colocar la protección necesaria.", "Cerrar y asegurar el embalaje.", "Añadir la etiqueta que identifica el paquete."],
    entrada: "Producto que ha superado calidad.",
    salida: "Paquete cerrado y etiquetado."
  },
  expedicion: {
    resumen: "Es la última comprobación antes de la salida. El paquete se organiza en la zona de carga junto al camión.",
    tareas: ["Verificar la etiqueta del paquete terminado.", "Prepararlo en la zona de salida.", "Confirmar que está listo para su expedición."],
    entrada: "Paquete embalado y etiquetado.",
    salida: "Paquete preparado para cargar."
  }
};

const explorador = document.querySelector("#explorador");
const panel = document.querySelector("#panel-estacion");
let resaltado;
let cierrePendiente = null;

export function iniciarInterfazEstaciones(THREE, volver) {
  resaltado = new THREE.Group();
  resaltado.name = "Perímetro del puesto seleccionado";
  const material = new THREE.MeshBasicMaterial({
    color: "#ffffff", transparent: true, opacity: .95, depthWrite: false
  });
  for (const [x, z, ancho, fondo] of [
    [0, -4.04, 5.92, .09], [0, 4.04, 5.92, .09],
    [-2.96, 0, .09, 8.08], [2.96, 0, .09, 8.08]
  ]) {
    const borde = new THREE.Mesh(new THREE.BoxGeometry(ancho, .016, fondo), material);
    borde.position.set(x, .065, z);
    resaltado.add(borde);
  }
  const relleno = new THREE.Mesh(
    new THREE.PlaneGeometry(5.85, 8.0),
    new THREE.MeshBasicMaterial({
      color: "#ffffff", transparent: true, opacity: .07, depthWrite: false
    })
  );
  relleno.rotation.x = -Math.PI / 2;
  relleno.position.y = .038;
  resaltado.add(relleno);
  resaltado.visible = false;
  document.querySelector("#mundo").object3D.add(resaltado);
  document.querySelector("#cerrar-panel").addEventListener("click", function () {
    volver();
    document.querySelector("[data-vista='general']").focus({ preventScroll: true });
  });
  explorador.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape" && explorador.classList.contains("con-detalle")) {
      volver();
      document.querySelector("[data-vista='general']").focus({ preventScroll: true });
    }
  });
  const observadorPanel = new ResizeObserver(function () {
    if (!panel.hidden) explorador.style.setProperty("--alto-panel", panel.offsetHeight + "px");
  });
  observadorPanel.observe(panel);
}

export function mostrarPanelEstacion(estacion) {
  clearTimeout(cierrePendiente);
  const informacion = explicaciones[estacion.id];
  const numero = String(estaciones.indexOf(estacion) + 1).padStart(2, "0");
  document.querySelector("#numero-estacion").textContent = `Estación ${numero} / 04`;
  document.querySelector("#titulo-estacion").textContent = estacion.nombre;
  document.querySelector("#resumen-estacion").textContent = informacion.resumen;
  document.querySelector("#entrada-estacion").textContent = informacion.entrada;
  document.querySelector("#salida-estacion").textContent = informacion.salida;
  const tareas = document.querySelector("#tareas-estacion");
  tareas.replaceChildren();
  informacion.tareas.forEach(function (texto) {
    const elemento = document.createElement("li");
    elemento.textContent = texto;
    tareas.appendChild(elemento);
  });
  panel.style.setProperty("--color-estacion", estacion.color);
  panel.hidden = false;
  panel.inert = false;
  panel.removeAttribute("aria-hidden");
  explorador.style.setProperty("--alto-panel", panel.offsetHeight + "px");
  explorador.classList.add("con-detalle");
  resaltado.position.x = estacion.x;
  resaltado.children.forEach(function (malla) { malla.material.color.set(estacion.color); });
  resaltado.visible = true;
}

export function ocultarPanelEstacion() {
  clearTimeout(cierrePendiente);
  panel.inert = true;
  panel.setAttribute("aria-hidden", "true");
  explorador.classList.remove("con-detalle");
  resaltado.visible = false;
  const duracion = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
  cierrePendiente = setTimeout(function () {
    panel.hidden = true;
    cierrePendiente = null;
  }, duracion);
}
