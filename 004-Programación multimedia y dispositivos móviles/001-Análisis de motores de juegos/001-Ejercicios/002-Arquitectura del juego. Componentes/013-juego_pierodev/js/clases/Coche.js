class Coche extends Entidad {
  constructor(x, y, angulo, velocidad, energia) {
    super(x, y, angulo, velocidad);
    this.direccion = angulo;
    this.escudo = null;
    this.energia = energia;
    this.protegidohasta = 0;
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
      this.x, this.y, 80, 80
    );
  }

  mover(x, y){
    const direccionAnterior = this.direccion;
    if (y < 0) {
      this.direccion = 0;
    } else if (x > 0) {
      this.direccion = 1;
    } else if (y > 0) {
      this.direccion = 2;
    } else if (x < 0) {
      this.direccion = 3;
    }

    // Girar cambia el rectángulo: rechazamos el giro si invadiría otro objeto.
    const contacto = buscarContacto(this);
    if (contacto !== null) {
      this.direccion = direccionAnterior;
      this.recibirChoque(contacto);
    }
    moverJugador(this, x, y);
  }

  rectangulo(){
    // Excluimos los márgenes transparentes del cuadro de 80 × 80.
    if (this.direccion === 1 || this.direccion === 3) {
      return { x: this.x + 15, y: this.y + 27, ancho: 50, alto: 30 };
    }
    return { x: this.x + 26, y: this.y + 17, ancho: 30, alto: 48 };
  }

  recibirChoque(objeto){
    // El escudo frena al objeto un segundo y evita ese empuje.
    // Las colisiones siguen siendo sólidas, también mientras el objeto está parado.
    if (this.escudo !== null && this.escudo.activo()) {
      this.escudo = null;
      objeto.detenidohasta = performance.now() + duracionfrenado;
      return true;
    }
    this.danio();
    return false;
  }

  danio(){
    const ahora = performance.now();
    if (ahora >= this.protegidohasta) {
      this.energia = Math.max(0, this.energia - daniocolision);
      this.protegidohasta = ahora + duracionproteccion;
    }
  }

  activarEscudo(){
    // Solo puede existir un escudo: pulsar de nuevo no prolonga el que está activo.
    if (this.escudo === null || !this.escudo.activo()) {
      this.escudo = new Escudo(this.x, this.y, duracionescudo);
    }
  }
}
