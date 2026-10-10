// El juego especializa instancias; el motor no necesita clases Coche o Escudo.
function dibujarRectangulo(actor, contexto){
  contexto.fillStyle = actor.color;
  contexto.fillRect(actor.x, actor.y, actor.ancho, actor.alto);
}

function cuerpoRectangular(actor){
  return { x: actor.x, y: actor.y, ancho: actor.ancho, alto: actor.alto };
}

function crearJugador(x, y){
  return new Jugador({
    x, y,
    etiquetas: ["jugador"],
    datos: {
      ancho: 32, alto: 32, color: "#2277cc",
      energia: 100, usosescudo: 1, escudo: null, protegidohasta: 0
    },
    controles: {
      paso: { teclas: ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], modo: "pulsacion" },
      escudo: { teclas: ["Space"], modo: "pulsacion" }
    },
    acciones: {
      paso: function() { actualizarMovimientoJugador(); },
      escudo: function(actor, escena) {
        if (actor.usosescudo > 0 && actor.escudo === null) {
          actor.usosescudo--;
          actor.escudo = crearEscudo(actor);
          escena.agregar(actor.escudo);
        }
      },
      recibirChoque: function(actor, otro) {
        const ahora = performance.now();
        if (actor.escudo !== null && ahora < actor.escudo.fin) {
          otro.detenidohasta = ahora + duracionfrenado;
          return true;
        }
        // Un contacto continuado solo descuenta energía una vez por segundo.
        if (ahora >= actor.protegidohasta) {
          actor.energia = Math.max(0, actor.energia - daniocolision);
          actor.protegidohasta = ahora + duracionproteccion;
        }
        return false;
      }
    },
    alDibujar: dibujarRectangulo,
    alRectangulo: cuerpoRectangular
  });
}

function descender(actor){
  avanzarEntidad(actor);
  if (actor.y > escenario.height) {
    actor.detenidohasta = 0;
    actor.y = -actor.alto;
    actor.x = iniciozona + Math.random() * Math.max(0, iniciometa - iniciozona - actor.ancho);
  }
}

function crearObstaculo(ancho, alto, velocidad, color, etiqueta, y){
  const actor = new Actor({
    x: iniciozona + Math.random() * Math.max(0, iniciometa - iniciozona - ancho),
    y,
    velocidad,
    etiquetas: ["solido", etiqueta],
    datos: { ancho, alto, color, detenidohasta: 0 },
    alDibujar: dibujarRectangulo,
    alRectangulo: cuerpoRectangular
  });
  return actor.agregarComportamiento(descender);
}

function crearEscudo(jugador){
  const escudo = new Actor({
    etiquetas: ["escudo"],
    datos: { fin: performance.now() + duracionescudo },
    alActualizar: function(actor, tiempo, escena) {
      actor.x = jugador.x;
      actor.y = jugador.y;
      if (performance.now() >= actor.fin) actor.destruir(escena);
    },
    alDibujar: function(actor, contexto) {
      contexto.strokeStyle = "#2277cc";
      contexto.lineWidth = 2;
      contexto.beginPath();
      contexto.arc(actor.x + jugador.ancho / 2, actor.y + jugador.alto / 2, 26, 0, Math.PI * 2);
      contexto.stroke();
    },
    alDestruir: function() { jugador.escudo = null; }
  });
  return escudo;
}
