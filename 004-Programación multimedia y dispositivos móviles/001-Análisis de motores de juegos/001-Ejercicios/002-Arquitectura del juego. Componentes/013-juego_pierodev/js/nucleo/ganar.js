function actualizarInterfaz(){
  // La barra de meta convierte la posición horizontal del coche en un porcentaje.
  const recorrido = Math.max(1, iniciometa - salidajugador);
  const porcentaje = Math.round(Math.max(0,
    Math.min(100, (jugador.x - salidajugador) / recorrido * 100)));
  iu_barra.value = porcentaje;
  iu_numero_progreso.textContent = porcentaje + "%";
  iu_barra_energia.value = jugador.energia;
  iu_numero_energia.textContent = jugador.energia;

  if (partidaTerminada) {
    iu_barra_escudo.value = 0;
    iu_numero_escudo.textContent = "Fin";
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
  // La victoria solo se comprueba mientras la partida continúa.
  // jugador.x marca el borde izquierdo del sprite: al alcanzar iniciometa,
  // el coche ha entrado por completo en la zona segura de la derecha.
  if (!partidaTerminada && jugador.x >= iniciometa) {
    partidaTerminada = true;
    // Detenemos el siguiente bucle para congelar el juego bajo el resultado.
    clearTimeout(temporizador);
    temporizador = null;
    titulo_resultado.textContent = "¡Recorrido completado!";
    mensaje_resultado.textContent = "Has llegado al otro lado de la carretera.";
    resultado.hidden = false;
    botonreiniciar.focus();
  }
}
