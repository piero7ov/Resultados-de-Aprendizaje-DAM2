// ============================================================
// MENSAJES EMERGENTES TOAST
// ============================================================

// Crea un mensaje a partir del template común y lo añade a la pila visible.
function mostrarToast(tipo,titulo,mensaje){
  let contenedor = document.querySelector("#contenedor-toasts")

  if(!contenedor){
    return
  }

  let iconos = {
    exito: "✓",
    informacion: "i",
    aviso: "!",
    error: "×"
  }

  let clon = crearComponente("#template-toast")
  let toast = clon.querySelector(".toast")

  toast.classList.add("toast-"+tipo)
  toast.querySelector(".toast-icono").textContent = iconos[tipo]
  toast.querySelector(".toast-titulo").textContent = titulo
  toast.querySelector(".toast-mensaje").textContent = mensaje

  // La misma función sirve para el cierre manual y el cierre automático.
  function cerrarToast(){
    if(toast.classList.contains("saliendo")){
      return
    }

    toast.classList.add("saliendo")
    setTimeout(function(){
      toast.remove()
    },250)
  }

  toast.querySelector(".toast-cerrar").onclick = cerrarToast
  contenedor.appendChild(clon)

  // El mensaje desaparece automáticamente después de cinco segundos.
  setTimeout(cerrarToast,5000)
}

// ============================================================
// FORMULARIOS
// ============================================================

// Inserta el formulario externo únicamente en la página que lo solicita.
function iniciarFormulario(){
  let escenario = document.querySelector('[data-componente="formulario"]')

  if(!escenario){
    return
  }

  let clon = crearComponente("#template-formulario")
  escenario.appendChild(clon)

  let formulario = escenario.querySelector("#formulario-contacto")

  formulario.addEventListener("submit",function(evento){
    evento.preventDefault()

    // La validación required y email se ejecuta antes de llegar al submit.
    let datos = new FormData(formulario)
    let nombre = datos.get("nombre")

    mostrarToast(
      "exito",
      "Contacto guardado",
      nombre+" se ha incorporado correctamente a ERIN."
    )
  })
}

// ============================================================
// DEMOSTRACIÓN DE TOASTS
// ============================================================

function iniciarMuestrarioToasts(){
  let botones = document.querySelectorAll("[data-toast]")

  if(!botones.length){
    return
  }

  let mensajes = {
    exito: ["Operación completada","Los cambios se han guardado correctamente."],
    informacion: ["Información disponible","Hay nuevos datos preparados para consultar."],
    aviso: ["Revisión necesaria","Comprueba los campos antes de continuar."],
    error: ["No se pudo completar","La operación ha encontrado un problema."]
  }

  botones.forEach(function(boton){
    boton.addEventListener("click",function(){
      let tipo = boton.dataset.toast
      mostrarToast(tipo,mensajes[tipo][0],mensajes[tipo][1])
    })
  })
}

// ============================================================
// LOGIN DE DEMOSTRACIÓN
// ============================================================

function iniciarLogin(){
  let formulario = document.querySelector("#formulario-login")

  if(!formulario){
    return
  }

  formulario.addEventListener("submit",function(evento){
    evento.preventDefault()

    // Esta práctica demuestra la interfaz; no valida ni almacena credenciales.
    mostrarToast(
      "exito",
      "Acceso simulado",
      "La pantalla ha capturado correctamente el evento de inicio de sesión."
    )
  })
}

// componentes.js emite este evento cuando los templates ya están disponibles.
document.addEventListener("componentesListos",function(){
  iniciarFormulario()
  iniciarMuestrarioToasts()
  iniciarLogin()
})
