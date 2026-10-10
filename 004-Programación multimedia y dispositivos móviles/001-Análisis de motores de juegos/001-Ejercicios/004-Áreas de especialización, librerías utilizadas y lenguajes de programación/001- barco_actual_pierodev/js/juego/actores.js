// Actores configurados para este simulador; no creamos nuevas clases especializadas.
function crearBarco(x, y, radio){
  const actor = new Jugador({
    x, y,
    angulo: 0,
    etiquetas: ["barco"],
    datos: {
      radio,
      velocidadX: 0,
      velocidadY: 0,
      aviso: "",
      avisohasta: 0
    },
    controles: {
      izquierda: { teclas: ["ArrowLeft"], modo: "continua" },
      derecha: { teclas: ["ArrowRight"], modo: "continua" },
      acelerar: { teclas: ["ArrowUp"], modo: "continua" },
      frenar: { teclas: ["ArrowDown"], modo: "continua" }
    },
    acciones: {
      izquierda: function(actor, escena, tiempo) {
        girar(actor, escena, tiempo, -1);
      },
      derecha: function(actor, escena, tiempo) {
        girar(actor, escena, tiempo, 1);
      },
      acelerar,
      frenar
    },
    alDibujar: function(actor, contexto) {
      // Dibujamos alrededor del centro del barco y giramos solo su dibujo.
      contexto.save();
      contexto.translate(actor.x, actor.y);
      contexto.rotate(actor.a);
      // El sprite mira hacia la derecha, igual que el ángulo cero del motor.
      // El margen transparente queda dentro del círculo de colisión conservado.
      contexto.imageSmoothingEnabled = false;
      if (actor.v > 10) {
        contexto.fillStyle = "rgba(215, 246, 242, 0.5)";
        contexto.fillRect(-actor.radio * 1.5, -4, 8, 8);
        contexto.fillRect(-actor.radio * 1.9, -2, 5, 4);
      }
      contexto.drawImage(imagenes.barco, -actor.radio * 1.2, -actor.radio * 0.7,
        actor.radio * 2.4, actor.radio * 1.4);
      contexto.restore();
    },
    alColisionar: function(actor, otro) {
      if (otro.tiene("isla")) {
        actor.aviso = "La isla bloquea el paso. Gira para rodearla.";
        actor.avisohasta = performance.now() + 1500;
      }
    }
  });
  return actor.agregarComportamiento(navegar);
}

function crearZona(etiqueta, proporcionX, proporcionY, proporcionAncho, proporcionAlto){
  return new Actor({
    etiquetas: [etiqueta],
    datos: { proporcionX, proporcionY, proporcionAncho, proporcionAlto, ancho: 0, alto: 0 },
    alDibujar: function(actor, contexto) {
      const imagen = actor.tiene("puerto") ? imagenes.puerto : imagenes.isla;
      contexto.imageSmoothingEnabled = false;
      contexto.drawImage(imagen, actor.x, actor.y, actor.ancho, actor.alto);
      if (actor.tiene("puerto")) {
        contexto.fillStyle = "#fff0c8";
        contexto.font = "bold 12px Courier New";
        contexto.textAlign = "center";
        contexto.fillText("PUERTO", actor.x + actor.ancho / 2, actor.y - 10);
      }
    },
    alRectangulo: function(actor) {
      return { x: actor.x, y: actor.y, ancho: actor.ancho, alto: actor.alto };
    }
  });
}

