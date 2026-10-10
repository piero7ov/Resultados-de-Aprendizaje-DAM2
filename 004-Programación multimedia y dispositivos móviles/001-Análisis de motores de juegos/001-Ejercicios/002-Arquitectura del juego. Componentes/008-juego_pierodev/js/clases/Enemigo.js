// Representa los otros coches que el jugador deberá esquivar.
class Enemigo extends Entidad {
  constructor(x, y, angulo, velocidad) {
    super(x, y, angulo, velocidad);
  }

  pintar(){
    contexto.font = '40px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
    contexto.textBaseline = "top";
    contexto.fillText("🚙", this.x, this.y);
  }
}
