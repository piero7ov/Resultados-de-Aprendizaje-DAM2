// Protección temporal activada con espacio. Sigue al coche durante tres segundos,
// evita la pérdida de energía y detiene brevemente cualquier objeto que lo golpee.
// El círculo es una representación visual: las colisiones siguen usando el cuerpo
// del coche, por lo que el escudo no permite atravesar árboles ni otros vehículos.
class Escudo extends Entidad {
  constructor(x, y, duracion) {
    super(x, y, 0, 0);
    this.fin = performance.now() + duracion;
  }

  actualizar(coche){
    // Copia la posición del coche antes de pintar cada fotograma.
    this.x = coche.x;
    this.y = coche.y;
  }

  activo(){
    // El tiempo real evita que la duración dependa del número de fotogramas.
    return performance.now() < this.fin;
  }

  pintar(){
    // El relleno translúcido permite ver el coche y la carretera bajo la protección.
    contexto.save();
    contexto.beginPath();
    contexto.arc(this.x + 40, this.y + 40, 34, 0, Math.PI * 2);
    contexto.fillStyle = "rgba(56, 189, 248, 0.2)";
    contexto.strokeStyle = "#7DD3FC";
    contexto.lineWidth = 3;
    contexto.fill();
    contexto.stroke();
    contexto.restore();
  }
}
