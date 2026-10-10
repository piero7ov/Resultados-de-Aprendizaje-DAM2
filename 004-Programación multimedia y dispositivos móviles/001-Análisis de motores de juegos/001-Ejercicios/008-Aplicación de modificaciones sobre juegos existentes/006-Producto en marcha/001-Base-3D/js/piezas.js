export class Piezas {
  constructor(THREE) {
    this.THREE = THREE;
    this.materiales = new Map();
  }

  material(color, metal = false) {
    const clave = color + (metal ? "-metal" : "");
    if (!this.materiales.has(clave)) {
      this.materiales.set(clave, new this.THREE.MeshStandardMaterial({
        color,
        roughness: metal ? .42 : .82,
        metalness: metal ? .45 : 0
      }));
    }
    return this.materiales.get(clave);
  }

  caja(grupo, x, y, z, ancho, alto, fondo, color, metal = false) {
    const malla = new this.THREE.Mesh(
      new this.THREE.BoxGeometry(ancho, alto, fondo), this.material(color, metal)
    );
    malla.position.set(x, y, z);
    grupo.add(malla);
    return malla;
  }

  cilindro(grupo, x, y, z, radio, alto, color) {
    const malla = new this.THREE.Mesh(
      new this.THREE.CylinderGeometry(radio, radio, alto, 12), this.material(color)
    );
    malla.position.set(x, y, z);
    grupo.add(malla);
    return malla;
  }

  esfera(grupo, x, y, z, radio, color) {
    const malla = new this.THREE.Mesh(
      new this.THREE.SphereGeometry(radio, 16, 12), this.material(color)
    );
    malla.position.set(x, y, z);
    grupo.add(malla);
    return malla;
  }

  paquete(grupo, x, y, z, escala = 1) {
    this.caja(grupo, x, y, z, .75 * escala, .6 * escala, .62 * escala, "#c99b6a");
    this.caja(grupo, x, y + .304 * escala, z, .12 * escala, .012, .64 * escala, "#f0d4aa");
    this.caja(grupo, x, y, z + .315 * escala, .29 * escala, .17 * escala, .01, "#f0f3eb");
  }

  pale(grupo, x, z) {
    this.caja(grupo, x, .12, z, 1.85, .2, 1.25, "#a9825a");
    for (const desplazamiento of [-.67, 0, .67]) {
      this.caja(grupo, x + desplazamiento, .025, z, .27, .1, 1.25, "#806344");
    }
  }

  mesa(grupo, x, z, ancho = 2.2, fondo = 1.35) {
    for (const dx of [-ancho / 2 + .1, ancho / 2 - .1]) {
      for (const dz of [-fondo / 2 + .1, fondo / 2 - .1]) {
        this.caja(grupo, x + dx, .45, z + dz, .1, .9, .1, "#839da2", true);
      }
    }
    this.caja(grupo, x, .95, z, ancho, .13, fondo, "#e1e9e7");
  }

  operario(grupo, x, z, chaleco) {
    const persona = new this.THREE.Group();
    persona.position.set(x, 0, z);
    grupo.add(persona);
    for (const lado of [-1, 1]) {
      this.caja(persona, lado * .16, .46, 0, .22, .9, .26, "#364a55");
      this.caja(persona, lado * .16, .06, .09, .32, .12, .46, "#26363e");
      this.caja(persona, lado * .45, 1.35, 0, .22, .82, .25, "#607786");
      this.esfera(persona, lado * .45, .92, 0, .11, "#d7aa85");
      this.caja(persona, lado * .17, 1.32, .205, .06, .8, .02, "#f1e9bd");
    }
    this.caja(persona, 0, 1.32, 0, .65, .85, .37, chaleco);
    this.caja(persona, 0, 1.1, .205, .6, .07, .02, "#f1e9bd");
    this.esfera(persona, 0, 1.97, 0, .24, "#d7aa85");
    const casco = this.esfera(persona, 0, 2.16, 0, .25, "#eec64b");
    casco.scale.set(1.12, .5, 1.06);
    this.caja(persona, 0, 2.08, .22, .58, .045, .13, "#e3b844");
    return persona;
  }

  pantalla(grupo, x, z, colorPantalla = "#bce0e3") {
    this.caja(grupo, x, 1.5, z, .68, .53, .12, "#415963");
    this.caja(grupo, x, 1.5, z + .067, .56, .4, .01, colorPantalla);
    this.caja(grupo, x, 1.16, z, .06, .18, .06, "#607781", true);
    this.caja(grupo, x, 1.07, z, .35, .04, .23, "#607781", true);
  }
}
