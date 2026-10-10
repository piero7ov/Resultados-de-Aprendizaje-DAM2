// Detección y resolución de colisiones mediante rectángulos ajustados a los sprites.
// Además de detectar el contacto, estas funciones impiden atravesar objetos y bordes.
function hayColision(a, b){
  return a.x < b.x + b.ancho && a.x + a.ancho > b.x &&
    a.y < b.y + b.alto && a.y + a.alto > b.y;
}

function buscarContacto(coche){
  // Devuelve el primer objeto tocado; null indica que la posición está libre.
  const cuerpo = coche.rectangulo();
  for (const obstaculo of obstaculos) {
    if (hayColision(cuerpo, obstaculo.rectangulo())) {
      return obstaculo;
    }
  }
  for (const enemigo of enemigos) {
    if (hayColision(cuerpo, enemigo.rectangulo())) {
      return enemigo;
    }
  }
  return null;
}

function dentroDePantalla(coche){
  // Limitamos el cuadro completo para mantener visible el sprite.
  return coche.x >= 0 && coche.x <= Math.max(0, anchura - 80) &&
    coche.y >= 0 && coche.y <= Math.max(0, altura - 80);
}

function moverJugador(coche, desplazamientoX, desplazamientoY){
  // Divide cualquier desplazamiento en pasos de un píxel como máximo para que
  // el coche no pueda saltarse un tronco fino entre el origen y el destino.
  const pasos = Math.ceil(Math.max(Math.abs(desplazamientoX), Math.abs(desplazamientoY)));
  for (let i = 0; i < pasos; i++) {
    const anteriorX = coche.x;
    const anteriorY = coche.y;
    coche.x = Math.max(0, Math.min(coche.x + desplazamientoX / pasos, Math.max(0, anchura - 80)));
    coche.y = Math.max(0, Math.min(coche.y + desplazamientoY / pasos, Math.max(0, altura - 80)));
    const contacto = buscarContacto(coche);
    if (contacto !== null) {
      // Volvemos al último punto libre, junto al borde del objeto.
      coche.x = anteriorX;
      coche.y = anteriorY;
      coche.recibirChoque(contacto);
      break;
    }
  }
}

function avanzarEntidad(entidad){
  // Un objeto golpeado por el escudo permanece inmóvil hasta cumplir este plazo.
  if (performance.now() < entidad.detenidohasta) {
    return;
  }
  // Los árboles y los enemigos avanzan hacia abajo, también en pasos pequeños.
  const pasos = Math.ceil(Math.abs(entidad.v));
  for (let i = 0; i < pasos; i++) {
    const anteriorY = entidad.y;
    entidad.y += entidad.v / pasos;
    if (hayColision(jugador.rectangulo(), entidad.rectangulo())) {
      if (jugador.recibirChoque(entidad)) {
        // Deshacemos el paso del golpe para no empujar ni solaparnos con el coche.
        entidad.y = anteriorY;
        break;
      }
      const anteriorJugadorY = jugador.y;
      const cuerpo = jugador.rectangulo();
      const objeto = entidad.rectangulo();
      // El objeto que baja empuja al jugador hasta dejarlo justo debajo.
      jugador.y += objeto.y + objeto.alto - cuerpo.y;
      if (!dentroDePantalla(jugador) || buscarContacto(jugador) !== null) {
        // Si un borde u otro objeto impide el empuje, ambos conservan su posición.
        // El jugador puede salir lateralmente; el objeto volverá a avanzar al liberarse.
        jugador.y = anteriorJugadorY;
        entidad.y = anteriorY;
        break;
      }
    }
  }
}
