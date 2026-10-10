function crearAlmacen(grupo, piezas, THREE, x, z, ancho, fondo, altura, colorPared, colorTecho) {
  const almacen = new THREE.Group();
  almacen.position.set(x, 0, z);
  grupo.add(almacen);

  piezas.caja(almacen, 0, altura / 2, 0, ancho, altura, fondo, colorPared);
  piezas.caja(almacen, 0, .18, fondo / 2 + .04, ancho + .08, .36, .1, "#84979a");

  const inclinacion = Math.atan(1 / (fondo / 2));
  for (const lado of [-1, 1]) {
    const faldon = piezas.caja(
      almacen, 0, altura + .5, lado * fondo / 4,
      ancho + .55, .17, fondo / 2 + .48, colorTecho, true
    );
    faldon.rotation.x = lado * inclinacion;
    piezas.caja(almacen, lado * (ancho / 2 - .15), altura / 2, fondo / 2 + .06,
      .25, altura, .1, "#87999a", true);
  }
  piezas.caja(almacen, 0, altura + 1.02, 0, ancho + .6, .14, .22, "#6f858c", true);

  // Portones y bandas de ventanas identifican otras naves del polígono.
  for (const desplazamiento of [-ancho / 4, ancho / 4]) {
    piezas.caja(almacen, desplazamiento, 1.35, fondo / 2 + .075,
      2.55, 2.7, .075, "#c9d4d4");
    for (const y of [.45, .85, 1.25, 1.65, 2.05, 2.45]) {
      piezas.caja(almacen, desplazamiento, y, fondo / 2 + .12,
        2.45, .035, .025, "#87999b", true);
    }
    piezas.caja(almacen, desplazamiento, 3.65, fondo / 2 + .08,
      2.2, .52, .07, "#80a5ad");
    piezas.caja(almacen, desplazamiento, 3.65, fondo / 2 + .13,
      .045, .55, .025, "#dce8e5");
  }
  piezas.caja(almacen, 0, altura - .28, fondo / 2 + .09,
    ancho - .5, .13, .08, "#789096", true);

  // Nervios espaciados sobre la chapa de la cubierta.
  for (let desplazamiento = -ancho / 2 + 1; desplazamiento < ancho / 2; desplazamiento += 1.8) {
    for (const lado of [-1, 1]) {
      const nervio = piezas.caja(almacen, desplazamiento, altura + .61,
        lado * fondo / 4, .045, .035, fondo / 2 + .2, "#aebfc0", true);
      nervio.rotation.x = lado * inclinacion;
    }
  }
}

function crearArbol(grupo, piezas, x, z, escala, color) {
  piezas.cilindro(grupo, x, 1.12 * escala, z, .16 * escala, 2.25 * escala, "#725d47");
  piezas.esfera(grupo, x, 3.1 * escala, z, 1.38 * escala, color);
  piezas.esfera(grupo, x - .58 * escala, 2.74 * escala, z + .15 * escala,
    .88 * escala, color);
  piezas.esfera(grupo, x + .47 * escala, 3.65 * escala, z - .12 * escala,
    .9 * escala, color);
}

export function crearFondoIndustrial(THREE, piezas) {
  const grupo = new THREE.Group();

  // La parcela continúa detrás de la nave principal hasta las parcelas vecinas.
  piezas.caja(grupo, 0, -.57, -20.7, 68, .16, 20.6, "#aebfba");
  piezas.caja(grupo, 0, -.475, -10.8, 67, .035, 3.4, "#7f9090");
  for (const x of [-27, -18, -9, 0, 9, 18, 27]) {
    piezas.caja(grupo, x, -.45, -10.8, 3.4, .012, .055, "#e1daba");
  }

  crearAlmacen(grupo, piezas, THREE, -23, -15.3, 15, 8.2, 4.25,
    "#c7d0cc", "#80939b");
  crearAlmacen(grupo, piezas, THREE, -.5, -18.6, 18.5, 8.4, 4.7,
    "#d7d6ce", "#899aa0");
  crearAlmacen(grupo, piezas, THREE, 23, -16.2, 15, 8, 4.45,
    "#bfcac8", "#758b93");

  const arboles = [
    [-32, -25, 1.16, "#577b68"], [-27, -26.7, 1.02, "#698d74"],
    [-13.3, -15.7, 1.1, "#698d74"], [11.8, -15.8, 1.13, "#668a72"],
    [-19, -27.1, 1.24, "#587e69"], [-12, -26.4, .95, "#78997c"],
    [-5, -28, 1.3, "#5d826d"], [4, -27, 1.06, "#73927b"],
    [12, -27.8, 1.18, "#5b806c"], [20, -27, 1, "#76967c"],
    [28, -25.7, 1.27, "#5a806c"], [33, -23.5, 1.06, "#709075"]
  ];
  for (const [x, z, escala, color] of arboles) {
    crearArbol(grupo, piezas, x, z, escala, color);
  }

  // Una valla baja mantiene la separación entre la zona de carga y la arboleda.
  piezas.caja(grupo, 0, .55, -29.8, 67, .045, .045, "#83999a", true);
  piezas.caja(grupo, 0, 1.08, -29.8, 67, .045, .045, "#83999a", true);
  for (let x = -33; x <= 33; x += 3) {
    piezas.caja(grupo, x, .55, -29.8, .07, 1.1, .07, "#83999a", true);
  }

  return grupo;
}
