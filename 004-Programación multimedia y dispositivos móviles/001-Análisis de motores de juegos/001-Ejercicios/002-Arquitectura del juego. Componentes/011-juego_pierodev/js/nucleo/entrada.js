// Entrada
document.addEventListener("keydown", function(evento) {
  switch (evento.key) {
    // La barra espaciadora activa el escudo.
    case " ":
      evento.preventDefault();
      if (!evento.repeat) {
        jugador.activarEscudo();
      }
      break;

    case "ArrowUp":
      jugador.mover(0, -avance);
      break;

    case "ArrowDown":
      jugador.mover(0, avance);
      break;

    case "ArrowLeft":
      jugador.mover(-avance, 0);
      break;

    case "ArrowRight":
      jugador.mover(avance, 0);
      break;
  }
});

document.addEventListener("keyup", function(evento) {
  switch (evento.key) {
    case "ArrowUp":
      console.log("UP");
      break;

    case "ArrowDown":
      console.log("DOWN");
      break;

    case "ArrowLeft":
      console.log("LEFT");
      break;

    case "ArrowRight":
      console.log("RIGHT");
      break;
  }
});
