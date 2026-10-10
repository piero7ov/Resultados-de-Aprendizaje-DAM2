// Representa los otros coches que el jugador deberá esquivar.
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
    // Reutilizamos el coche cuando sale por abajo, igual que los árboles.
    if (this.y > altura) {
      this.y = -80;
      this.x = Math.random() * Math.max(0, anchura - 80);
    }
  }

  rectangulo(){
    // Cuerpo del coche amarillo orientado hacia abajo, sin margen transparente.
    return { x: this.x + 26, y: this.y + 17, ancho: 30, alto: 48 };
  }
}
