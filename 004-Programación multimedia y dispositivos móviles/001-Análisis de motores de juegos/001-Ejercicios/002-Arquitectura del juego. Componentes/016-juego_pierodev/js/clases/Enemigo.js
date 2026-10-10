// Vehículo del tráfico que desciende por la carretera y puede empujar al jugador.
class Enemigo extends Entidad {
  constructor(x, y, angulo, velocidad) {
    super(x, y, angulo, velocidad);
    this.detenidohasta = 0;
  }

  pintar(){
    const ancho = imagen_enemigo.naturalWidth / 2;
    const alto = imagen_enemigo.naturalHeight / 2;
    // El cuadro inferior izquierdo muestra el coche orientado hacia abajo.
    contexto.imageSmoothingEnabled = false;
    contexto.drawImage(imagen_enemigo, 0, alto, ancho, alto, this.x, this.y, 80, 80);
  }

  mover(){
    // El avance también comprueba colisiones: puede empujar al jugador o detenerse.
    avanzarEntidad(this);
    // Al salir por abajo se reutiliza la instancia en otra posición de la carretera.
    if (this.y > altura) {
      this.detenidohasta = 0;
      this.y = -80;
      this.x = iniciocarretera + Math.random() *
        Math.max(0, iniciometa - iniciocarretera - 80);
    }
  }

  rectangulo(){
    // Cuerpo del coche amarillo orientado hacia abajo, sin margen transparente.
    return { x: this.x + 26, y: this.y + 17, ancho: 30, alto: 48 };
  }
}
