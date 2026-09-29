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

    toast.classList.add("toast-" + tipo)
    toast.querySelector(".toast-icono").textContent = this.iconos[tipo]
    toast.querySelector(".toast-titulo").textContent = titulo
    toast.querySelector(".toast-mensaje").textContent = mensaje

    let cerrarToast = function() {
      if(toast.classList.contains("saliendo")) {
        return
      }

      toast.classList.add("saliendo")
      setTimeout(function() {
        toast.remove()
      }, 250)
    }

    toast.querySelector(".toast-cerrar").onclick = cerrarToast
    contenedor.appendChild(clon)
    setTimeout(cerrarToast, 5000)
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

    formulario.addEventListener("submit", function(evento) {
      evento.preventDefault()
      toast.mostrar(
        "exito",
        "Acceso simulado",
        "La pantalla ha capturado correctamente el evento de inicio de sesión."
      )
    })

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

// Agrupa y coordina las interacciones secundarias de la interfaz.
class InteraccionesIU {
  constructor(fabrica) {
    this.toast = new ToastIU(fabrica)
    this.formulario = new FormularioIU(fabrica, this.toast)
    this.muestrarioToasts = new MuestrarioToastsIU(this.toast)
    this.login = new LoginIU(this.toast)
  }

  iniciar() {
    this.formulario.iniciar()
    this.muestrarioToasts.iniciar()
    this.login.iniciar()
  }
}

window.erin.iu.ToastIU = ToastIU
window.erin.iu.FormularioIU = FormularioIU
window.erin.iu.MuestrarioToastsIU = MuestrarioToastsIU
window.erin.iu.LoginIU = LoginIU
window.erin.iu.InteraccionesIU = InteraccionesIU

// componentes.js emite este evento cuando los templates ya están cargados.
document.addEventListener("componentesListos", function() {
  window.erin.iu.interacciones = new InteraccionesIU(
    window.erin.iu.aplicacion.fabrica
  )
  window.erin.iu.interacciones.iniciar()
})
