// ============================================================
// PREFERENCIAS TÉCNICAS DEL TEMA
// ============================================================

window.erin = window.erin || {}
window.erin.iu = window.erin.iu || {}

class PreferenciasTema {
  constructor() {
    this.claveAlmacenamiento = "erin.iu.tema"
    this.valoresIniciales = {
      tono: 15,
      saturacion: 65,
      brillo: 49,
      texto: 14
    }
    this.limites = {
      tono: [0, 360],
      saturacion: [0, 100],
      brillo: [35, 60],
      texto: [12, 18]
    }
  }

  // Evita aplicar valores que estén fuera de los límites del editor.
  normalizar(valores) {
    let resultado = {}

    Object.keys(this.valoresIniciales).forEach((nombre) => {
      let valor = Number(valores[nombre])
      let minimo = this.limites[nombre][0]
      let maximo = this.limites[nombre][1]

      if(!Number.isFinite(valor)) {
        valor = this.valoresIniciales[nombre]
      }

      resultado[nombre] = Math.max(minimo, Math.min(maximo, valor))
    })

    return resultado
  }

  cargar() {
    try {
      let guardado = localStorage.getItem(this.claveAlmacenamiento)
      return this.normalizar(guardado ? JSON.parse(guardado) : this.valoresIniciales)
    } catch(error) {
      console.warn("No se pudieron leer las preferencias del tema", error)
      return this.normalizar(this.valoresIniciales)
    }
  }

  aplicar(valores) {
    let tema = this.normalizar(valores)
    let raiz = document.documentElement

    raiz.style.setProperty("--tono", tema.tono)
    raiz.style.setProperty("--saturacion", tema.saturacion + "%")
    raiz.style.setProperty("--brillo", tema.brillo + "%")
    raiz.style.setProperty("--texto-base", tema.texto + "px")

    return tema
  }

  guardar(valores) {
    let tema = this.aplicar(valores)

    try {
      localStorage.setItem(this.claveAlmacenamiento, JSON.stringify(tema))
    } catch(error) {
      console.warn("No se pudieron guardar las preferencias del tema", error)
    }

    return tema
  }

  restablecer() {
    try {
      localStorage.removeItem(this.claveAlmacenamiento)
    } catch(error) {
      console.warn("No se pudieron restablecer las preferencias del tema", error)
    }

    return this.aplicar(this.valoresIniciales)
  }

  generarCSS(valores) {
    let tema = this.normalizar(valores)

    return `:root {
  --tono: ${tema.tono};
  --saturacion: ${tema.saturacion}%;
  --brillo: ${tema.brillo}%;
  --texto-base: ${tema.texto}px;
}`
  }
}

window.erin.iu.PreferenciasTema = PreferenciasTema
window.erin.iu.tema = new PreferenciasTema()

// Se aplica antes de dibujar la interfaz para evitar cambios visuales tardíos.
window.erin.iu.tema.aplicar(window.erin.iu.tema.cargar())
