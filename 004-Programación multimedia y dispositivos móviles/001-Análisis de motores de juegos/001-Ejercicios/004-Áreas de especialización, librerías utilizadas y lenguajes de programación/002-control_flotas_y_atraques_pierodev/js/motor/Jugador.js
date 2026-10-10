// Actor con controles configurables: pulsación inicial y acciones continuas.
class Jugador extends Actor {
  constructor(configuracion = {}) {
    // super inicializa la posición, los datos y los callbacks heredados de Actor.
    super(configuracion);
    this.controles = configuracion.controles ?? {};
  }

  procesarPulsacion(codigo, escena) {
    // Object.entries devuelve cada nombre de acción junto a su configuración.
    for (const [accion, control] of Object.entries(this.controles)) {
      // El modo pulsacion ejecuta la acción una vez al comenzar a presionar la tecla.
      if (control.teclas.includes(codigo) && control.modo === "pulsacion") {
        this.ejecutar(accion, escena);
      }
    }
  }

  actualizar(tiempo, escena) {
    for (const [accion, control] of Object.entries(this.controles)) {
      // some comprueba si al menos una de las teclas del control sigue pulsada.
      // El modo continua repite la acción en cada fotograma mientras eso ocurra.
      if (control.modo === "continua" &&
          control.teclas.some(codigo => escena.motor.entrada.pulsada(codigo))) {
        this.ejecutar(accion, escena, tiempo);
      }
    }

    // Después se ejecutan los comportamientos y alActualizar heredados de Actor.
    super.actualizar(tiempo, escena);
  }
}
