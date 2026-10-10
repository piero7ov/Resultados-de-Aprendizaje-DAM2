// Superclase con los datos comunes de cualquier objeto que ocupa el escenario.
// Las clases concretas heredan posición, ángulo y velocidad para no repetirlos.
class Entidad {
  constructor(x, y, angulo, velocidad) {
    this.x = x;
    this.y = y;
    this.a = angulo;
    this.v = velocidad;
  }
}
