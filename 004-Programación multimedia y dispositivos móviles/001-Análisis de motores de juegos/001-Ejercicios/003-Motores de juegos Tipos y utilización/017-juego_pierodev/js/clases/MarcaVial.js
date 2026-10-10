// Segmento de una línea discontinua. Su movimiento refuerza la sensación de tráfico.
class MarcaVial extends Entidad {
  constructor(x, y, velocidad) {
    super(x, y, 0, velocidad);
  }

  mover(){
    this.y += this.v;
    // Cuando sale por abajo vuelve arriba conservando la separación de la fila.
    if (this.y >= altura) {
      this.y -= numeromarcasporfila * separacionmarcas;
    }
  }

  pintar(){
    contexto.save();
    contexto.fillStyle = "#E8E4D8";
    contexto.fillRect(this.x, this.y, 6, 40);
    contexto.restore();
  }
}
