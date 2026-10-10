// Marcas viales que forman las líneas discontinuas del fondo.
class MarcaVial extends Entidad {
  constructor(x, y, velocidad) {
    super(x, y, 0, velocidad);
  }

  mover(){
    this.y += this.v;
    // Reutilizamos la marca manteniendo la separación entre las líneas.
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
