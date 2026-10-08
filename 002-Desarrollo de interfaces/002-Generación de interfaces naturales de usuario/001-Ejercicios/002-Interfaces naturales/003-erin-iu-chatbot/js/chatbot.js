class ChatbotIU {
  constructor() {
    this.panel = document.querySelector("#asistente-flotante")
    this.cabecera = document.querySelector("#cabecera-asistente")
    this.mover = document.querySelector("#mover-asistente")
    this.formulario = document.querySelector("#formulario-asistente")
    this.entrada = document.querySelector("#mensaje-asistente")
    this.microfono = document.querySelector("#microfono-asistente")
    this.enviarBoton = document.querySelector("#enviar-asistente")
    this.estado = document.querySelector("#estado-asistente")
    this.escenario = document.querySelector(".escenario")
    this.historial = []
    this.contenidoAnterior = null
    this.enviando = false
    this.escuchando = false
    this.reconocimiento = null
    this.vozDisponible = false
  }

  iniciar() {
    if(!this.panel || !this.escenario) {
      return
    }

    this.formulario.addEventListener("submit", (evento) => {
      evento.preventDefault()
      this.enviar()
    })
    this.entrada.addEventListener("keydown", (evento) => {
      if(evento.key == "Enter" && !evento.shiftKey && !evento.isComposing) {
        evento.preventDefault()
        this.enviar()
      }
    })
    this.entrada.addEventListener("input", () => this.ajustarEntrada())

    this.activarArrastre()
    this.activarVoz()
    this.ajustarEntrada()
  }

  async enviar() {
    let texto = this.entrada.value.trim()
    if(!texto || this.enviando) {
      return
    }

    this.enviando = true
    this.enviarBoton.disabled = true
    this.microfono.disabled = true
    this.estado.textContent = "Ollama está respondiendo..."

    try {
      let respuesta = await fetch("ollama.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje: texto, historial: this.historial })
      })
      if(!respuesta.ok) {
        throw new Error("HTTP " + respuesta.status)
      }

      let datos = await respuesta.json()
      if(typeof datos.respuesta != "string" || !datos.respuesta.trim()) {
        throw new Error("Respuesta vacía")
      }

      this.historial.push({ role: "user", content: texto })
      this.historial.push({ role: "assistant", content: datos.respuesta })
      this.historial = this.historial.slice(-10)
      this.mostrarRespuesta(datos.respuesta)
      this.entrada.value = ""
      this.ajustarEntrada()
      this.estado.textContent = "Respuesta mostrada en el escenario."
    } catch(error) {
      console.error(error)
      this.estado.textContent = "No se ha podido obtener una respuesta de Ollama."
    } finally {
      this.enviando = false
      this.enviarBoton.disabled = false
      this.microfono.disabled = !this.vozDisponible
      this.entrada.focus()
    }
  }

  mostrarRespuesta(texto) {
    if(!this.contenidoAnterior) {
      // Conserva los nodos originales y sus eventos para poder volver al catálogo.
      this.contenidoAnterior = Array.from(this.escenario.childNodes)
    }

    let resultado = document.createElement("article")
    resultado.className = "respuesta-ollama"
    let cabecera = document.createElement("div")
    cabecera.className = "cabecera-respuesta"
    let titulo = document.createElement("h1")
    titulo.textContent = "Respuesta de Ollama"
    let volver = document.createElement("button")
    volver.className = "boton boton-secundario"
    volver.type = "button"
    volver.textContent = "Volver al catálogo"
    volver.addEventListener("click", () => this.restaurarEscenario())
    cabecera.append(titulo, volver)
    let contenido = document.createElement("div")
    contenido.className = "contenido-respuesta"
    contenido.textContent = texto
    resultado.append(cabecera, contenido)
    this.escenario.replaceChildren(resultado)
  }

  restaurarEscenario() {
    if(!this.contenidoAnterior) {
      return
    }

    this.escenario.replaceChildren(...this.contenidoAnterior)
    this.contenidoAnterior = null
    this.estado.textContent = "Catálogo restaurado."
    this.entrada.focus()
  }

  ajustarEntrada() {
    this.entrada.style.height = "auto"
    this.entrada.style.height = Math.min(this.entrada.scrollHeight, 140) + "px"
  }

  posicionLimitada(izquierda, arriba) {
    let ancho = this.panel.getBoundingClientRect().width
    let alto = this.panel.getBoundingClientRect().height
    return {
      izquierda: Math.max(8, Math.min(izquierda, window.innerWidth - ancho - 8)),
      arriba: Math.max(8, Math.min(arriba, window.innerHeight - alto - 8))
    }
  }

  fijarPosicionActual() {
    let posicion = this.panel.getBoundingClientRect()
    this.panel.style.transform = "none"
    this.panel.style.bottom = "auto"
    this.panel.style.left = posicion.left + "px"
    this.panel.style.top = posicion.top + "px"
  }

  activarArrastre() {
    let comenzar = (evento) => {
      if(evento.button != 0 || (evento.target.closest("button") && evento.target != this.mover)) {
        return
      }

      this.fijarPosicionActual()
      let posicion = this.panel.getBoundingClientRect()
      let diferenciaX = evento.clientX - posicion.left
      let diferenciaY = evento.clientY - posicion.top
      this.cabecera.setPointerCapture(evento.pointerId)
      this.panel.classList.add("arrastrando")

      let mover = (movimiento) => {
        let nueva = this.posicionLimitada(movimiento.clientX - diferenciaX, movimiento.clientY - diferenciaY)
        this.panel.style.left = nueva.izquierda + "px"
        this.panel.style.top = nueva.arriba + "px"
      }
      let terminar = () => {
        this.panel.classList.remove("arrastrando")
        this.cabecera.removeEventListener("pointermove", mover)
        this.cabecera.removeEventListener("pointerup", terminar)
        this.cabecera.removeEventListener("pointercancel", terminar)
      }

      this.cabecera.addEventListener("pointermove", mover)
      this.cabecera.addEventListener("pointerup", terminar)
      this.cabecera.addEventListener("pointercancel", terminar)
    }

    this.cabecera.addEventListener("pointerdown", comenzar)
    this.mover.addEventListener("keydown", (evento) => {
      let direcciones = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }
      let movimiento = direcciones[evento.key]
      if(!movimiento) {
        return
      }

      evento.preventDefault()
      this.fijarPosicionActual()
      let posicion = this.panel.getBoundingClientRect()
      let nueva = this.posicionLimitada(posicion.left + movimiento[0], posicion.top + movimiento[1])
      this.panel.style.left = nueva.izquierda + "px"
      this.panel.style.top = nueva.arriba + "px"
    })

    window.addEventListener("resize", () => {
      if(!this.panel.style.top) {
        return
      }
      let posicion = this.panel.getBoundingClientRect()
      let nueva = this.posicionLimitada(posicion.left, posicion.top)
      this.panel.style.left = nueva.izquierda + "px"
      this.panel.style.top = nueva.arriba + "px"
    })
  }

  activarVoz() {
    let Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition
    this.vozDisponible = Boolean(Reconocimiento)
    if(!Reconocimiento) {
      this.microfono.disabled = true
      this.microfono.title = "Reconocimiento de voz no disponible en este navegador"
      return
    }

    this.microfono.addEventListener("click", () => {
      if(this.escuchando) {
        this.reconocimiento.stop()
        return
      }

      this.reconocimiento = new Reconocimiento()
      this.reconocimiento.lang = "es-ES"
      this.reconocimiento.interimResults = false
      this.reconocimiento.continuous = false
      this.reconocimiento.onstart = () => {
        this.escuchando = true
        this.microfono.classList.add("escuchando")
        this.estado.textContent = "Escuchando..."
      }
      this.reconocimiento.onresult = (evento) => {
        let texto = evento.results[0][0].transcript
        this.entrada.value = this.entrada.value.trim() ? this.entrada.value.trim() + " " + texto : texto
        this.ajustarEntrada()
        this.enviar()
      }
      this.reconocimiento.onerror = (evento) => {
        this.estado.textContent = "No se ha podido reconocer la voz: " + evento.error
      }
      this.reconocimiento.onend = () => {
        this.escuchando = false
        this.microfono.classList.remove("escuchando")
        if(this.estado.textContent == "Escuchando...") {
          this.estado.textContent = ""
        }
      }

      try {
        this.reconocimiento.start()
      } catch(error) {
        this.estado.textContent = "No se ha podido iniciar el micrófono."
      }
    })
  }
}

window.erin.iu.ChatbotIU = ChatbotIU

document.addEventListener("componentesListos", () => {
  window.erin.iu.chatbot = new ChatbotIU()
  window.erin.iu.chatbot.iniciar()
})
