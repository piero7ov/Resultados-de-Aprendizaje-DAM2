// Traduce el teclado y los botones de resultado en acciones del juego.
// Las flechas se guardan como estado para obtener una velocidad continua y estable.
document.addEventListener("keydown", function(evento) {
  if (partidaTerminada || jugador === null) return;
  switch (evento.key) {
    // La barra espaciadora activa el escudo.
    case " ":
      evento.preventDefault();
      if (!evento.repeat) {
        jugador.activarEscudo();
      }
      break;

    case "ArrowUp":
      evento.preventDefault();
      iniciarMovimiento("arriba");
      break;

    case "ArrowDown":
      evento.preventDefault();
      iniciarMovimiento("abajo");
      break;

    case "ArrowLeft":
      evento.preventDefault();
      iniciarMovimiento("izquierda");
      break;

    case "ArrowRight":
      evento.preventDefault();
      iniciarMovimiento("derecha");
      break;
  }
});

document.addEventListener("keyup", function(evento) {
  // Soltar una flecha detiene únicamente ese eje de movimiento.
  switch (evento.key) {
    case "ArrowUp":
      teclaspulsadas.arriba = false;
      break;

    case "ArrowDown":
      teclaspulsadas.abajo = false;
      break;

    case "ArrowLeft":
      teclaspulsadas.izquierda = false;
      break;

    case "ArrowRight":
      teclaspulsadas.derecha = false;
      break;
  }
});

function iniciarMovimiento(direccion){
  // Una pulsación breve mueve una vez; mantenerla continúa desde el bucle.
  if (!teclaspulsadas[direccion]) {
    teclaspulsadas[direccion] = true;
    actualizarMovimientoJugador();
  }
}

function actualizarMovimientoJugador(){
  let movimientoX = 0;
  let movimientoY = 0;

  if (teclaspulsadas.arriba) movimientoY--;
  if (teclaspulsadas.abajo) movimientoY++;
  if (teclaspulsadas.izquierda) movimientoX--;
  if (teclaspulsadas.derecha) movimientoX++;

  // Reducimos cada eje en diagonal para conservar la misma velocidad total.
  if (movimientoX !== 0 && movimientoY !== 0) {
    movimientoX *= Math.SQRT1_2;
    movimientoY *= Math.SQRT1_2;
  }

  if (movimientoX !== 0 || movimientoY !== 0) {
    jugador.mover(movimientoX * velocidadjugador, movimientoY * velocidadjugador);
  }
}

function reiniciarEntrada(){
  // Evita que el coche siga moviéndose al cambiar de nivel, ventana o menú.
  teclaspulsadas.arriba = false;
  teclaspulsadas.abajo = false;
  teclaspulsadas.izquierda = false;
  teclaspulsadas.derecha = false;
}

window.addEventListener("blur", reiniciarEntrada);

botonreiniciar.addEventListener("click", function() {
  // El mismo botón avanza, reintenta o comienza otra partida según el resultado.
  if (accionresultado === "siguiente") {
    nivel++;
    iniciarNivel();
  } else if (accionresultado === "reintentar") {
    iniciarNivel();
  } else {
    inicio();
  }
  escenario.focus();
});
