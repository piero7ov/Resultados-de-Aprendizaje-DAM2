// Esta configuración conserva el cruce del juego anterior con figuras simples.
// Una derivación cambia estos actores y reglas y conserva js/motor.
const escenario = document.querySelector("#escenario");
const estado = document.querySelector("#estado");
const mensaje = document.querySelector("#mensaje");
const continuar = document.querySelector("#continuar");
const motor = new Motor(escenario, { fps: 30 });
const escena = new Escena({ colisionesAutomaticas: false });
const duracionescudo = 3000;
const duracionfrenado = 1000;
const duracionproteccion = 1000;
const daniocolision = 20;
const velocidadjugador = 5;
const configuracionniveles = [
  { obstaculos: 10, velocidadobstaculos: 2, enemigos: 5, velocidadenemigos: 3 },
  { obstaculos: 12, velocidadobstaculos: 3, enemigos: 6, velocidadenemigos: 4 },
  { obstaculos: 14, velocidadobstaculos: 4, enemigos: 7, velocidadenemigos: 5 }
];
let nivel = 1;
let jugador = null;
let iniciozona = 0;
let iniciometa = 0;
let salidajugador = 0;
let accionresultado = "reiniciar";

function ajustarEscenario(){
  escenario.width = escenario.clientWidth;
  escenario.height = escenario.clientHeight;
  const anchurasegura = Math.min(120, Math.max(40, escenario.width * 0.15));
  iniciozona = anchurasegura;
  iniciometa = escenario.width - anchurasegura;
  salidajugador = Math.max(0, (anchurasegura - 32) / 2);
}

function actualizarMovimientoJugador(){
  const entrada = motor.entrada;
  let movimientoX = Number(entrada.pulsada("ArrowRight")) - Number(entrada.pulsada("ArrowLeft"));
  let movimientoY = Number(entrada.pulsada("ArrowDown")) - Number(entrada.pulsada("ArrowUp"));
  if (movimientoX !== 0 && movimientoY !== 0) {
    movimientoX *= Math.SQRT1_2;
    movimientoY *= Math.SQRT1_2;
  }
  moverJugador(jugador, movimientoX * velocidadjugador, movimientoY * velocidadjugador);
}

function iniciarNivel(){
  motor.detener();
  ajustarEscenario();
  escena.limpiar();
  mensaje.textContent = "";
  continuar.hidden = true;
  jugador = crearJugador(salidajugador, Math.max(0, (escenario.height - 32) / 2));
  const configuracion = configuracionniveles[nivel - 1];
  for (let i = 0; i < configuracion.obstaculos; i++) {
    escena.agregar(crearObstaculo(96, 18, configuracion.velocidadobstaculos,
      "#777777", "obstaculo", Math.random() * escenario.height));
  }
  for (let i = 0; i < configuracion.enemigos; i++) {
    escena.agregar(crearObstaculo(32, 48, configuracion.velocidadenemigos,
      "#aa8833", "enemigo", -48 - Math.random() * escenario.height));
  }
  escena.agregar(jugador);
  motor.cargar(escena);
  motor.iniciar();
  escenario.focus();
}

function pintarZonas(escena, contexto){
  contexto.fillStyle = "#dddddd";
  contexto.fillRect(0, 0, iniciozona, escenario.height);
  contexto.fillRect(iniciometa, 0, escenario.width - iniciometa, escenario.height);
  contexto.fillStyle = "#333333";
  contexto.font = "12px Arial";
  contexto.textAlign = "center";
  contexto.fillText("SALIDA", iniciozona / 2, escenario.height - 12);
  contexto.fillText("META", (iniciometa + escenario.width) / 2, escenario.height - 12);
}

function terminarNivel(texto, accion, boton){
  motor.detener();
  mensaje.textContent = texto;
  accionresultado = accion;
  continuar.textContent = boton;
  continuar.hidden = false;
}

function comprobarResultado(){
  const recorrido = Math.max(1, iniciometa - salidajugador);
  const progreso = Math.round(Math.max(0, Math.min(100, (jugador.x - salidajugador) / recorrido * 100)));
  const escudo = jugador.escudo !== null ?
    Math.ceil(Math.max(0, jugador.escudo.fin - performance.now()) / 1000) + " s" : jugador.usosescudo + " uso";
  estado.textContent = "Nivel: " + nivel + "/3 · Meta: " + progreso +
    "% · Energía: " + jugador.energia + " · Escudo: " + escudo;
  // Como en el juego anterior, la derrota tiene prioridad si coincide con la meta.
  if (jugador.energia <= 0) {
    terminarNivel("Sin energía. Reintenta este nivel.", "reintentar", "Reintentar nivel");
  } else if (jugador.x >= iniciometa) {
    if (nivel < configuracionniveles.length) {
      terminarNivel("Has llegado al otro lado.", "siguiente", "Siguiente nivel");
    } else {
      terminarNivel("Has superado los tres niveles.", "reiniciar", "Volver a jugar");
    }
  }
}

escena.alActualizar = function() { actualizarMovimientoJugador(); };
escena.alDibujar = pintarZonas;
escena.alFinalizar = comprobarResultado;
continuar.addEventListener("click", function() {
  if (accionresultado === "siguiente") nivel++;
  if (accionresultado === "reiniciar") nivel = 1;
  iniciarNivel();
});
window.addEventListener("resize", function() {
  ajustarEscenario();
  if (jugador !== null) {
    jugador.x = Math.max(0, Math.min(jugador.x, Math.max(0, escenario.width - jugador.ancho)));
    jugador.y = Math.max(0, Math.min(jugador.y, Math.max(0, escenario.height - jugador.alto)));
  }
  if (!motor.corriendo) escena.dibujar(motor.contexto);
});
iniciarNivel();
