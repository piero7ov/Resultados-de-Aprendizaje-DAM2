// Unidad genérica: los dibujos, cuerpos y acciones se configuran desde cada juego.
class Actor {
  constructor(configuracion = {}) {
    // ?? aplica el valor por defecto solo cuando el dato es null o undefined.
    // Así se respetan valores válidos como una posición o velocidad igual a cero.
    this.x = configuracion.x ?? 0;
    this.y = configuracion.y ?? 0;
    this.a = configuracion.angulo ?? 0;
    this.v = configuracion.velocidad ?? 0;

    // Copiamos los datos propios del juego, por ejemplo ancho, color o energía.
    Object.assign(this, configuracion.datos ?? {});

    // Las etiquetas identifican grupos de actores. Set evita etiquetas duplicadas.
    this.etiquetas = new Set(configuracion.etiquetas ?? []);
    this.activo = true;
    this.comportamientos = [];
    this.acciones = configuracion.acciones ?? {};

    // Son callbacks: funciones que el juego aporta para personalizar la instancia.
    // null indica que ese actor no necesita una función para esa tarea.
    this.alActualizar = configuracion.alActualizar ?? null;
    this.alDibujar = configuracion.alDibujar ?? null;
    this.alRectangulo = configuracion.alRectangulo ?? null;
    this.alColisionar = configuracion.alColisionar ?? null;
    this.alDestruir = configuracion.alDestruir ?? null;
  }

  agregarComportamiento(comportamiento) {
    this.comportamientos.push(comportamiento);

    // Devolver el propio actor permite encadenar varios comportamientos.
    return this;
  }

  actualizar(tiempo, escena) {
    // Cada comportamiento recibe el actor, los segundos transcurridos y su escena.
    for (const comportamiento of this.comportamientos) {
      comportamiento(this, tiempo, escena);
    }

    // ?. evita llamar a una función opcional si es null o undefined.
    this.alActualizar?.(this, tiempo, escena);
  }

  pintar(contexto, escena) {
    this.alDibujar?.(this, contexto, escena);
  }

  rectangulo() {
    // Un actor sin cuerpo configurado devuelve null y no tiene colisiones automáticas.
    return this.alRectangulo?.(this) ?? null;
  }

  ejecutar(nombre, ...argumentos) {
    // ... recoge los argumentos adicionales y los entrega a la acción configurada.
    // El actor se pasa primero; el resultado de la acción se devuelve al llamador.
    return this.acciones[nombre]?.(this, ...argumentos);
  }

  tiene(etiqueta) {
    return this.etiquetas.has(etiqueta);
  }

  colisionar(otro, escena) {
    this.alColisionar?.(this, otro, escena);
  }

  destruir(escena) {
    // Evitamos ejecutar alDestruir varias veces para el mismo actor.
    if (!this.activo) {
      return;
    }

    // La escena retirará el actor de su lista al terminar la actualización.
    this.activo = false;
    this.alDestruir?.(this, escena);
  }
}
