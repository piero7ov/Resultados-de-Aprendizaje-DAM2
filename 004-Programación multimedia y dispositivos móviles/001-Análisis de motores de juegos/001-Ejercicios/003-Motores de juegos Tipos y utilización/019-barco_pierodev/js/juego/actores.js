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
      contexto.fillStyle = "#ffffff";
      contexto.strokeStyle = "#334455";
      contexto.lineWidth = 2;
      contexto.beginPath();
      contexto.moveTo(actor.radio, 0);
      contexto.lineTo(actor.radio * 0.2, actor.radio * 0.55);
      contexto.lineTo(-actor.radio * 0.8, actor.radio * 0.55);
      contexto.lineTo(-actor.radio * 0.8, -actor.radio * 0.55);
      contexto.lineTo(actor.radio * 0.2, -actor.radio * 0.55);
      contexto.closePath();
      contexto.fill();
      contexto.stroke();
      contexto.fillStyle = "#334455";
      contexto.fillRect(-actor.radio * 0.4, -actor.radio * 0.25, actor.radio * 0.5, actor.radio * 0.5);
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
      contexto.fillStyle = actor.tiene("puerto") ? "#c7b58b" : "#789660";
      contexto.fillRect(actor.x, actor.y, actor.ancho, actor.alto);
      contexto.fillStyle = "#253329";
      contexto.font = "12px Arial";
      contexto.textAlign = "center";
      contexto.fillText(actor.tiene("puerto") ? "PUERTO" : "ISLA",
        actor.x + actor.ancho / 2, actor.y + actor.alto / 2);
    },
    alRectangulo: function(actor) {
      return { x: actor.x, y: actor.y, ancho: actor.ancho, alto: actor.alto };
    }
  });
}
