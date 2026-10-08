// ============================================================
// EDITOR DE TEMA PARA DESARROLLADORES
// ============================================================

class EditorTemaIU {
  constructor(preferencias) {
    this.preferencias = preferencias
    this.formulario = document.querySelector("#editor-tema")
    this.estado = document.querySelector("#estado-tema")
    this.codigo = document.querySelector("#css-generado")
    this.campos = Array.from(this.formulario.querySelectorAll("[data-variable-tema]"))
  }

  iniciar() {
    this.mostrarValores(this.preferencias.cargar())

    // input actualiza la previsualización sin guardar todavía los cambios.
    this.formulario.addEventListener("input", () => {
      let valores = this.recogerValores()
      this.preferencias.aplicar(valores)
      this.actualizarSalidas(valores)
      this.informar("Previsualización sin guardar")
    })

    // submit confirma el tema y lo conserva en este navegador de desarrollo.
    this.formulario.addEventListener("submit", (evento) => {
      evento.preventDefault()
      let valores = this.preferencias.guardar(this.recogerValores())
      this.mostrarValores(valores)
      this.informar("Configuración guardada")
    })

    document.querySelector("#restablecer-tema").addEventListener("click", () => {
      let valores = this.preferencias.restablecer()
      this.mostrarValores(valores)
      this.informar("Tema original restablecido")
    })
  }

  recogerValores() {
    let valores = {}

    this.campos.forEach((campo) => {
      valores[campo.name] = campo.value
    })

    return valores
  }

  mostrarValores(valores) {
    this.campos.forEach((campo) => {
      campo.value = valores[campo.name]
    })

    this.actualizarSalidas(valores)
  }

  actualizarSalidas(valores) {
    let tema = this.preferencias.normalizar(valores)

    Object.entries(tema).forEach(([nombre, valor]) => {
      let salida = document.querySelector(`[data-salida-tema="${nombre}"]`)
      let unidad = nombre == "saturacion" || nombre == "brillo" ? "%" : nombre == "texto" ? "px" : ""
      salida.textContent = valor + unidad
    })

    this.codigo.value = this.preferencias.generarCSS(tema)
  }

  informar(mensaje) {
    this.estado.textContent = mensaje
  }
}

window.erin.iu.EditorTemaIU = EditorTemaIU

document.addEventListener("DOMContentLoaded", () => {
  window.erin.iu.editorTema = new EditorTemaIU(window.erin.iu.tema)
  window.erin.iu.editorTema.iniciar()
})
