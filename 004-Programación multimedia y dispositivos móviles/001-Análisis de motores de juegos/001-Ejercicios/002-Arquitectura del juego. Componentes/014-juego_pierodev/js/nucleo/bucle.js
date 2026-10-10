// Función de bucle
function pintarCarretera(){
  // Las zonas laterales son seguras; el tráfico solo ocupa la franja central.
  contexto.fillStyle = "#58734D";
  contexto.fillRect(0, 0, anchurazonasegura, altura);
  contexto.fillStyle = "#71884F";
  contexto.fillRect(iniciometa, 0, anchurazonasegura, altura);

  contexto.strokeStyle = "#E7E0B8";
  contexto.lineWidth = 3;
  contexto.beginPath();
  contexto.moveTo(iniciocarretera, 0);
  contexto.lineTo(iniciocarretera, altura);
  contexto.moveTo(iniciometa, 0);
  contexto.lineTo(iniciometa, altura);
  contexto.stroke();

  contexto.fillStyle = "rgba(255, 255, 255, 0.75)";
  contexto.font = "12px Arial";
  contexto.textAlign = "center";
  contexto.fillText("SALIDA", anchurazonasegura / 2, altura - 18);
  contexto.fillText("META", iniciometa + anchurazonasegura / 2, altura - 18);
}

function bucle(){
  if (partidaTerminada) return;
  //console.log("Yo soy el bucle");
  contexto.clearRect(0, 0, anchura, altura);
  pintarCarretera();
  // El movimiento se calcula una vez por fotograma y no depende de la repetición del teclado.
  actualizarMovimientoJugador();
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
  // La pérdida se comprueba primero para que quedarse sin energía tenga prioridad.
  perder();
  ganar();
  actualizarInterfaz();
  if (partidaTerminada) return;
  clearTimeout(temporizador);
  temporizador = setTimeout(bucle, 1000 / fps);
}
