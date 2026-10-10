// El menú y el audio pertenecen al juego, no al motor reutilizable.
const pantalla_inicio = document.querySelector("#pantalla_inicio");
const boton_jugar = document.querySelector("#jugar");
const interfaz = document.querySelector("#interfaz");
const controles_partida = document.querySelector("#controles_partida");
const resultado = document.querySelector("#resultado");
const musica_juego = document.querySelector("#musica_juego");
const volumen_musica = document.querySelector("#volumen_musica");
const valor_volumen = document.querySelector("#valor_volumen");
const estado_recursos = document.querySelector("#estado_recursos");

function mostrarMenu(){
  motor.detener();
  resultado.hidden = true;
  interfaz.hidden = true;
  controles_partida.hidden = true;
  pantalla_inicio.hidden = false;
  // La música continúa si ya se inició desde una interacción del usuario.
  boton_jugar.focus();
}

function reproducirMusica(){
  // Los navegadores permiten iniciar el audio a partir de un clic del usuario.
  musica_juego.play().catch(function() {
    // Si el navegador bloquea el audio, la navegación puede continuar.
  });
}

function jugarDesdeMenu(){
  if (!recursoslistos) {
    return;
  }
  reproducirMusica();
  pantalla_inicio.hidden = true;
  interfaz.hidden = false;
  controles_partida.hidden = false;
  iniciar();
}

function actualizarVolumen(){
  const porcentaje = Number(volumen_musica.value);
  musica_juego.volume = porcentaje / 100;
  valor_volumen.textContent = porcentaje + "%";
}

boton_jugar.addEventListener("click", jugarDesdeMenu);
document.querySelector("#volver_menu").addEventListener("click", mostrarMenu);
document.querySelector("#menu_resultado").addEventListener("click", mostrarMenu);
document.querySelector("#jugar_otra_vez").addEventListener("click", iniciar);
volumen_musica.addEventListener("input", function() {
  actualizarVolumen();
  reproducirMusica();
});

cargaRecursos.then(function() {
  boton_jugar.disabled = false;
  estado_recursos.textContent = "Listo para zarpar.";
}).catch(function() {
  estado_recursos.textContent = "No se pudieron cargar las imágenes. Recarga la página.";
});
actualizarVolumen();
mostrarMenu();
