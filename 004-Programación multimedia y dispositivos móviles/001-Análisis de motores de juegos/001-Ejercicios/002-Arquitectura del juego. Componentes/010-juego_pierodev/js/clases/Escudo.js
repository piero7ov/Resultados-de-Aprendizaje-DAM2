// El escudo es una protección temporal que sigue al coche y se activa con espacio.
// En la 010 el primer choque consume el escudo. La colisión sólida usa el cuerpo
// del coche: el círculo representa la protección, no amplía el tamaño físico.
class Escudo extends Entidad {
  constructor(x, y, duracion) {
    super(x, y, 0, 0);
    this.fin = performance.now() + duracion;
  }

  actualizar(coche){
    this.x = coche.x;
    this.y = coche.y;
  }

  activo(){
    // El tiempo real evita que la duración dependa del número de fotogramas.
    return performance.now() < this.fin;
  }

  pintar(){
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
