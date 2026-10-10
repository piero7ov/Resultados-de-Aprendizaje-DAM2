import { fijarPiernas } from "./ajuste-piernas.js";

const articulaciones = new Map();

export function registrarOperario(modelo, id) {
  fijarPiernas(modelo);
  const huesos = [];
  modelo.traverse(function (objeto) {
    if (!objeto.isBone) return;
    const nombre = objeto.name.replaceAll(".", "");
    if (["Bone005", "Bone006", "Bone009", "Bone010"].includes(nombre)) {
      huesos.push({ objeto, nombre, reposo: objeto.quaternion.clone() });
    }
  });
  articulaciones.set(id, huesos);
}

export function animarOperarios(THREE, estado, movimientoReducido) {
  const eje = new THREE.Vector3(1, 0, 0);
  const giro = new THREE.Quaternion();
  articulaciones.forEach(function (huesos, id) {
    const trabajando = estado.estado !== "listo" && estado.estado !== "completado"
      && estado.paso.trabajo && estado.paso.estacion === id && !movimientoReducido;
    const intensidad = trabajando ? Math.sin(Math.PI * estado.fraccion) : 0;
    huesos.forEach(function ({ objeto, nombre, reposo }) {
      const codo = nombre === "Bone006" || nombre === "Bone010";
      const gesto = intensidad * ((codo ? .32 : .18) + .045 * Math.sin(estado.fraccion * Math.PI * 4));
      objeto.quaternion.copy(reposo).multiply(giro.setFromAxisAngle(eje, gesto));
    });
  });
}
