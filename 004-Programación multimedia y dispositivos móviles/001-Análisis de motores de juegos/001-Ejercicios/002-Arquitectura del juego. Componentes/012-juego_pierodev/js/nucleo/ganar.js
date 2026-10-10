function actualizarInterfaz(){
  const recorrido = Math.max(1, iniciometa - salidajugador);
  const porcentaje = Math.round(Math.max(0,
    Math.min(100, (jugador.x - salidajugador) / recorrido * 100)));
  iu_barra.value = porcentaje;
  iu_numero_progreso.textContent = porcentaje + "%";

  if (partidaTerminada) {
    iu_barra_escudo.value = 0;
    iu_numero_escudo.textContent = "Meta";
  } else if (jugador.escudo !== null && jugador.escudo.activo()) {
    const restante = Math.max(0, jugador.escudo.fin - performance.now());
    iu_barra_escudo.value = restante / duracionescudo * 100;
    iu_numero_escudo.textContent = Math.ceil(restante / 1000) + " s";
  } else {
    iu_barra_escudo.value = 100;
    iu_numero_escudo.textContent = "Listo";
  }
}

function ganar(){
  // El coche debe entrar por completo en la zona de meta.
  if (!partidaTerminada && jugador.x >= iniciometa) {
    partidaTerminada = true;
    clearTimeout(temporizador);
    temporizador = null;
    resultado.hidden = false;
    botonreiniciar.focus();
  }
}
