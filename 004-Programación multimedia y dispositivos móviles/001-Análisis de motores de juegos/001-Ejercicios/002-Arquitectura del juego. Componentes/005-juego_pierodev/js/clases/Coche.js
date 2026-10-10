class Coche extends Entidad {
  constructor(x, y, angulo, velocidad) {
    super(x, y, angulo, velocidad);
    this.direccion = 0;
  }

  pintar(){
    // La imagen contiene arriba, derecha, abajo e izquierda en una cuadrícula de 2 × 2.
    const ancho = imagen_coche.naturalWidth / 2;
    const alto = imagen_coche.naturalHeight / 2;
    const columna = this.direccion % 2;
    const fila = Math.floor(this.direccion / 2);

    contexto.imageSmoothingEnabled = false;
    contexto.drawImage(
      imagen_coche,
      columna * ancho, fila * alto, ancho, alto,
      this.x, this.y, 48, 48
    );
  }

  mover(x, y){
    if (y < 0) {
      this.direccion = 0;
    } else if (x > 0) {
      this.direccion = 1;
    } else if (y > 0) {
      this.direccion = 2;
    } else if (x < 0) {
      this.direccion = 3;
    }

    this.x += x;
    this.y += y;
  }
}
