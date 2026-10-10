// La derivación usa las mismas cinco clases de js/motor que el ejercicio 018.
const escenario = document.querySelector("#escenario");
const estado = document.querySelector("#estado");
const indicadorvelocidad = document.querySelector("#velocidad");
const reiniciar = document.querySelector("#reiniciar");
const motor = new Motor(escenario, { fps: 30 });
// Los contactos sólidos se resuelven durante el movimiento para impedir atravesar islas.
const escena = new Escena({ colisionesAutomaticas: false });
let barco = null;
let puerto = null;
let terminado = false;

function ajustarEscenario(){
  const anchoAnterior = escenario.width;
  const altoAnterior = escenario.height;
  escenario.width = escenario.clientWidth;
  escenario.height = escenario.clientHeight;

  // Las proporciones mantienen la distribución al cambiar el tamaño de la ventana.
  for (const actor of escena.actores) {
    if (actor.tiene("isla") || actor.tiene("puerto")) {
      actor.x = actor.proporcionX * escenario.width;
      actor.y = actor.proporcionY * escenario.height;
      actor.ancho = actor.proporcionAncho * escenario.width;
      actor.alto = actor.proporcionAlto * escenario.height;
    }
  }

  if (barco !== null) {
    barco.radio = Math.min(22, escenario.width * 0.035, escenario.height * 0.06);
    barco.x = Math.max(barco.radio, Math.min(barco.x / Math.max(1, anchoAnterior) * escenario.width,
      escenario.width - barco.radio));
    barco.y = Math.max(barco.radio, Math.min(barco.y / Math.max(1, altoAnterior) * escenario.height,
      escenario.height - barco.radio));
    // Si la nueva distribución lo deja sobre tierra, vuelve a la salida segura.
    if (buscarIsla(barco, escena) !== null) {
      barco.x = escenario.width * 0.1;
      barco.y = escenario.height * 0.5;
      barco.velocidadX = 0;
      barco.velocidadY = 0;
      barco.v = 0;
    }
  }
}

function iniciar(){
  resultado.hidden = true;
  motor.detener();
  escena.limpiar();
  barco = null;
  terminado = false;
  ajustarEscenario();

  escena.agregar(crearZona("isla", 0.33, 0.16, 0.13, 0.28));
  escena.agregar(crearZona("isla", 0.49, 0.57, 0.13, 0.27));
  escena.agregar(crearZona("isla", 0.64, 0.20, 0.12, 0.25));
  puerto = escena.agregar(crearZona("puerto", 0.82, 0.40, 0.14, 0.22));
  ajustarEscenario();

  const radio = Math.min(22, escenario.width * 0.035, escenario.height * 0.06);
  barco = escena.agregar(crearBarco(escenario.width * 0.1, escenario.height * 0.5, radio));
  motor.cargar(escena);
  motor.iniciar();
  escenario.focus();
}

function comprobarDestino(){
  const porcentaje = Math.round(barco.v / velocidadmaxima * 100);
  indicadorvelocidad.textContent = porcentaje + "%";
  document.querySelector("#barra_velocidad").value = porcentaje;
  if (dentroDelPuerto(barco, puerto)) {
    if (barco.v <= velocidadatraque) {
      terminado = true;
      motor.detener();
      estado.textContent = "Has atracado en el puerto.";
      resultado.hidden = false;
    } else {
      estado.textContent = "Ya estás en el puerto. Frena para atracar.";
    }
  } else if (performance.now() < barco.avisohasta) {
    estado.textContent = barco.aviso;
  } else {
    estado.textContent = "Navega entre las islas hasta el puerto.";
  }
}

// El fondo se dibuja antes de los actores; las pequeñas crestas sugieren el agua.
function dibujarAgua(escena, contexto){
  contexto.fillStyle = "#31889a";
  contexto.fillRect(0, 0, escenario.width, escenario.height);
  contexto.fillStyle = "rgba(168, 224, 220, 0.18)";
  for (let fila = 0; fila < escenario.height; fila += 48) {
    const desplazamiento = (fila / 48 % 2) * 40;
    for (let columna = desplazamiento; columna < escenario.width; columna += 96) {
      contexto.fillRect(columna, fila + 18, 12, 2);
      contexto.fillRect(columna + 12, fila + 16, 6, 2);
    }
  }
}

escena.alDibujar = dibujarAgua;
escena.alFinalizar = comprobarDestino;
reiniciar.addEventListener("click", iniciar);
window.addEventListener("resize", function() {
  ajustarEscenario();
  if (terminado) {
    escena.dibujar(motor.contexto);
  }
});



