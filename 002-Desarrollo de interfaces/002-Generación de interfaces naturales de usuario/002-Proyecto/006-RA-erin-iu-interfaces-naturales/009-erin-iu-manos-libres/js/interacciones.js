// ============================================================
// INTERACCIONES DE LAS PÁGINAS DE DEMOSTRACIÓN
// ============================================================

class ToastIU {
  constructor(fabrica, selectorContenedor = "#contenedor-toasts") {
    this.fabrica = fabrica
    this.selectorContenedor = selectorContenedor
    this.iconos = {
      exito: "✓",
      informacion: "i",
      aviso: "!",
      error: "×"
    }
  }

  mostrar(tipo, titulo, mensaje) {
    let contenedor = document.querySelector(this.selectorContenedor)

    if(!contenedor) {
      return
    }

    let clon = this.fabrica.crear("#template-toast")
    let toast = clon.querySelector(".toast")
    let focoAnterior = document.activeElement

    toast.classList.add("toast-" + tipo)

    // Los errores se anuncian de inmediato; el resto no interrumpe la lectura actual.
    toast.setAttribute("role", tipo == "error" ? "alert" : "status")
    toast.setAttribute("aria-live", tipo == "error" ? "assertive" : "polite")
    toast.setAttribute("aria-atomic", "true")
    toast.querySelector(".toast-icono").textContent = this.iconos[tipo]
    toast.querySelector(".toast-titulo").textContent = titulo
    toast.querySelector(".toast-mensaje").textContent = mensaje

    // El parámetro indica si el cierre fue solicitado por la persona usuaria.
    let cerrarToast = function(devolverFoco) {
      if(toast.classList.contains("saliendo")) {
        return
      }

      toast.classList.add("saliendo")
      document.removeEventListener("keydown", cerrarConEscape)
      setTimeout(function() {
        toast.remove()

        if(devolverFoco && focoAnterior instanceof HTMLElement) {
          focoAnterior.focus()
        }
      }, 250)
    }

    function cerrarConEscape(evento) {
      // Si hay varios mensajes, Escape cierra primero el más reciente.
      if(evento.key == "Escape" && toast.parentElement?.lastElementChild == toast) {
        cerrarToast(true)
      }
    }

    // El cierre devuelve el foco al control que originó la notificación.
    toast.querySelector(".toast-cerrar").addEventListener("click", function() {
      cerrarToast(true)
    })
    document.addEventListener("keydown", cerrarConEscape)
    contenedor.appendChild(clon)

    // El cierre automático no mueve el foco porque no procede de una acción directa.
    setTimeout(function() {
      cerrarToast(false)
    }, 5000)
  }
}

class FormularioIU {
  constructor(fabrica, toast) {
    this.fabrica = fabrica
    this.toast = toast
  }

  iniciar() {
    let escenario = document.querySelector('[data-componente="formulario"]')

    if(!escenario) {
      return
    }

    let clon = this.fabrica.crear("#template-formulario")
    escenario.appendChild(clon)

    let formulario = escenario.querySelector("#formulario-contacto")
    let toast = this.toast

    // submit permite capturar el envío y responder sin recargar la página.
    formulario.addEventListener("submit", function(evento) {
      evento.preventDefault()

      let datos = new FormData(formulario)
      let nombre = datos.get("nombre")

      toast.mostrar(
        "exito",
        "Contacto guardado",
        nombre + " se ha incorporado correctamente a ERIN."
      )
    })
  }
}

class MuestrarioToastsIU {
  constructor(toast) {
    this.toast = toast
    this.mensajes = {
      exito: ["Operación completada", "Los cambios se han guardado correctamente."],
      informacion: ["Información disponible", "Hay nuevos datos preparados para consultar."],
      aviso: ["Revisión necesaria", "Comprueba los campos antes de continuar."],
      error: ["No se pudo completar", "La operación ha encontrado un problema."]
    }
  }

  iniciar() {
    let botones = document.querySelectorAll("[data-toast]")
    let mensajes = this.mensajes
    let toast = this.toast

    botones.forEach(function(boton) {
      // Cada botón escucha click y muestra el tipo de toast indicado en data-toast.
      boton.addEventListener("click", function() {
        let tipo = boton.dataset.toast
        toast.mostrar(tipo, mensajes[tipo][0], mensajes[tipo][1])
      })
    })
  }
}

class LoginIU {
  constructor(toast) {
    this.toast = toast
  }

  iniciar() {
    let formulario = document.querySelector("#formulario-login")

    if(!formulario) {
      return
    }

    let toast = this.toast

    // El escuchador de submit simula el acceso sin enviar credenciales.
    formulario.addEventListener("submit", function(evento) {
      evento.preventDefault()
      toast.mostrar(
        "exito",
        "Acceso simulado",
        "La pantalla ha capturado correctamente el evento de inicio de sesión."
      )
    })

    // Los dos botones secundarios escuchan click y muestran información.
    document.querySelector("#recuperar-contrasena").addEventListener("click", function() {
      toast.mostrar(
        "informacion",
        "Recuperación de acceso",
        "La recuperación de contraseña se conectará al servicio de usuarios."
      )
    })

    document.querySelector("#solicitar-acceso").addEventListener("click", function() {
      toast.mostrar(
        "informacion",
        "Solicitud de acceso",
        "La solicitud se conectará al proceso de alta de ERIN."
      )
    })
  }
}

class DialogosIU {
  constructor() {
    this.modal = document.querySelector("#modal-ejemplo")
    this.panel = document.querySelector("#panel-ejemplo")
    this.redimensionador = document.querySelector("#redimensionar-panel")
    this.focoAnterior = new Map()
  }

  iniciar() {
    if(!this.modal || !this.panel) {
      return
    }

    let abrirModal = document.querySelector("#abrir-modal")
    let abrirPanel = document.querySelector("#abrir-panel")
    let formulario = document.querySelector("#formulario-panel")
    let resultado = document.querySelector("#resultado-modal-paneles")

    abrirModal.addEventListener("click", () => this.abrir(this.modal, abrirModal))
    abrirPanel.addEventListener("click", () => {
      formulario.elements.titulo.value = document.querySelector("#titulo-vista-previa").textContent
      formulario.elements.descripcion.value = document.querySelector("#descripcion-vista-previa").textContent
      this.abrir(this.panel, abrirPanel)
    })

    document.querySelector("#confirmar-modal").addEventListener("click", () => {
      resultado.textContent = "Acción confirmada."
      this.modal.close()
    })

    formulario.addEventListener("submit", (evento) => {
      evento.preventDefault()
      document.querySelector("#titulo-vista-previa").textContent = formulario.elements.titulo.value.trim()
      document.querySelector("#descripcion-vista-previa").textContent = formulario.elements.descripcion.value.trim()
      resultado.textContent = "Vista previa actualizada."
      this.panel.close()
    })

    for(let dialogo of [this.modal, this.panel]) {
      dialogo.querySelectorAll("[data-cerrar-dialogo]").forEach((boton) => {
        boton.addEventListener("click", () => dialogo.close())
      })

      dialogo.addEventListener("click", (evento) => {
        let limites = dialogo.getBoundingClientRect()
        if(evento.target == dialogo && (evento.clientX < limites.left || evento.clientX > limites.right || evento.clientY < limites.top || evento.clientY > limites.bottom)) {
          dialogo.close()
        }
      })

      dialogo.addEventListener("close", () => {
        this.focoAnterior.get(dialogo)?.focus()
        this.focoAnterior.delete(dialogo)
      })
    }

    this.activarRedimension()
  }

  abrir(dialogo, disparador) {
    this.focoAnterior.set(dialogo, disparador)
    dialogo.showModal()
    dialogo.querySelector(dialogo == this.panel ? "input" : "#confirmar-modal")?.focus()
  }

  activarRedimension() {
    let anchoMaximo = () => Math.min(720, window.innerWidth)
    let anchoMinimo = () => Math.min(320, anchoMaximo())
    let ajustar = (ancho) => {
      let ajustado = Math.max(anchoMinimo(), Math.min(anchoMaximo(), ancho))
      this.panel.style.width = ajustado + "px"
      this.redimensionador.setAttribute("aria-valuemin", String(anchoMinimo()))
      this.redimensionador.setAttribute("aria-valuemax", String(anchoMaximo()))
      this.redimensionador.setAttribute("aria-valuenow", String(Math.round(ajustado)))
    }

    ajustar(440)
    this.redimensionador.addEventListener("pointerdown", (evento) => {
      evento.preventDefault()
      let inicio = evento.clientX
      let anchoInicial = this.panel.getBoundingClientRect().width
      this.redimensionador.setPointerCapture(evento.pointerId)

      let mover = (movimiento) => ajustar(anchoInicial + inicio - movimiento.clientX)
      let terminar = () => {
        this.redimensionador.removeEventListener("pointermove", mover)
        this.redimensionador.removeEventListener("pointerup", terminar)
        this.redimensionador.removeEventListener("pointercancel", terminar)
      }

      this.redimensionador.addEventListener("pointermove", mover)
      this.redimensionador.addEventListener("pointerup", terminar)
      this.redimensionador.addEventListener("pointercancel", terminar)
    })

    this.redimensionador.addEventListener("keydown", (evento) => {
      if(evento.key == "ArrowLeft" || evento.key == "ArrowRight") {
        evento.preventDefault()
        let diferencia = evento.key == "ArrowLeft" ? 20 : -20
        ajustar(this.panel.getBoundingClientRect().width + diferencia)
      }
    })

    window.addEventListener("resize", () => ajustar(this.panel.getBoundingClientRect().width))
  }
}

// Agrupa y coordina las interacciones secundarias de la interfaz.
class InteraccionesIU {
  constructor(fabrica) {
    this.toast = new ToastIU(fabrica)
    this.formulario = new FormularioIU(fabrica, this.toast)
    this.muestrarioToasts = new MuestrarioToastsIU(this.toast)
    this.login = new LoginIU(this.toast)
    this.dialogos = new DialogosIU()
  }

  iniciar() {
    this.formulario.iniciar()
    this.muestrarioToasts.iniciar()
    this.login.iniciar()
    this.dialogos.iniciar()
  }
}

window.erin.iu.ToastIU = ToastIU
window.erin.iu.FormularioIU = FormularioIU
window.erin.iu.MuestrarioToastsIU = MuestrarioToastsIU
window.erin.iu.LoginIU = LoginIU
window.erin.iu.DialogosIU = DialogosIU
window.erin.iu.InteraccionesIU = InteraccionesIU

// componentes.js emite el evento personalizado cuando los templates están cargados.
// Este archivo lo escucha y activa las interacciones que dependen de ellos.
document.addEventListener("componentesListos", function() {
  window.erin.iu.interacciones = new InteraccionesIU(
    window.erin.iu.aplicacion.fabrica
  )
  window.erin.iu.interacciones.iniciar()
})
