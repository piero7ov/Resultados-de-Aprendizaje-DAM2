class ChatbotIU {
  constructor() {
    this.panel = document.querySelector("#asistente-flotante")
    this.cabecera = document.querySelector("#cabecera-asistente")
    this.mover = document.querySelector("#mover-asistente")
    this.minimizar = document.querySelector("#minimizar-asistente")
    this.formulario = document.querySelector("#formulario-asistente")
    this.entrada = document.querySelector("#mensaje-asistente")
    this.microfono = document.querySelector("#microfono-asistente")
    this.enviarBoton = document.querySelector("#enviar-asistente")
    this.leerRespuestas = document.querySelector("#leer-respuestas")
    this.estado = document.querySelector("#estado-asistente")
    this.escenario = document.querySelector(".escenario")
    this.historial = []
    this.contenidoAnterior = null
    this.enviando = false
    this.escuchando = false
    this.reconocimiento = null
    this.vozDisponible = false
    this.posicionAbierta = null
    this.minimizadoMovido = false
    this.ignorarClicMinimizado = false
    this.lecturaActual = null
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
    this.activarArrastreMinimizado()
    this.minimizar.addEventListener("click", (evento) => {
      if(this.ignorarClicMinimizado) {
        evento.preventDefault()
        return
      }
      this.alternarMinimizacion()
    })
    if(!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      this.leerRespuestas.disabled = true
      this.leerRespuestas.parentElement.title = "Lectura de voz no disponible en este navegador"
    }
    this.leerRespuestas.addEventListener("change", () => {
      if(!this.leerRespuestas.checked && this.lecturaActual) {
        this.detenerLectura()
        this.estado.textContent = "Lectura detenida."
      }
    })
    this.activarVoz()
    this.ajustarEntrada()
  }

  async enviar() {
    let texto = this.entrada.value.trim()
    if(!texto || this.enviando) {
      return
    }

    this.detenerLectura()
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
      if(this.leerRespuestas.checked) {
        this.iniciarLectura()
      }
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
    titulo.id = "titulo-respuesta"
    titulo.textContent = "Respuesta de ERIN"
    let volver = document.createElement("button")
    volver.className = "boton boton-secundario"
    volver.type = "button"
    volver.textContent = "Volver al catálogo"
    volver.addEventListener("click", () => this.restaurarEscenario())
    cabecera.append(titulo, volver)
    let contenido = document.createElement("div")
    contenido.className = "contenido-respuesta"
    this.formatearRespuesta(texto, contenido)
    resultado.append(cabecera, contenido)
    this.escenario.replaceChildren(resultado)
    this.escenario.setAttribute("aria-labelledby", titulo.id)
  }

  restaurarEscenario() {
    if(!this.contenidoAnterior) {
      return
    }

    this.detenerLectura()
    this.escenario.replaceChildren(...this.contenidoAnterior)
    this.escenario.setAttribute("aria-labelledby", "titulo-listado")
    this.contenidoAnterior = null
    this.estado.textContent = "Catálogo restaurado."
    this.entrada.focus()
  }

  ejecutarOrdenVoz(texto) {
    let orden = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/[.!?]+$/, "")

    if(orden == "volver al catalogo") {
      if(this.contenidoAnterior) {
        this.restaurarEscenario()
      } else {
        this.estado.textContent = "Ya estás en el catálogo."
      }
      return true
    }

    if(["salir", "cerrar sesion", "ir al inicio de sesion"].includes(orden)) {
      window.location.assign("login.html")
      return true
    }

    return false
  }

  textoParaVoz() {
    let contenido = this.escenario.querySelector(".contenido-respuesta")
    if(!contenido) return ""

    let partes = []
    Array.from(contenido.children).forEach((elemento) => {
      if(elemento.classList.contains("tabla-respuesta")) {
        let cabeceras = Array.from(elemento.querySelectorAll("thead th"), (celda) => celda.textContent.trim())
        partes.push("Tabla.")
        elemento.querySelectorAll("tbody tr").forEach((fila) => {
          let datos = Array.from(fila.cells, (celda, indice) => cabeceras[indice] + ": " + celda.textContent.trim())
          partes.push(datos.join(", "))
        })
      } else if(elemento.matches("ul, ol")) {
        Array.from(elemento.children).forEach((item) => partes.push(item.textContent.trim()))
      } else {
        partes.push(elemento.textContent.trim())
      }
    })
    return partes.filter(Boolean).join(". ").replace(/\s+/g, " ").trim()
  }

  iniciarLectura() {
    let texto = this.textoParaVoz()
    if(!texto) return

    let lectura = new SpeechSynthesisUtterance(texto)
    lectura.lang = "es-ES"
    let voz = window.speechSynthesis.getVoices().find((disponible) => disponible.lang.toLowerCase().startsWith("es"))
    if(voz) lectura.voice = voz
    this.lecturaActual = lectura
    lectura.onstart = () => {
      if(this.lecturaActual == lectura) this.estado.textContent = "Leyendo respuesta..."
    }
    lectura.onend = () => {
      if(this.lecturaActual != lectura) return
      this.lecturaActual = null
      this.estado.textContent = "Respuesta mostrada en el escenario."
    }
    lectura.onerror = (evento) => {
      if(this.lecturaActual != lectura) return
      this.lecturaActual = null
      this.estado.textContent = evento.error == "canceled" || evento.error == "interrupted"
        ? "Lectura detenida."
        : "No se ha podido leer la respuesta."
    }
    try {
      window.speechSynthesis.speak(lectura)
    } catch(error) {
      this.lecturaActual = null
      this.estado.textContent = "No se ha podido leer la respuesta."
    }
  }

  detenerLectura() {
    if(!this.lecturaActual) return
    this.lecturaActual = null
    window.speechSynthesis.cancel()
  }

  formatearRespuesta(texto, contenedor) {
    let lineas = texto.replace(/\r\n?/g, "\n").split("\n")
    let parrafo = []
    let lista = null
    let volcarParrafo = () => {
      if(!parrafo.length) return
      let elemento = document.createElement("p")
      this.agregarTextoConFormato(elemento, parrafo.join(" "))
      contenedor.appendChild(elemento)
      parrafo = []
    }

    for(let indice = 0; indice < lineas.length; indice++) {
      let linea = lineas[indice].trim()
      if(!linea) {
        volcarParrafo()
        lista = null
        continue
      }
      if(/^\`{3}/.test(linea)) {
        volcarParrafo()
        lista = null
        let lenguaje = linea.slice(3).trim().toLowerCase()
        let codigo = []
        while(++indice < lineas.length && !/^\`{3}/.test(lineas[indice].trim())) {
          codigo.push(lineas[indice])
        }
        let contieneTabla = codigo.some((fila, posicion) => {
          let cabeceras = this.celdasTabla(fila)
          let separadores = this.celdasTabla(codigo[posicion + 1] || "")
          return cabeceras.length > 1 && separadores.length == cabeceras.length && separadores.every((celda) => /^:?-{3,}:?$/.test(celda))
        })
        if(lenguaje == "markdown" || lenguaje == "md" || (!lenguaje && contieneTabla)) {
          this.formatearRespuesta(codigo.join("\n"), contenedor)
          continue
        }
        let bloque = document.createElement("pre")
        let contenido = document.createElement("code")
        contenido.textContent = codigo.join("\n")
        bloque.appendChild(contenido)
        contenedor.appendChild(bloque)
        continue
      }
      let cabeceras = this.celdasTabla(linea)
      let separadores = this.celdasTabla(lineas[indice + 1]?.trim() || "")
      if(cabeceras.length > 1 && separadores.length == cabeceras.length && separadores.every((celda) => /^:?-{3,}:?$/.test(celda))) {
        volcarParrafo()
        lista = null
        let envoltura = document.createElement("div")
        envoltura.className = "tabla tabla-respuesta"
        let tabla = document.createElement("table")
        let cabeceraTabla = document.createElement("thead")
        let cuerpo = document.createElement("tbody")
        let filaCabecera = document.createElement("tr")
        cabeceras.forEach((celda) => {
          let tituloCelda = document.createElement("th")
          this.agregarTextoConFormato(tituloCelda, celda)
          filaCabecera.appendChild(tituloCelda)
        })
        cabeceraTabla.appendChild(filaCabecera)
        indice++
        while(indice + 1 < lineas.length) {
          let celdas = this.celdasTabla(lineas[indice + 1].trim())
          if(celdas.length != cabeceras.length) break
          let fila = document.createElement("tr")
          celdas.forEach((celda) => {
            let dato = document.createElement("td")
            this.agregarTextoConFormato(dato, celda)
            fila.appendChild(dato)
          })
          cuerpo.appendChild(fila)
          indice++
        }
        tabla.append(cabeceraTabla, cuerpo)
        envoltura.appendChild(tabla)
        contenedor.appendChild(envoltura)
        continue
      }
      let encabezado = linea.match(/^(#{1,3})\s+(.+)$/)
      if(encabezado) {
        volcarParrafo()
        lista = null
        let titulo = document.createElement(encabezado[1].length == 1 ? "h2" : "h3")
        this.agregarTextoConFormato(titulo, encabezado[2])
        contenedor.appendChild(titulo)
        continue
      }
      let elementoLista = linea.match(/^[-*+]\s+(.+)$/)
      if(elementoLista) {
        volcarParrafo()
        if(!lista) {
          lista = document.createElement("ul")
          contenedor.appendChild(lista)
        }
        let elemento = document.createElement("li")
        this.agregarTextoConFormato(elemento, elementoLista[1])
        lista.appendChild(elemento)
        continue
      }
      lista = null
      parrafo.push(linea)
    }
    volcarParrafo()
  }

  celdasTabla(linea) {
    if(!linea.includes("|")) return []
    return linea.replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((celda) => celda.replace(/\\\|/g, "|").trim())
  }

  agregarTextoConFormato(elemento, texto) {
    texto.split(/(\*\*.+?\*\*|__.+?__|`.+?`|\*[^*]+\*)/g).filter(Boolean).forEach((parte) => {
      let etiqueta = null
      let contenido = parte
      if((parte.startsWith("**") && parte.endsWith("**")) || (parte.startsWith("__") && parte.endsWith("__"))) {
        etiqueta = "strong"
        contenido = parte.slice(2, -2)
      } else if(parte.startsWith("`") && parte.endsWith("`")) {
        etiqueta = "code"
        contenido = parte.slice(1, -1)
      } else if(parte.startsWith("*") && parte.endsWith("*")) {
        etiqueta = "em"
        contenido = parte.slice(1, -1)
      }
      let nodo = etiqueta ? document.createElement(etiqueta) : document.createTextNode(contenido)
      if(etiqueta) nodo.textContent = contenido
      elemento.appendChild(nodo)
    })
  }

  alternarMinimizacion() {
    if(this.panel.classList.contains("minimizado")) {
      let posicionMinimizada = this.panel.getBoundingClientRect()
      this.panel.classList.remove("minimizado")
      let posicion = this.minimizadoMovido
        ? { izquierda: posicionMinimizada.left, arriba: posicionMinimizada.top }
        : this.posicionAbierta || { izquierda: 8, arriba: 8 }
      let ajustada = this.posicionLimitada(posicion.izquierda, posicion.arriba)
      this.panel.style.left = ajustada.izquierda + "px"
      this.panel.style.top = ajustada.arriba + "px"
      this.minimizar.setAttribute("aria-label", "Minimizar asistente")
      this.minimizar.title = "Minimizar asistente"
      this.minimizar.setAttribute("aria-expanded", "true")
      this.minimizadoMovido = false
      this.entrada.focus()
      return
    }

    this.fijarPosicionActual()
    let posicion = this.panel.getBoundingClientRect()
    this.posicionAbierta = { izquierda: posicion.left, arriba: posicion.top }
    this.panel.classList.add("minimizado")
    this.minimizadoMovido = false
    let ajustada = this.posicionLimitada(posicion.right - 52, posicion.top)
    this.panel.style.left = ajustada.izquierda + "px"
    this.panel.style.top = ajustada.arriba + "px"
    this.minimizar.setAttribute("aria-label", "Restaurar asistente")
    this.minimizar.title = "Arrastra o usa las flechas para mover; pulsa para restaurar"
    this.minimizar.setAttribute("aria-expanded", "false")
    this.minimizar.focus()
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
      if(this.panel.classList.contains("minimizado") || evento.button != 0 || (evento.target.closest("button") && evento.target != this.mover)) {
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

  activarArrastreMinimizado() {
    this.minimizar.addEventListener("pointerdown", (evento) => {
      if(!this.panel.classList.contains("minimizado") || evento.button != 0) return

      this.fijarPosicionActual()
      let posicion = this.panel.getBoundingClientRect()
      let inicioX = evento.clientX
      let inicioY = evento.clientY
      let arrastrado = false
      this.minimizar.setPointerCapture(evento.pointerId)

      let mover = (movimiento) => {
        let diferenciaX = movimiento.clientX - inicioX
        let diferenciaY = movimiento.clientY - inicioY
        if(!arrastrado && Math.hypot(diferenciaX, diferenciaY) < 5) return
        arrastrado = true
        this.panel.classList.add("arrastrando")
        let nueva = this.posicionLimitada(posicion.left + diferenciaX, posicion.top + diferenciaY)
        this.panel.style.left = nueva.izquierda + "px"
        this.panel.style.top = nueva.arriba + "px"
      }
      let terminar = () => {
        this.panel.classList.remove("arrastrando")
        if(arrastrado) {
          this.minimizadoMovido = true
          this.ignorarClicMinimizado = true
          setTimeout(() => this.ignorarClicMinimizado = false, 0)
        }
        this.minimizar.removeEventListener("pointermove", mover)
        this.minimizar.removeEventListener("pointerup", terminar)
        this.minimizar.removeEventListener("pointercancel", terminar)
      }

      this.minimizar.addEventListener("pointermove", mover)
      this.minimizar.addEventListener("pointerup", terminar)
      this.minimizar.addEventListener("pointercancel", terminar)
    })

    this.minimizar.addEventListener("keydown", (evento) => {
      if(!this.panel.classList.contains("minimizado")) return
      let direcciones = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }
      let movimiento = direcciones[evento.key]
      if(!movimiento) return

      evento.preventDefault()
      this.fijarPosicionActual()
      let posicion = this.panel.getBoundingClientRect()
      let nueva = this.posicionLimitada(posicion.left + movimiento[0], posicion.top + movimiento[1])
      this.panel.style.left = nueva.izquierda + "px"
      this.panel.style.top = nueva.arriba + "px"
      this.minimizadoMovido = true
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
        if(this.ejecutarOrdenVoz(texto)) {
          return
        }
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
