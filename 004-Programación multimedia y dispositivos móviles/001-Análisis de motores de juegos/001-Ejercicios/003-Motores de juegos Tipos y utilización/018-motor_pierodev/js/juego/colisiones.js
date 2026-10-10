// Detección y resolución de colisiones mediante los cuerpos configurados de los actores.
// Además de detectar el contacto, estas funciones impiden atravesar objetos y bordes.
function hayColision(a, b){
  return a.x < b.x + b.ancho && a.x + a.ancho > b.x &&
    a.y < b.y + b.alto && a.y + a.alto > b.y;
}

function buscarContacto(actor){
  // Devuelve el primer objeto tocado; null indica que la posición está libre.
  const cuerpo = actor.rectangulo();
  for (const obstaculo of escena.buscar("obstaculo")) {
    if (hayColision(cuerpo, obstaculo.rectangulo())) {
      return obstaculo;
    }
  }
  for (const enemigo of escena.buscar("enemigo")) {
    if (hayColision(cuerpo, enemigo.rectangulo())) {
      return enemigo;
    }
  }
  return null;
}

function dentroDePantalla(actor){
  // Limitamos el cuerpo completo para mantener visible al actor.
  return actor.x >= 0 && actor.x <= Math.max(0, escenario.width - actor.ancho) &&
    actor.y >= 0 && actor.y <= Math.max(0, escenario.height - actor.alto);
}

function moverJugador(actor, desplazamientoX, desplazamientoY){
  // Divide cualquier desplazamiento en pasos de un píxel como máximo para que
  // el actor no pueda saltarse un tronco fino entre el origen y el destino.
  const pasos = Math.ceil(Math.max(Math.abs(desplazamientoX), Math.abs(desplazamientoY)));
  for (let i = 0; i < pasos; i++) {
    const anteriorX = actor.x;
    const anteriorY = actor.y;
    actor.x = Math.max(0, Math.min(actor.x + desplazamientoX / pasos, Math.max(0, escenario.width - actor.ancho)));
    actor.y = Math.max(0, Math.min(actor.y + desplazamientoY / pasos, Math.max(0, escenario.height - actor.alto)));
    const contacto = buscarContacto(actor);
    if (contacto !== null) {
      // Volvemos al último punto libre, junto al borde del objeto.
      actor.x = anteriorX;
      actor.y = anteriorY;
      actor.ejecutar("recibirChoque", contacto);
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
      if (jugador.ejecutar("recibirChoque", entidad)) {
        // Deshacemos el paso del golpe para no empujar ni solaparnos con el actor.
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

