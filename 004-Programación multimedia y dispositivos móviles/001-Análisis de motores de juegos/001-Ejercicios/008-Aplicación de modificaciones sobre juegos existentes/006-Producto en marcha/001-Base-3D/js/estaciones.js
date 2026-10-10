export function crearRecepcion(piezas, grupo, x, color) {
  piezas.pale(grupo, x - 1.7, 2.35);
  piezas.paquete(grupo, x - 1.95, .54, 2.25, .85);
  piezas.paquete(grupo, x - 1.16, .48, 2.25, .7);
  piezas.mesa(grupo, x + .55, -2.2);
  piezas.pantalla(grupo, x + .83, -2.3);
  piezas.caja(grupo, x - .1, 1.06, -2.1, .34, .16, .24, "#4c6d79");
  piezas.operario(grupo, x - .2, 2.35, color);
}

export function crearCalidad(piezas, grupo, x, color) {
  piezas.mesa(grupo, x, -2.2, 2.5);
  piezas.paquete(grupo, x - .35, 1.34, -2.18, .55);
  piezas.pantalla(grupo, x + .75, -2.25, "#c4e7ce");
  for (const dx of [-1.1, 1.1]) {
    piezas.caja(grupo, x + dx, 1.82, -2.8, .1, 1.6, .1, "#a0b3b6", true);
  }
  piezas.caja(grupo, x, 2.6, -2.8, 2.3, .1, .1, "#b6c5c6", true);
  piezas.caja(grupo, x + 1.8, .03, 2.75, 1.25, .05, .9, "#d79a91");
  piezas.operario(grupo, x - .65, 2.25, color);
}

export function crearEmbalaje(piezas, grupo, x, color) {
  piezas.mesa(grupo, x, -2.2, 2.5);
  piezas.caja(grupo, x - .35, 1.23, -2.2, .85, .46, .72, "#cb9a66");
  piezas.caja(grupo, x - .35, 1.49, -2.62, .85, .05, .18, "#dfb486");
  piezas.caja(grupo, x - .35, 1.49, -1.78, .85, .05, .18, "#dfb486");
  piezas.caja(grupo, x + .62, 1.08, -2.1, .38, .1, .2, "#d47e4b");
  piezas.cilindro(grupo, x + .62, 1.17, -2.1, .11, .08, "#f0d6a4");
  piezas.pantalla(grupo, x + 1.0, -2.55);
  piezas.operario(grupo, x - .6, 2.25, color);
}

export function crearExpedicion(piezas, grupo, x, color) {
  piezas.mesa(grupo, x - .75, -2.2);
  piezas.paquete(grupo, x - 1.05, 1.34, -2.2, .58);
  piezas.pantalla(grupo, x - .25, -2.55, "#c4e7ce");
  piezas.caja(grupo, x + .52, 1.15, -2.25, .43, .29, .48, "#597381");
  piezas.pale(grupo, x + 1.65, 2.35);
  piezas.paquete(grupo, x + 1.27, .53, 2.35, .85);
  piezas.paquete(grupo, x + 2.02, .48, 2.35, .7);
  piezas.operario(grupo, x - .25, 2.25, color);
}
