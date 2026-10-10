// Representa obstáculos de la carretera, como un árbol caído.
class Obstaculo extends Entidad {
  constructor(x, y, angulo, velocidad) {
    super(x, y, angulo, velocidad);
  }

  pintar(){
    contexto.imageSmoothingEnabled = false;
    contexto.drawImage(imagen_obstaculo, this.x, this.y, 120, 60);
  }

  // Los obstáculos se desplazan verticalmente por la carretera.
  // El árbol baja en pantalla para simular el avance del coche por la carretera.
  mover(){
    // El avance también comprueba colisiones: puede empujar al jugador o detenerse.
    avanzarEntidad(this);

    // Cuando el árbol sale completamente por abajo, reutilizamos el mismo objeto.
    if (this.y > altura) {
      // Su altura es de 60 píxeles: lo colocamos justo encima de la pantalla.
      this.y = -60;
      // Elegimos otra posición horizontal, descontando los 120 píxeles de ancho.
      // Math.max evita un rango negativo si la ventana es más estrecha que el árbol.
      this.x = Math.random() * Math.max(0, anchura - 120);
    }
  }

  rectangulo(){
    // El tronco es sólido; las hojas y los márgenes transparentes quedan fuera.
    return { x: this.x + 10, y: this.y + 23, ancho: 96, alto: 18 };
  }
}
