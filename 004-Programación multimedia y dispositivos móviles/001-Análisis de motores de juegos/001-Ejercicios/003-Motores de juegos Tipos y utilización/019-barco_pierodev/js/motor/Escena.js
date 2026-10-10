// Contenedor reutilizable: conserva el orden de actualización y de dibujo.
class Escena {
  constructor(configuracion = {}) {
    this.actores = [];
    this.motor = null; // Motor establece esta relación al cargar la escena.

    // Funciones opcionales para el fondo, las reglas y el cierre del fotograma.
    this.alActualizar = configuracion.alActualizar ?? null;
    this.alDibujar = configuracion.alDibujar ?? null;
    this.alFinalizarDibujo = configuracion.alFinalizarDibujo ?? null;
    this.alFinalizar = configuracion.alFinalizar ?? null;

    // Los juegos pueden resolver sus propios contactos sólidos antes de mover.
    this.colisionesAutomaticas = configuracion.colisionesAutomaticas ?? true;
  }

  agregar(actor) {
    this.actores.push(actor);
    return actor;
  }

  buscar(etiqueta) {
    // filter devuelve una lista nueva con los actores activos de ese grupo.
    return this.actores.filter(actor => actor.activo && actor.tiene(etiqueta));
  }

  limpiar() {
    this.actores = [];
  }

  actualizar(tiempo) {
    // Las reglas generales de la escena se ejecutan antes que sus actores.
    this.alActualizar?.(this, tiempo);

    // Recorremos una copia: un actor añadido durante este recorrido se actualizará
    // en el siguiente fotograma, aunque ya pueda dibujarse en el actual.
    for (const actor of [...this.actores]) {
      if (actor.activo) {
        actor.actualizar(tiempo, this);
      }
    }

    if (this.colisionesAutomaticas) {
      this.resolverColisiones();
    }

    // destruir marca un actor como inactivo; aquí se retira de la lista.
    this.actores = this.actores.filter(actor => actor.activo);
  }

  hayColision(a, b) {
    // Ambos cuerpos deben existir y solaparse en los ejes horizontal y vertical.
    // Tocar únicamente un borde no cuenta como solapamiento en esta comprobación.
    return a !== null && b !== null &&
      a.x < b.x + b.ancho && a.x + a.ancho > b.x &&
      a.y < b.y + b.alto && a.y + a.alto > b.y;
  }

  resolverColisiones() {
    for (let i = 0; i < this.actores.length; i++) {
      // j empieza en i + 1 para comprobar cada pareja una sola vez.
      for (let j = i + 1; j < this.actores.length; j++) {
        const a = this.actores[i];
        const b = this.actores[j];

        if (a.activo && b.activo && this.hayColision(a.rectangulo(), b.rectangulo())) {
          a.colisionar(b, this);

          // La primera reacción puede destruir al segundo actor.
          if (b.activo) {
            b.colisionar(a, this);
          }
        }
      }
    }
  }

  dibujar(contexto) {
    // El fondo se pinta antes que los actores para que estos queden por encima.
    this.alDibujar?.(this, contexto);
    for (const actor of this.actores) {
      if (actor.activo) {
        actor.pintar(contexto, this);
      }
    }

    // Permite dibujar elementos por encima de todos los actores.
    this.alFinalizarDibujo?.(this, contexto);
  }
}
