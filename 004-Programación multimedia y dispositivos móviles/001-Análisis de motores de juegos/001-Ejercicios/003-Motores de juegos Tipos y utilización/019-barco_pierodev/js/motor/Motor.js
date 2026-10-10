// Canvas, tiempo, teclado y ejecución. No contiene reglas de coches o niveles.
// Motor coordina el trabajo: Entrada recoge las teclas y Escena gestiona los actores.
class Motor {
  // El segundo argumento es opcional. Si no se indica fps, se utiliza 30.
  // Ejemplo: new Motor(canvas, { fps: 60 }).
  constructor(canvas, { fps = 30 } = {}) {
    // El canvas es el elemento HTML; el contexto proporciona las funciones de dibujo.
    this.canvas = canvas;
    this.contexto = canvas.getContext("2d");
    this.fps = fps;
    this.entrada = new Entrada();

    // Todavía no hay una escena cargada ni un bucle en marcha.
    this.escena = null;
    this.corriendo = false;

    // temporizador guarda el identificador de setTimeout para poder cancelarlo.
    // ultimo guarda el instante del fotograma anterior, expresado en milisegundos.
    this.temporizador = null;
    this.ultimo = 0;

    // Entrada avisa de una pulsación nueva. El motor la entrega a los jugadores.
    // La función flecha conserva el this de Motor dentro de este callback.
    this.entrada.alPulsar = codigo => {
      // ?. permite consultar actores sin fallar si escena es null.
      // ?? utiliza [] si todavía no hay una escena, por lo que no se recorre nada.
      for (const actor of this.escena?.actores ?? []) {
        // instanceof comprueba que el actor pertenece a Jugador o a una subclase.
        if (actor.activo && actor instanceof Jugador) {
          actor.procesarPulsacion(codigo, this.escena);
        }
      }
    };
  }

  // Cambia la escena con el motor detenido y prepara sus controles de teclado.
  cargar(escena) {
    // Cancelamos el bucle anterior y limpiamos las teclas que estuvieran pulsadas.
    this.detener();

    // La relación funciona en ambos sentidos: el motor conoce su escena y
    // la escena puede acceder al canvas o al teclado mediante escena.motor.
    this.escena = escena;
    escena.motor = this;

    // Solo se capturan las teclas configuradas para los jugadores de esta escena.
    // clear elimina los controles anteriores; Set evita almacenar códigos repetidos.
    this.entrada.codigos.clear();
    for (const actor of escena.actores) {
      if (actor instanceof Jugador) {
        // Object.values obtiene las configuraciones de los controles del jugador.
        for (const control of Object.values(actor.controles)) {
          for (const codigo of control.teclas) {
            this.entrada.codigos.add(codigo);
          }
        }
      }
    }
  }

  // Arranca el bucle. La escena debe haberse cargado antes con cargar().
  iniciar() {
    // Este control impide arrancar dos bucles o ejecutar uno sin escena.
    if (this.corriendo || this.escena === null) {
      return;
    }

    this.corriendo = true;
    this.entrada.habilitada = true;

    // performance.now proporciona un reloj en milisegundos para medir intervalos.
    // Reiniciamos la referencia para que una pausa no cuente como tiempo del juego.
    this.ultimo = performance.now();

    // Dibujamos el primer fotograma de inmediato, sin esperar al temporizador.
    this.bucle();
  }

  // Detiene la ejecución y la entrada, pero conserva los actores de la escena.
  detener() {
    this.corriendo = false;

    // Cancelamos el siguiente fotograma si estaba programado.
    clearTimeout(this.temporizador);
    this.temporizador = null;

    // Limpiar el teclado evita que un movimiento continúe al reanudar el juego.
    this.entrada.habilitada = false;
    this.entrada.reiniciar();
  }

  // Un fotograma: medir el tiempo, actualizar el estado, dibujar y repetir.
  bucle() {
    if (!this.corriendo) {
      return;
    }

    // El temporizador que nos llamó ya se ha ejecutado; no está pendiente.
    this.temporizador = null;

    // La diferencia entre instantes es el tiempo real entre dos fotogramas.
    // Dividimos por 1000 para entregarlo en segundos a actores y comportamientos.
    const ahora = performance.now();
    const tiempo = (ahora - this.ultimo) / 1000;
    this.ultimo = ahora;

    // Borramos el dibujo anterior para que las figuras no dejen un rastro.
    this.contexto.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Primero se calculan los movimientos y contactos; después se pinta el resultado.
    this.escena.actualizar(tiempo);
    this.escena.dibujar(this.contexto);

    // El juego puede comprobar aquí su resultado y llamar a detener().
    // ?. solo ejecuta alFinalizar si se ha configurado ese callback.
    this.escena.alFinalizar?.(this.escena, tiempo);

    // Revisamos otra vez corriendo: el juego puede haber terminado en este fotograma.
    if (this.corriendo) {
      // 1000 / fps es la espera en milisegundos: con 30 fps, aproximadamente 33,3 ms.
      // Es una espera solicitada al navegador; no garantiza una frecuencia exacta.
      // Guardamos el identificador para que detener() pueda cancelar esta llamada.
      this.temporizador = setTimeout(() => this.bucle(), 1000 / this.fps);
    }
  }
}
