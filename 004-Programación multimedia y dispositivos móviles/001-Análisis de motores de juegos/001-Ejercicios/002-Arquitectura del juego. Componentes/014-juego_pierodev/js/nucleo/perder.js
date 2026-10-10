function perder(){
  // La energía nunca baja de cero, por eso cero es la condición de derrota.
  // partidaTerminada impide mostrar otro resultado después de ganar o perder.
  if (!partidaTerminada && jugador.energia <= 0) {
    partidaTerminada = true;
    // Cancelamos el siguiente bucle para detener entidades, colisiones y controles.
    clearTimeout(temporizador);
    temporizador = null;
    titulo_resultado.textContent = "Has perdido";
    mensaje_resultado.textContent = "El coche se ha quedado sin energía en el nivel " + nivel + ".";
    botonreiniciar.textContent = "Reintentar nivel";
    accionresultado = "reintentar";
    resultado.hidden = false;
    botonreiniciar.focus();
  }
}
