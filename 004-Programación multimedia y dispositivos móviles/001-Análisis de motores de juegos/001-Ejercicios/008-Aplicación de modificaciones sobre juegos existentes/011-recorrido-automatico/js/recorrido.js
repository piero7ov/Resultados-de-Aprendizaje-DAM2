export const TOTAL_PAQUETES = 6;

export function crearPasos(numero) {
  const pasos = [
    { id: "recepcion", estacion: "recepcion", texto: "Identificando el producto", duracion: 2, desde: [-9, 1.3, 0], hasta: [-9, 1.3, 0], trabajo: true },
    { id: "hacia-calidad", estacion: "calidad", texto: "Transporte hacia control de calidad", duracion: 3, desde: [-9, 1.3, 0], hasta: [-3, 1.3, 0], cinta: true },
    { id: "calidad", estacion: "calidad", texto: "Inspeccionando el producto", duracion: 2.5, desde: [-3, 1.3, 0], hasta: [-3, 1.3, 0], trabajo: true }
  ];
  if (numero % 3 === 0) {
    pasos.push(
      { id: "desvio", estacion: "calidad", texto: "No conforme · desviando hacia descarte", duracion: 2.5, desde: [-3, 1.3, 0], hasta: [-1.2, 1.3, 2.75], rechazado: true },
      { id: "descarte", estacion: "calidad", texto: "Producto depositado en descarte", duracion: 1.5, desde: [-1.2, 1.3, 2.75], hasta: [-1.2, .45, 2.75], rechazado: true }
    );
  } else {
    pasos.push(
      { id: "hacia-embalaje", estacion: "embalaje", texto: "Conforme · transporte hacia embalaje", duracion: 3, desde: [-3, 1.3, 0], hasta: [3, 1.3, 0], cinta: true },
      { id: "embalaje", estacion: "embalaje", texto: "Protegiendo, cerrando y etiquetando", duracion: 3, desde: [3, 1.3, 0], hasta: [3, 1.3, 0], trabajo: true },
      { id: "hacia-expedicion", estacion: "expedicion", texto: "Transporte hacia expedición", duracion: 3, desde: [3, 1.3, 0], hasta: [9, 1.3, 0], cinta: true },
      { id: "expedicion", estacion: "expedicion", texto: "Verificando la salida del paquete", duracion: 2, desde: [9, 1.3, 0], hasta: [9, 1.3, 0], trabajo: true },
      { id: "salida", estacion: "expedicion", texto: "Trasladando al palé de salida", duracion: 2, desde: [9, 1.3, 0], hasta: [10.65, .52, 2.35] }
    );
  }
  return pasos;
}

// El tiempo de simulación solo avanza desde actualizar: pausar no pierde etapas.
export class Recorrido {
  constructor() { this.reiniciar(); }

  reiniciar() {
    this.estado = "listo";
    this.numero = 1;
    this.indice = 0;
    this.tiempo = 0;
    this.entregados = 0;
    this.descartados = 0;
    this.pasos = crearPasos(this.numero);
  }

  iniciar() {
    if (this.estado !== "completado") this.estado = "en-marcha";
  }

  pausar() {
    if (this.estado === "en-marcha") this.estado = "pausado";
  }

  actualizar(segundos) {
    if (this.estado !== "en-marcha" || !Number.isFinite(segundos) || segundos <= 0) return;
    this.tiempo += segundos;
    while (this.estado === "en-marcha" && this.tiempo >= this.pasos[this.indice].duracion) {
      this.tiempo -= this.pasos[this.indice].duracion;
      this.indice++;
      if (this.indice < this.pasos.length) continue;
      if (this.numero % 3 === 0) this.descartados++;
      else this.entregados++;
      if (this.numero === TOTAL_PAQUETES) {
        this.estado = "completado";
        this.indice = this.pasos.length - 1;
        this.tiempo = this.pasos[this.indice].duracion;
      } else {
        this.numero++;
        this.indice = 0;
        this.pasos = crearPasos(this.numero);
      }
    }
  }

  obtenerEstado() {
    const paso = this.pasos[this.indice];
    const duracion = this.pasos.reduce((total, etapa) => total + etapa.duracion, 0);
    const transcurrido = this.pasos.slice(0, this.indice).reduce((total, etapa) => total + etapa.duracion, 0) + this.tiempo;
    return {
      estado: this.estado, numero: this.numero, paso,
      fraccion: Math.min(1, this.tiempo / paso.duracion),
      progreso: transcurrido / duracion,
      entregados: this.entregados, descartados: this.descartados
    };
  }
}
