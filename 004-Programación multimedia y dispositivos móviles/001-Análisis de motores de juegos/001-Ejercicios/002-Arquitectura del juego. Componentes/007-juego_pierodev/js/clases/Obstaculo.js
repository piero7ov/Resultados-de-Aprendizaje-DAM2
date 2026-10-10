// Representa obstáculos de la carretera, como un árbol caído.
class Obstaculo extends Entidad {
  constructor(x, y, angulo, velocidad) {
    super(x, y, angulo, velocidad);
  }

  pintar(){
    contexto.imageSmoothingEnabled = false;
    contexto.drawImage(imagen_obstaculo, this.x, this.y, 120, 60);
  }
}
