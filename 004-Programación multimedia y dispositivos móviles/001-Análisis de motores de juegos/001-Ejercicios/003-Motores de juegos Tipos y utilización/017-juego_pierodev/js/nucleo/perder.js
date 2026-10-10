// Finaliza el intento cuando la energía llega a cero y permite repetir el nivel.
function perder(){
  // La energía nunca baja de cero, por eso cero es la condición de derrota.
  // partidaTerminada impide mostrar otro resultado después de ganar o perder.
  if (!partidaTerminada && jugador.energia <= 0) {
    partidaTerminada = true;
    // Cancelamos el siguiente bucle para detener entidades, colisiones y controles.
    clearTimeout(temporizador);
    temporizador = null;
    titulo_resultado.textContent = "¡FIN DEL INTENTO!";
    mensaje_resultado.textContent = "Te has quedado sin energía en el nivel " + nivel + ". Puedes volver a intentarlo.";
    botonreiniciar.textContent = "REINTENTAR NIVEL";
    accionresultado = "reintentar";
    resultado.hidden = false;
    botonreiniciar.focus();
  }
}
