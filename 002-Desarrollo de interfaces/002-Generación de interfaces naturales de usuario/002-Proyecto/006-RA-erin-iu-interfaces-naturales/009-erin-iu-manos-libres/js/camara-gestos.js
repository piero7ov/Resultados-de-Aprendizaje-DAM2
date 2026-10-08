class CamaraGestosIU {
  constructor() {
    this.boton = document.querySelector("#abrir-camara")
    this.panel = document.querySelector("#panel-camara")
    this.cerrarBoton = document.querySelector("#cerrar-camara")
    this.video = document.querySelector("#video-camara")
    this.canvas = document.querySelector("#puntos-mano")
    this.vista = document.querySelector(".vista-camara")
    this.tarjeta = document.querySelector("#tarjeta-ar")
    this.estadoTarjeta = document.querySelector("#asistente-ar")
    this.peticionTarjeta = document.querySelector("#peticion-ar")
    this.mapa = document.querySelector("#mapa-pantalla")
    this.mapaMano = document.querySelector("#mapa-mano")
    this.mapaAsistente = document.querySelector("#mapa-asistente")
    this.guia = document.querySelector("#guia-manos-libres")
    this.opcionesGuia = Array.from(this.guia?.querySelectorAll("[data-gesto]") || [])
    this.estadoLecturaGuia = document.querySelector("#estado-lectura-guia")
    this.estado = document.querySelector("#estado-camara")
    this.contexto = this.canvas?.getContext("2d")
    this.detector = null
    this.promesaDetector = null
    this.flujo = null
    this.activa = false
    this.sesion = 0
    this.animacion = null
    this.ultimoFotograma = -1
    this.ultimoGesto = 0
    this.estadoHasta = 0
    this.fotogramasPinza = 0
    this.pinzaConsumida = false
    this.inicioApertura = null
    this.aperturaConsumida = false
    this.esperandoApertura = false
    this.posicionTarjeta = null
    this.manosLibresActivo = false
    this.lecturaAnterior = null
    this.reconocimientoPorGesto = null
    this.arrastreCamara = null
    this.gestoVoz = null
    this.inicioGestoVoz = null
    this.gestoConsumido = false
  }

  iniciar() {
    if(!this.boton || !this.panel || !this.contexto || !this.tarjeta || !this.mapa || !this.guia) return
    this.boton.addEventListener("click", () => this.abrir())
    this.cerrarBoton.addEventListener("click", () => this.cerrar())
    document.addEventListener("keydown", (evento) => {
      if(evento.key == "Escape" && !this.panel.hidden) this.cerrar()
    })
    window.addEventListener("pagehide", () => this.cerrar())
  }

  cargarDetector() {
    if(!this.promesaDetector) {
      this.promesaDetector = (async () => {
        let { HandLandmarker, FilesetResolver } = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest")
        let vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm")
        return HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        })
      })().catch((error) => {
        this.promesaDetector = null
        throw error
      })
    }
    return this.promesaDetector
  }

  async abrir() {
    if(this.activa || !this.panel.hidden) return
    let sesion = ++this.sesion
    this.activa = true
    this.panel.hidden = false
    this.boton.setAttribute("aria-expanded", "true")
    this.estado.textContent = "Cargando detector de mano..."
    this.cerrarBoton.focus()

    try {
      this.detector = await this.cargarDetector()
      if(sesion != this.sesion) return
      this.estado.textContent = "Solicitando cámara..."
      let flujo = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      if(sesion != this.sesion) {
        flujo.getTracks().forEach((pista) => pista.stop())
        return
      }
      this.flujo = flujo
      this.video.srcObject = flujo
      await this.video.play()
      if(sesion != this.sesion) return
      this.establecerManosLibres(true)
      this.estado.textContent = "Buscando mano..."
      this.procesar()
    } catch(error) {
      if(sesion != this.sesion) return
      console.error(error)
      this.establecerManosLibres(false)
      this.detenerFlujo()
      this.activa = false
      this.estado.textContent = "No se ha podido iniciar la cámara o el detector."
    }
  }

  cerrar() {
    if(this.panel.hidden) return
    this.establecerManosLibres(false)
    this.sesion++
    this.activa = false
    if(this.animacion) cancelAnimationFrame(this.animacion)
    this.animacion = null
    this.detenerFlujo()
    this.contexto.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.fotogramasPinza = 0
    this.pinzaConsumida = false
    this.inicioApertura = null
    this.aperturaConsumida = false
    this.esperandoApertura = false
    this.arrastreCamara = null
    this.reiniciarGestoVoz()
    this.ocultarTarjeta()
    this.panel.hidden = true
    this.boton.setAttribute("aria-expanded", "false")
    this.boton.focus()
  }

  detenerFlujo() {
    if(this.flujo) this.flujo.getTracks().forEach((pista) => pista.stop())
    this.flujo = null
    this.video.pause()
    this.video.srcObject = null
    this.ocultarTarjeta()
  }

  procesar() {
    if(!this.activa) return
    if(this.video.readyState >= 2 && this.video.currentTime != this.ultimoFotograma) {
      this.ultimoFotograma = this.video.currentTime
      try {
        let tiempo = performance.now()
        let resultado = this.detector.detectForVideo(this.video, tiempo)
        let puntos = resultado.landmarks[0]
        this.dibujarPuntos(puntos)
        if(puntos) {
          this.actualizarTarjeta(puntos)
          this.detectarGestos(puntos, tiempo)
          this.actualizarMapa(puntos)
          this.actualizarEstadoLectura()
          let mensaje = this.manosLibresActivo ? "Manos libres activo." : "Mano detectada."
          if(tiempo > this.estadoHasta && this.estado.textContent != mensaje) this.estado.textContent = mensaje
        } else {
          this.ocultarTarjeta()
          this.arrastreCamara = null
          this.reiniciarGestoVoz()
          this.fotogramasPinza = 0
          this.pinzaConsumida = false
          this.inicioApertura = null
          this.aperturaConsumida = false
          this.esperandoApertura = false
          if(tiempo > this.estadoHasta && this.estado.textContent != "Buscando mano...") this.estado.textContent = "Buscando mano..."
        }
      } catch(error) {
        console.error(error)
        this.detenerFlujo()
        this.activa = false
        this.estado.textContent = "Se ha detenido la detección de la mano."
        return
      }
    }
    this.animacion = requestAnimationFrame(() => this.procesar())
  }

  dibujarPuntos(puntos) {
    this.contexto.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if(!puntos) return
    puntos.forEach((punto, indice) => {
      let destacado = indice == 4 || indice == 8
      this.contexto.beginPath()
      this.contexto.arc(punto.x * this.canvas.width, punto.y * this.canvas.height, destacado ? 7 : 3, 0, Math.PI * 2)
      this.contexto.fillStyle = destacado ? "#f7a68e" : "#ffffff"
      this.contexto.fill()
    })
  }

  actualizarTarjeta(puntos) {
    let asistente = window.erin?.iu?.chatbot
    let estado = asistente?.escuchando ? "Escuchando" :
      asistente?.enviando ? "Preparando respuesta" :
      asistente?.lecturaActual ? "Leyendo respuesta" :
      asistente?.panel.classList.contains("minimizado") ? "Minimizado" : "Disponible"
    let peticion = asistente?.ultimaPeticionVoz ? "Última petición: " + asistente.ultimaPeticionVoz : "Sin petición de voz"
    if(this.estadoTarjeta.textContent != estado) this.estadoTarjeta.textContent = estado
    if(this.peticionTarjeta.textContent != peticion) this.peticionTarjeta.textContent = peticion

    this.tarjeta.hidden = false
    this.posicionarTarjeta(puntos)
  }

  posicionarTarjeta(puntos) {
    let ancho = this.vista.clientWidth
    let alto = this.vista.clientHeight
    let escalaVideo = Math.max(ancho / this.video.videoWidth, alto / this.video.videoHeight)
    let anchoVideo = this.video.videoWidth * escalaVideo
    let altoVideo = this.video.videoHeight * escalaVideo
    let centroX = (puntos[5].x + puntos[17].x) / 2
    let centroY = (puntos[5].y + puntos[17].y) / 2
    let palma = Math.hypot((puntos[5].x - puntos[17].x) * anchoVideo, (puntos[5].y - puntos[17].y) * altoVideo)
    let escala = Math.max(0.8, Math.min(1.15, palma / 80))
    escala = Math.min(escala, (ancho - 16) / this.tarjeta.offsetWidth, (alto - 16) / this.tarjeta.offsetHeight)
    let anchoElemento = this.tarjeta.offsetWidth * escala
    let altoElemento = this.tarjeta.offsetHeight * escala
    let izquierda = (1 - centroX) * anchoVideo - (anchoVideo - ancho) / 2
    let arriba = centroY * altoVideo - (altoVideo - alto) / 2
    arriba -= 10
    let objetivo = {
      x: Math.max(anchoElemento / 2 + 8, Math.min(izquierda, ancho - anchoElemento / 2 - 8)),
      y: Math.max(altoElemento + 8, Math.min(arriba, alto - 8)),
      escala
    }
    if(!this.posicionTarjeta) this.posicionTarjeta = objetivo
    else {
      this.posicionTarjeta.x += (objetivo.x - this.posicionTarjeta.x) * 0.3
      this.posicionTarjeta.y += (objetivo.y - this.posicionTarjeta.y) * 0.3
      this.posicionTarjeta.escala += (objetivo.escala - this.posicionTarjeta.escala) * 0.3
    }
    this.tarjeta.style.left = this.posicionTarjeta.x + "px"
    this.tarjeta.style.top = this.posicionTarjeta.y + "px"
    this.tarjeta.style.setProperty("--escala-ar", this.posicionTarjeta.escala)
  }

  ocultarTarjeta() {
    if(this.tarjeta) this.tarjeta.hidden = true
    if(this.mapa) this.mapa.hidden = true
    this.posicionTarjeta = null
  }

  establecerManosLibres(activo) {
    if(this.manosLibresActivo == activo) return
    let asistente = window.erin?.iu?.chatbot
    let lectura = asistente?.leerRespuestas
    this.manosLibresActivo = activo
    if(activo) {
      this.lecturaAnterior = lectura && !lectura.disabled ? lectura.checked : null
      if(this.lecturaAnterior === false) lectura.click()
    } else {
      if(asistente?.escuchando && asistente.reconocimiento == this.reconocimientoPorGesto) asistente.reconocimiento.abort()
      this.reconocimientoPorGesto = null
      if(this.lecturaAnterior !== null && lectura && !lectura.disabled && lectura.checked != this.lecturaAnterior) lectura.click()
      this.lecturaAnterior = null
    }
    this.guia.hidden = !activo
    this.reiniciarGestoVoz()
    this.actualizarEstadoLectura()
    this.estado.textContent = this.manosLibresActivo ? "Manos libres activo." : "Manos libres desactivado."
  }

  actualizarEstadoLectura() {
    let lectura = window.erin?.iu?.chatbot?.leerRespuestas
    this.estadoLecturaGuia.textContent = !lectura || lectura.disabled ? "no disponible" : lectura.checked ? "activada" : "desactivada"
  }

  actualizarMapa(puntos) {
    let asistente = window.erin?.iu?.chatbot
    if(!asistente?.panel.classList.contains("minimizado")) {
      this.mapa.hidden = true
      return
    }
    let posicion = asistente.panel.getBoundingClientRect()
    let centroX = (puntos[5].x + puntos[17].x) / 2
    let centroY = (puntos[5].y + puntos[17].y) / 2
    let porcentaje = (valor) => Math.max(0, Math.min(100, valor * 100)) + "%"
    this.mapa.style.setProperty("--aspecto-pantalla", window.innerWidth / window.innerHeight)
    this.mapaMano.style.left = porcentaje(1 - centroX)
    this.mapaMano.style.top = porcentaje(centroY)
    this.mapaAsistente.style.left = porcentaje((posicion.left + posicion.width / 2) / window.innerWidth)
    this.mapaAsistente.style.top = porcentaje((posicion.top + posicion.height / 2) / window.innerHeight)
    this.mapa.hidden = false
  }

  reiniciarGestoVoz() {
    this.gestoVoz = null
    this.inicioGestoVoz = null
    this.gestoConsumido = false
    this.opcionesGuia.forEach((opcion) => {
      opcion.classList.remove("activo")
      opcion.style.setProperty("--progreso-gesto", "0%")
    })
  }

  detectarGestos(puntos, tiempo) {
    let anchuraPalma = Math.hypot(puntos[5].x - puntos[17].x, puntos[5].y - puntos[17].y)
    let distanciaPinza = Math.hypot(puntos[4].x - puntos[8].x, puntos[4].y - puntos[8].y)
    let pinzaCerrada = distanciaPinza < anchuraPalma * 0.35
    let pinzaAbierta = distanciaPinza > anchuraPalma * 0.7
    let asistente = window.erin?.iu?.chatbot
    let distanciaMuneca = (indice) => Math.hypot(puntos[indice].x - puntos[0].x, puntos[indice].y - puntos[0].y)
    let dedos = [[8, 6], [12, 10], [16, 14], [20, 18]]
    let extension = dedos.map(([punta, nudillo]) => distanciaMuneca(punta) / distanciaMuneca(nudillo))
    let extendidos = extension.map((valor) => valor > 1.12)
    let punoCerrado = extension.every((valor) => valor < 1.08)

    if(this.manosLibresActivo && punoCerrado) {
      this.arrastreCamara = null
      this.esperandoApertura = false
      this.fotogramasPinza = 0
      this.pinzaConsumida = false
      this.detectarVoz("puno", asistente, tiempo)
      return
    }

    if(pinzaCerrada) {
      this.detectarVoz(null, asistente, tiempo)
      if(this.manosLibresActivo) {
        let guiaPinza = this.opcionesGuia.find((opcion) => opcion.dataset.gesto == "pinza")
        guiaPinza?.classList.add("activo")
      }
      if(this.fotogramasPinza == 0 && asistente?.panel.classList.contains("minimizado")) {
        this.iniciarArrastreCamara(puntos, asistente)
      }
      this.fotogramasPinza++
      this.inicioApertura = null
      this.aperturaConsumida = false
      if(this.arrastreCamara) {
        this.moverMinimizado(puntos, asistente)
        if(this.arrastreCamara.movido) return
      }
      if(this.fotogramasPinza >= 4 && !this.pinzaConsumida && tiempo - this.ultimoGesto > 1300) {
        this.pinzaConsumida = true
        this.esperandoApertura = true
        if(asistente && !asistente.panel.classList.contains("minimizado")) {
          asistente.alternarMinimizacion()
          this.iniciarArrastreCamara(puntos, asistente)
          this.registrarAccion("Asistente minimizado con la pinza.", tiempo)
        }
      }
      return
    }

    if(this.arrastreCamara?.movido) {
      this.esperandoApertura = false
      this.registrarAccion("Asistente desplazado con la mano.", tiempo)
    }
    this.arrastreCamara = null
    this.fotogramasPinza = 0
    this.pinzaConsumida = false

    if(!pinzaAbierta) {
      this.inicioApertura = null
      this.aperturaConsumida = false
      this.detectarVoz(null, asistente, tiempo)
      return
    }

    if(this.esperandoApertura) {
      this.detectarVoz(null, asistente, tiempo)
      if(this.inicioApertura === null) this.inicioApertura = tiempo
      if(!this.aperturaConsumida && tiempo - this.inicioApertura >= 900 && tiempo - this.ultimoGesto > 1300) {
        this.aperturaConsumida = true
        this.esperandoApertura = false
        if(asistente?.panel.classList.contains("minimizado")) {
          asistente.alternarMinimizacion()
          this.registrarAccion("Asistente restaurado al abrir la pinza.", tiempo)
        }
      }
      return
    }

    let indice = extendidos[0] && !extendidos[1] && !extendidos[2] && !extendidos[3]
    let victoria = extendidos[0] && extendidos[1] && !extendidos[2] && !extendidos[3]
    this.detectarVoz(this.manosLibresActivo ? indice ? "indice" : victoria ? "victoria" : null : null, asistente, tiempo)
  }

  iniciarArrastreCamara(puntos, asistente) {
    asistente.fijarPosicionActual()
    let posicion = asistente.panel.getBoundingClientRect()
    this.arrastreCamara = {
      x: (puntos[5].x + puntos[17].x) / 2,
      y: (puntos[5].y + puntos[17].y) / 2,
      izquierda: posicion.left,
      arriba: posicion.top,
      movido: false
    }
  }

  moverMinimizado(puntos, asistente) {
    let centroX = (puntos[5].x + puntos[17].x) / 2
    let centroY = (puntos[5].y + puntos[17].y) / 2
    let diferenciaX = (this.arrastreCamara.x - centroX) * window.innerWidth
    let diferenciaY = (centroY - this.arrastreCamara.y) * window.innerHeight
    if(!this.arrastreCamara.movido && Math.hypot(diferenciaX, diferenciaY) < 24) return
    this.arrastreCamara.movido = true
    this.esperandoApertura = false
    let nueva = asistente.posicionLimitada(this.arrastreCamara.izquierda + diferenciaX, this.arrastreCamara.arriba + diferenciaY)
    asistente.panel.style.left = nueva.izquierda + "px"
    asistente.panel.style.top = nueva.arriba + "px"
    asistente.minimizadoMovido = true
  }

  detectarVoz(gesto, asistente, tiempo) {
    if(!this.manosLibresActivo) return
    if(this.gestoVoz != gesto) {
      this.gestoVoz = gesto
      this.inicioGestoVoz = tiempo
      this.gestoConsumido = false
    }
    let duracion = gesto ? tiempo - this.inicioGestoVoz : 0
    let umbral = gesto == "puno" ? 700 : 900
    this.opcionesGuia.forEach((opcion) => {
      let activa = opcion.dataset.gesto == gesto
      opcion.classList.toggle("activo", activa)
      opcion.style.setProperty("--progreso-gesto", activa ? Math.min(100, duracion / umbral * 100) + "%" : "0%")
    })
    if(!gesto || this.gestoConsumido || duracion < umbral || tiempo - this.ultimoGesto < 1300) return
    this.gestoConsumido = true

    if(gesto == "indice") {
      if(!asistente || asistente.enviando || asistente.escuchando) return
      let iniciada = asistente.alternarEscucha()
      if(iniciada) this.reconocimientoPorGesto = asistente.reconocimiento
      this.registrarAccion(iniciada ? "Escucha iniciada con el índice." : "No se ha podido iniciar el micrófono.", tiempo)
    } else if(gesto == "victoria") {
      let lectura = asistente?.leerRespuestas
      if(!lectura || lectura.disabled) {
        this.registrarAccion("Lectura no disponible.", tiempo)
        return
      }
      lectura.click()
      this.actualizarEstadoLectura()
      this.registrarAccion(lectura.checked ? "Lectura de respuestas activada." : "Lectura de respuestas desactivada.", tiempo)
    } else if(gesto == "puno") {
      if(asistente?.escuchando) {
        asistente.reconocimiento?.abort()
        asistente.estado.textContent = "Escucha cancelada."
        this.registrarAccion("Escucha cancelada con la mano.", tiempo)
      } else if(asistente?.lecturaActual) {
        asistente.detenerLectura()
        asistente.estado.textContent = "Lectura detenida."
        this.registrarAccion("Lectura detenida con la mano.", tiempo)
      }
    }
  }

  registrarAccion(mensaje, tiempo) {
    this.ultimoGesto = tiempo
    this.estadoHasta = tiempo + 1800
    this.estado.textContent = mensaje
  }
}

document.addEventListener("DOMContentLoaded", () => new CamaraGestosIU().iniciar())
