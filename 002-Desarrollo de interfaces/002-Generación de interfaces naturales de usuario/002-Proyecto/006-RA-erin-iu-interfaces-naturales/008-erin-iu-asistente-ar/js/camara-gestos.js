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
  }

  iniciar() {
    if(!this.boton || !this.panel || !this.contexto || !this.tarjeta) return
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
      this.estado.textContent = "Buscando mano..."
      this.procesar()
    } catch(error) {
      if(sesion != this.sesion) return
      console.error(error)
      this.detenerFlujo()
      this.activa = false
      this.estado.textContent = "No se ha podido iniciar la cámara o el detector."
    }
  }

  cerrar() {
    if(this.panel.hidden) return
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
          if(tiempo > this.estadoHasta && this.estado.textContent != "Mano detectada.") this.estado.textContent = "Mano detectada."
        } else {
          this.ocultarTarjeta()
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
    let ancho = this.vista.clientWidth
    let alto = this.vista.clientHeight
    let escalaVideo = Math.max(ancho / this.video.videoWidth, alto / this.video.videoHeight)
    let anchoVideo = this.video.videoWidth * escalaVideo
    let altoVideo = this.video.videoHeight * escalaVideo
    let centroX = (puntos[5].x + puntos[17].x) / 2
    let centroY = (puntos[5].y + puntos[17].y) / 2
    let palma = Math.hypot(puntos[5].x - puntos[17].x, puntos[5].y - puntos[17].y)
    let escala = Math.max(0.8, Math.min(1.15, palma * anchoVideo / 80))
    let anchoTarjeta = this.tarjeta.offsetWidth * escala
    let altoTarjeta = this.tarjeta.offsetHeight * escala
    let izquierda = (1 - centroX) * anchoVideo - (anchoVideo - ancho) / 2
    let arriba = centroY * altoVideo - (altoVideo - alto) / 2 - 10
    let objetivo = {
      x: Math.max(anchoTarjeta / 2 + 8, Math.min(izquierda, ancho - anchoTarjeta / 2 - 8)),
      y: Math.max(altoTarjeta + 8, Math.min(arriba, alto - 8)),
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
    this.posicionTarjeta = null
  }

  detectarGestos(puntos, tiempo) {
    let anchuraPalma = Math.hypot(puntos[5].x - puntos[17].x, puntos[5].y - puntos[17].y)
    let distanciaPinza = Math.hypot(puntos[4].x - puntos[8].x, puntos[4].y - puntos[8].y)
    let pinzaCerrada = distanciaPinza < anchuraPalma * 0.35
    let pinzaAbierta = distanciaPinza > anchuraPalma * 0.7
    let asistente = window.erin?.iu?.chatbot

    if(pinzaCerrada) {
      this.fotogramasPinza++
      this.inicioApertura = null
      this.aperturaConsumida = false
      if(this.fotogramasPinza >= 4 && !this.pinzaConsumida && tiempo - this.ultimoGesto > 1300) {
        this.pinzaConsumida = true
        this.esperandoApertura = true
        if(asistente && !asistente.panel.classList.contains("minimizado")) {
          asistente.alternarMinimizacion()
          this.registrarAccion("Asistente minimizado con la pinza.", tiempo)
        }
      }
      return
    }

    this.fotogramasPinza = 0
    this.pinzaConsumida = false

    if(!pinzaAbierta) {
      this.inicioApertura = null
      this.aperturaConsumida = false
      return
    }

    if(this.inicioApertura === null) this.inicioApertura = tiempo
    if(this.esperandoApertura && !this.aperturaConsumida && tiempo - this.inicioApertura >= 900 && tiempo - this.ultimoGesto > 1300) {
      this.aperturaConsumida = true
      this.esperandoApertura = false
      if(asistente?.panel.classList.contains("minimizado")) {
        asistente.alternarMinimizacion()
        this.registrarAccion("Asistente restaurado al abrir la pinza.", tiempo)
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
