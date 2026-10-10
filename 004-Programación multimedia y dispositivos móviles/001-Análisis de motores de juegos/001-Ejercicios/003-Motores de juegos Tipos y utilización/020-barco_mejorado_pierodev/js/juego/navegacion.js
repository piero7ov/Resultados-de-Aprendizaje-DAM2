// Física y contactos propios de esta derivación. Las clases del motor se conservan.
const velocidadmaxima = 180;
const aceleracion = 120;
const velocidadgiro = 2;
const rozamientoagua = 0.25;
const intensidadfreno = 3;
const velocidadatraque = 45;

function girar(actor, escena, tiempo, sentido){
  // El ángulo se expresa en radianes y el tiempo en segundos.
  actor.a += sentido * velocidadgiro * Math.min(tiempo, 0.05);
}

function acelerar(actor, escena, tiempo){
  const intervalo = Math.min(tiempo, 0.05);
  // La fuerza apunta hacia la proa. El movimiento previo aporta la inercia.
  actor.velocidadX += Math.cos(actor.a) * aceleracion * intervalo;
  actor.velocidadY += Math.sin(actor.a) * aceleracion * intervalo;
}

function frenar(actor, escena, tiempo){
  // Reducimos la velocidad progresivamente, sin cambiar la orientación.
  const factor = Math.exp(-intensidadfreno * Math.min(tiempo, 0.05));
  actor.velocidadX *= factor;
  actor.velocidadY *= factor;
}

function tocaIsla(actor, isla){
  // El cuerpo del barco es un círculo que rodea su dibujo, incluso al girar.
  // Buscamos el punto del rectángulo de la isla más cercano a su centro.
  const puntoX = Math.max(isla.x, Math.min(actor.x, isla.x + isla.ancho));
  const puntoY = Math.max(isla.y, Math.min(actor.y, isla.y + isla.alto));
  const distanciaX = actor.x - puntoX;
  const distanciaY = actor.y - puntoY;
  return distanciaX * distanciaX + distanciaY * distanciaY < actor.radio * actor.radio;
}

function buscarIsla(actor, escena){
  for (const isla of escena.buscar("isla")) {
    if (tocaIsla(actor, isla)) {
      return isla;
    }
  }
  return null;
}

function navegar(actor, tiempo, escena){
  // Limitamos intervalos largos al regresar de una pestaña en segundo plano.
  const intervalo = Math.min(tiempo, 0.05);
  const resistencia = Math.exp(-rozamientoagua * intervalo);
  actor.velocidadX *= resistencia;
  actor.velocidadY *= resistencia;
  actor.v = Math.hypot(actor.velocidadX, actor.velocidadY);

  if (actor.v > velocidadmaxima) {
    const proporcion = velocidadmaxima / actor.v;
    actor.velocidadX *= proporcion;
    actor.velocidadY *= proporcion;
    actor.v = velocidadmaxima;
  }

  const movimientoX = actor.velocidadX * intervalo;
  const movimientoY = actor.velocidadY * intervalo;
  // Pasos menores que el radio impiden saltar una isla entre dos fotogramas.
  const pasos = Math.ceil(Math.max(Math.abs(movimientoX), Math.abs(movimientoY)) /
    Math.max(1, actor.radio / 2));

  for (let i = 0; i < pasos; i++) {
    const anteriorX = actor.x;
    const anteriorY = actor.y;
    actor.x += movimientoX / pasos;
    actor.y += movimientoY / pasos;
    const isla = buscarIsla(actor, escena);
    const fuera = actor.x < actor.radio || actor.x > escena.motor.canvas.width - actor.radio ||
      actor.y < actor.radio || actor.y > escena.motor.canvas.height - actor.radio;

    if (isla !== null || fuera) {
      // Recuperamos el último punto libre y detenemos el movimiento, no el motor.
      actor.x = anteriorX;
      actor.y = anteriorY;
      actor.velocidadX = 0;
      actor.velocidadY = 0;
      actor.v = 0;
      if (isla !== null) {
        actor.colisionar(isla, escena);
      } else {
        actor.aviso = "Has llegado al límite. Gira para continuar.";
        actor.avisohasta = performance.now() + 1500;
      }
      break;
    }
  }
}

function dentroDelPuerto(actor, puerto){
  // Todo el cuerpo debe estar dentro del puerto; rozar su borde no basta.
  return actor.x - actor.radio >= puerto.x &&
    actor.x + actor.radio <= puerto.x + puerto.ancho &&
    actor.y - actor.radio >= puerto.y &&
    actor.y + actor.radio <= puerto.y + puerto.alto;
}
