function actualizarInterfaz(){
  iu_nivel.textContent = "NIVEL " + nivel + " / " + totalniveles;
  // La barra de meta convierte la posición horizontal del coche en un porcentaje.
  const recorrido = Math.max(1, iniciometa - salidajugador);
  const porcentaje = Math.round(Math.max(0,
    Math.min(100, (jugador.x - salidajugador) / recorrido * 100)));
  iu_barra.value = porcentaje;
  iu_numero_progreso.textContent = porcentaje + "%";
  iu_barra_energia.value = jugador.energia;
  iu_numero_energia.textContent = jugador.energia;
  iu_numero_escudo.textContent = jugador.usosescudo;

  if (partidaTerminada) {
    iu_barra_escudo.value = 0;
  } else if (jugador.escudo !== null && jugador.escudo.activo()) {
    const restante = Math.max(0, jugador.escudo.fin - performance.now());
    iu_barra_escudo.value = restante / duracionescudo * 100;
  } else if (jugador.usosescudo > 0) {
    iu_barra_escudo.value = 100;
  } else {
    iu_barra_escudo.value = 0;
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
    if (nivel < totalniveles) {
      // Los dos primeros niveles preparan el botón para cargar el siguiente.
      titulo_resultado.textContent = "¡NIVEL " + nivel + " SUPERADO!";
      mensaje_resultado.textContent = "Has cruzado la carretera. Prepárate: el siguiente nivel tendrá más tráfico y velocidad.";
      botonreiniciar.textContent = "SIGUIENTE NIVEL";
      accionresultado = "siguiente";
    } else {
      // Alcanzar la meta del tercer nivel completa la partida entera.
      titulo_resultado.textContent = "¡JUEGO TERMINADO!";
      mensaje_resultado.textContent = "Has superado los tres niveles. ¡Gran conducción!";
      botonreiniciar.textContent = "VOLVER A JUGAR";
      accionresultado = "reiniciar";
    }
    resultado.hidden = false;
    botonreiniciar.focus();
  }
}
