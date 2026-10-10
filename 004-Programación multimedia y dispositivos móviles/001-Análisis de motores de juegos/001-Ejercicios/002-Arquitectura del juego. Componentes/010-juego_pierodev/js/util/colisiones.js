// Detección y resolución de colisiones entre el jugador y los objetos de la carretera.
// Aquí usamos rectángulos para impedir que el coche atraviese árboles y enemigos.
function hayColision(a, b){
  return a.x < b.x + b.ancho && a.x + a.ancho > b.x &&
    a.y < b.y + b.alto && a.y + a.alto > b.y;
}

function buscarContacto(coche){
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
  // Avanzamos como máximo un píxel por paso: una pulsación de 20 píxeles
  // no puede saltarse un tronco fino entre la posición inicial y la final.
  const pasos = Math.ceil(Math.max(Math.abs(desplazamientoX), Math.abs(desplazamientoY)));
  for (let i = 0; i < pasos; i++) {
    const anteriorX = coche.x;
    const anteriorY = coche.y;
    coche.x = Math.max(0, Math.min(coche.x + desplazamientoX / pasos, Math.max(0, anchura - 80)));
    coche.y = Math.max(0, Math.min(coche.y + desplazamientoY / pasos, Math.max(0, altura - 80)));
    if (buscarContacto(coche) !== null) {
      // Volvemos al último punto libre, junto al borde del objeto.
      coche.x = anteriorX;
      coche.y = anteriorY;
      coche.recibirChoque();
      break;
    }
  }
}

function avanzarEntidad(entidad){
  // Los árboles y los enemigos avanzan hacia abajo, también en pasos pequeños.
  const pasos = Math.ceil(Math.abs(entidad.v));
  for (let i = 0; i < pasos; i++) {
    const anteriorY = entidad.y;
    entidad.y += entidad.v / pasos;
    if (hayColision(jugador.rectangulo(), entidad.rectangulo())) {
      jugador.recibirChoque();
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
