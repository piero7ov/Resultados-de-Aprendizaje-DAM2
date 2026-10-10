// Controla la portada, su transición, la música y el ajuste de volumen.
var temporizador_menu = null;

function mostrarMenu(){
  // El menú detiene cualquier nivel activo y limpia las teclas que estuvieran pulsadas.
  clearTimeout(temporizador);
  clearTimeout(temporizador_menu);
  temporizador = null;
  temporizador_menu = null;
  partidaTerminada = true;
  reiniciarEntrada();

  // La música no se detiene: si ya empezó, continúa mientras se muestra la portada.
  // La portada sustituye visualmente al juego hasta que el jugador pulse Jugar.
  resultado.hidden = true;
  iu.hidden = true;
  boton_volver_menu.hidden = true;
  pantalla_inicio.classList.remove("saliendo");
  pantalla_inicio.hidden = false;
  boton_jugar.disabled = false;
  boton_jugar.focus();
}

function jugarDesdeMenu(){
  if (pantalla_inicio.classList.contains("saliendo")) return;

  reproducirMusica();

  // La portada sale hacia la derecha antes de revelar el primer nivel.
  pantalla_inicio.classList.add("saliendo");
  boton_jugar.disabled = true;
  temporizador_menu = setTimeout(function() {
    pantalla_inicio.hidden = true;
    pantalla_inicio.classList.remove("saliendo");
    iu.hidden = false;
    boton_volver_menu.hidden = false;
    boton_jugar.disabled = false;
    temporizador_menu = null;
    inicio();
    escenario.focus();
  }, 450);
}

function actualizarVolumen(){
  // El control usa 0-100 y el elemento de audio necesita un valor entre 0 y 1.
  const porcentaje = Number(volumen_musica.value);
  musica_juego.volume = porcentaje / 100;
  valor_volumen.textContent = porcentaje + " %";
}

function reproducirMusica(){
  // Solo se solicita la reproducción desde una interacción hecha por el usuario.
  musica_juego.play().catch(function() {
    // Si el navegador bloquea el audio, el juego puede continuar normalmente.
  });
}

volumen_musica.addEventListener("input", function() {
  actualizarVolumen();
  reproducirMusica();
});

boton_jugar.addEventListener("click", jugarDesdeMenu);
boton_volver_menu.addEventListener("click", mostrarMenu);
actualizarVolumen();
