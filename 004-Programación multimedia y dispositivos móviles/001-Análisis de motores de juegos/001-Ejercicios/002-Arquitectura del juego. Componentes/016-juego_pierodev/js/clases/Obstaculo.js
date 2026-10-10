// Árbol caído que funciona como obstáculo sólido y se desplaza con el tráfico.
class Obstaculo extends Entidad {
  constructor(x, y, angulo, velocidad) {
    super(x, y, angulo, velocidad);
    this.detenidohasta = 0;
  }

  pintar(){
    contexto.imageSmoothingEnabled = false;
    contexto.drawImage(imagen_obstaculo, this.x, this.y, 120, 60);
  }

  // El descenso vertical mantiene la misma dirección que el resto del tráfico.
  mover(){
    // El avance también comprueba colisiones: puede empujar al jugador o detenerse.
    avanzarEntidad(this);

    // Cuando el árbol sale completamente por abajo, reutilizamos el mismo objeto.
    if (this.y > altura) {
      this.detenidohasta = 0;
      // Su altura es de 60 píxeles: lo colocamos justo encima de la pantalla.
      this.y = -60;
      // Se descuenta su anchura para que reaparezca completo dentro de la carretera.
      // Math.max evita un rango negativo en ventanas más estrechas que el árbol.
      this.x = iniciocarretera + Math.random() *
        Math.max(0, iniciometa - iniciocarretera - 120);
    }
  }

  rectangulo(){
    // El tronco es sólido; las hojas y los márgenes transparentes quedan fuera.
    return { x: this.x + 10, y: this.y + 23, ancho: 96, alto: 18 };
  }
}
