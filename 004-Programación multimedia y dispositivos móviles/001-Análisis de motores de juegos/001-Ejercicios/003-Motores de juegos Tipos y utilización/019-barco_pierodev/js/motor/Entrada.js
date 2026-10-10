// Guarda las teclas y avisa de la primera pulsación, sin conocer acciones del juego.
class Entrada {
  constructor() {
    this.teclas = new Set(); // Teclas que se mantienen pulsadas.
    this.codigos = new Set(); // Teclas que utiliza la escena actual.
    this.habilitada = false;
    this.alPulsar = null;

    document.addEventListener("keydown", evento => {
      // Una escena detenida no recibe pulsaciones; las teclas ajenas se ignoran.
      if (!this.habilitada || !this.codigos.has(evento.code)) {
        return;
      }

      // Impedimos acciones del navegador, como desplazar la página con las flechas.
      evento.preventDefault();

      // repeat indica la repetición automática al mantener una tecla presionada.
      const nueva = !this.teclas.has(evento.code) && !evento.repeat;
      this.teclas.add(evento.code);
      if (nueva) {
        this.alPulsar?.(evento.code);
      }
    });

    document.addEventListener("keyup", evento => {
      this.teclas.delete(evento.code);
    });

    // Al salir de la ventana puede no llegar keyup: limpiamos el estado del teclado.
    window.addEventListener("blur", () => {
      this.reiniciar();
    });
  }

  pulsada(codigo) {
    return this.teclas.has(codigo);
  }

  reiniciar() {
    this.teclas.clear();
  }
}
