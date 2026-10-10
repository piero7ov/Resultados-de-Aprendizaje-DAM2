// Función de bucle
function bucle(){
  //console.log("Yo soy el bucle");
  contexto.clearRect(0, 0, anchura, altura);
  // Dibujamos las marcas viales antes que los coches y los obstáculos.
  marcasviales.forEach(function(marca) {
    marca.mover();
    marca.pintar();
  });
  obstaculos.forEach(function(obstaculo) {
    obstaculo.mover();
    obstaculo.pintar();
  });
  enemigos.forEach(function(enemigo) {
    enemigo.mover();
    enemigo.pintar();
  });
  // Pintamos el jugador y su escudo por encima del resto de entidades.
  jugador.pintar();
  if (jugador.escudo !== null) {
    if (jugador.escudo.activo()) {
      jugador.escudo.actualizar(jugador);
      jugador.escudo.pintar();
    } else {
      // Al terminar su duración, liberamos el escudo para permitir otra activación.
      jugador.escudo = null;
    }
  }
  clearTimeout(temporizador);
  temporizador = setTimeout(bucle, 1000 / fps);
}
