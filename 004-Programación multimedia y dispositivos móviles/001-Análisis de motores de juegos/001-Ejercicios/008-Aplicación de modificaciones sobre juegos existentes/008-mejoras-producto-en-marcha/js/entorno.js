import { crearFondoIndustrial } from "./fondo-industrial.js";

function crearNave(grupo, piezas, THREE) {
  piezas.caja(grupo, 0, 2.18, -4.5, 25.4, 4.55, .26, "#cad7d7");
  piezas.caja(grupo, 0, .22, -4.31, 25.2, .25, .04, "#a7b9bc");
  piezas.caja(grupo, -12.7, 2.18, -2.55, .26, 4.55, 3.9, "#b9c9ca");

  for (const x of [-12, -9, -6, -3, 0, 3, 6, 9, 12]) {
    piezas.caja(grupo, x, 2.3, -4.31, .12, 4.5, .08, "#8ea4aa", true);
  }
  for (const x of [-9, -3, 3, 9]) {
    piezas.caja(grupo, x, 3.35, -4.29, 3.6, .9, .05, "#a3c3cd");
    piezas.caja(grupo, x, 3.35, -4.25, .06, .9, .06, "#e8efed");
    for (const y of [2.89, 3.81]) {
      piezas.caja(grupo, x, y, -4.23, 3.7, .07, .07, "#e8efed");
    }
  }

  // Cubierta abierta para mantener la vista elevada del recorrido.
  piezas.caja(grupo, 0, 4.65, -4.5, 25.5, .16, .16, "#718b91", true);
  for (const x of [-12.5, 12.5]) {
    piezas.caja(grupo, x, 4.65, -.35, .16, .16, 8.5, "#81999e", true);
  }
  for (const x of [-9, -3, 3, 9]) {
    const lampara = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, .05, .42),
      new THREE.MeshStandardMaterial({ color: "#f5f7e9", emissive: "#e7e9cf", emissiveIntensity: .6 })
    );
    lampara.position.set(x, 4.5, -.4);
    grupo.add(lampara);
  }

  // El extremo derecho queda abierto como muelle de carga.
  for (const z of [-2.4, 2.4]) {
    piezas.caja(grupo, 12.75, 2.1, z, .2, 4.2, .2, "#829a9e", true);
  }
  piezas.caja(grupo, 12.75, 4.2, 0, .22, .18, 5.0, "#829a9e", true);
}

function crearRueda(grupo, piezas, x, z) {
  const neumatico = piezas.cilindro(grupo, x, .07, z, .43, .2, "#26353b");
  neumatico.rotation.x = Math.PI / 2;
  const buje = piezas.cilindro(grupo, x, .07, z + (z > 0 ? .11 : -.11), .2, .04, "#aebfc0");
  buje.rotation.x = Math.PI / 2;
}

function crearCamion(grupo, piezas, THREE) {
  const camion = new THREE.Group();
  camion.position.z = -.5;
  grupo.add(camion);

  piezas.caja(camion, 16.65, .6, 0, 8.2, .28, 1.9, "#344a52", true);
  piezas.caja(camion, 15.35, 1.68, 0, 4.7, 2.5, 2.35, "#edf2ee");
  piezas.caja(camion, 15.35, 2.93, 0, 4.75, .1, 2.4, "#c7d4d4");
  piezas.caja(camion, 15.35, 1.5, 1.19, 4.45, .17, .04, "#52778a");
  for (const x of [13.2, 14.35, 15.5, 16.65, 17.55]) {
    piezas.caja(camion, x, 1.67, 1.21, .055, 2.2, .04, "#c2d1d0");
  }
  piezas.caja(camion, 12.98, 1.66, 0, .07, 2.38, 2.26, "#b8c9ca");
  for (const y of [.75, 1.12, 1.49, 1.86, 2.23, 2.6]) {
    piezas.caja(camion, 12.91, y, 0, .04, .035, 2.25, "#8da4a8");
  }

  piezas.caja(camion, 18.9, 1.32, 0, 2.15, 2.08, 2.05, "#a94f43");
  piezas.caja(camion, 20.05, .93, 0, 1.18, 1.1, 1.94, "#b85847");
  piezas.caja(camion, 18.98, 1.78, 1.045, 1.13, .72, .035, "#7eabb8");
  piezas.caja(camion, 20.0, 1.71, 0, .035, .72, 1.7, "#8bb8c1");
  piezas.caja(camion, 19.15, 1.25, 1.07, .38, .04, .04, "#dce5e1");
  piezas.caja(camion, 20.65, .72, 0, .06, .4, 1.52, "#354b52", true);
  for (const z of [-.73, .73]) {
    piezas.caja(camion, 20.68, .95, z, .07, .22, .3, "#f3d778");
  }
  for (const x of [14.3, 16.55, 19.35]) {
    for (const z of [-1.1, 1.1]) crearRueda(camion, piezas, x, z);
  }
}

export function crearEntorno(THREE, piezas) {
  const grupo = new THREE.Group();
  piezas.caja(grupo, 4, -.54, 0, 43, .18, 21, "#afbfbd");
  piezas.caja(grupo, 17.1, -.435, -.5, 9.8, .03, 6.3, "#7e9294");
  for (const x of [13.6, 15.1, 16.6, 18.1, 19.6, 21.1]) {
    piezas.caja(grupo, x, -.413, 2.25, .75, .012, .065, "#e9cf73");
  }
  piezas.caja(grupo, 12.83, -.23, -.5, 1.05, .42, 3.0, "#899da0");
  for (const z of [-2.2, 2.2]) {
    piezas.cilindro(grupo, 12.65, .33, z, .11, .85, "#d6ad52");
  }

  crearNave(grupo, piezas, THREE);
  crearCamion(grupo, piezas, THREE);
  grupo.add(crearFondoIndustrial(THREE, piezas));
  return grupo;
}
