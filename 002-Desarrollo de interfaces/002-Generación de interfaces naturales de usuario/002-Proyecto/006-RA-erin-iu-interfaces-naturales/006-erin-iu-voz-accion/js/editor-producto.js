class EditorProductoIU {
  constructor(tabla, toast) {
    this.tabla = tabla
    this.toast = toast
    this.boton = document.querySelector("#nuevo-producto")
    this.panel = document.querySelector("#panel-nuevo-producto")
    this.formulario = document.querySelector("#formulario-nuevo-producto")
    this.redimensionador = document.querySelector("#redimensionar-producto")
    this.titulo = document.querySelector("#titulo-nuevo-producto")
    this.guardar = document.querySelector("#guardar-producto")
    this.registroActual = null
    this.filaActual = null
  }

  iniciar() {
    if(!this.boton || !this.panel || !this.tabla.datos) {
      return
    }

    this.crearCampos()
    this.activarRedimension()
    this.tabla.alEditar = (registro, fila) => this.abrirActualizar(registro, fila)

    this.boton.addEventListener("click", () => this.abrirCrear())

    document.querySelector("#cerrar-nuevo-producto").addEventListener("click", () => this.panel.close())
    document.querySelector("#cancelar-nuevo-producto").addEventListener("click", () => this.panel.close())
    this.panel.addEventListener("close", () => {
      let destino = this.filaActual?.isConnected && !this.filaActual.hidden ? this.filaActual : this.boton
      destino.focus()
      this.registroActual = null
      this.filaActual = null
    })
    this.panel.addEventListener("click", (evento) => {
      let limites = this.panel.getBoundingClientRect()
      if(evento.target == this.panel && (evento.clientX < limites.left || evento.clientX > limites.right || evento.clientY < limites.top || evento.clientY > limites.bottom)) {
        this.panel.close()
      }
    })

    this.formulario.addEventListener("submit", (evento) => {
      evento.preventDefault()
      let valores = new FormData(this.formulario)
      let registro = {}

      this.tabla.datos.campos.forEach((campo) => {
        if(campo.nombre == "id") {
          return
        }

        if(campo.tipo == "checkbox") {
          registro[campo.nombre] = valores.has(campo.nombre)
        } else if(campo.tipo == "number") {
          let valor = valores.get(campo.nombre)
          registro[campo.nombre] = valor == "" ? "" : Number(valor)
        } else {
          registro[campo.nombre] = valores.get(campo.nombre)?.trim() ?? ""
        }
      })

      if(this.registroActual) {
        Object.assign(this.registroActual, registro)
        this.filaActual = this.tabla.actualizarRegistro(this.registroActual, this.filaActual)
        this.toast.mostrar("exito", "Producto actualizado", "Los cambios se muestran en el catálogo.")
      } else {
        this.tabla.agregarRegistro(registro)
        this.toast.mostrar("exito", "Producto creado", "El producto se ha añadido al catálogo.")
      }
      this.panel.close()
    })
  }

  abrirCrear() {
    this.registroActual = null
    this.filaActual = null
    this.formulario.reset()
    this.titulo.textContent = "Nuevo producto"
    this.guardar.textContent = "Crear producto"
    this.panel.showModal()
    this.formulario.querySelector("input, textarea, select")?.focus()
  }

  abrirActualizar(registro, fila) {
    this.registroActual = registro
    this.filaActual = fila
    this.formulario.reset()
    this.tabla.datos.campos.forEach((campo) => {
      let control = this.formulario.elements.namedItem(campo.nombre)
      if(!control) return
      if(campo.tipo == "checkbox") {
        control.checked = Boolean(registro[campo.nombre])
      } else {
        control.value = registro[campo.nombre] ?? ""
      }
    })
    this.titulo.textContent = "Editar producto"
    this.guardar.textContent = "Guardar cambios"
    this.panel.showModal()
    this.formulario.querySelector("input, textarea, select")?.focus()
  }

  crearCampos() {
    let contenedor = document.querySelector("#campos-nuevo-producto")

    this.tabla.datos.campos.forEach((campo) => {
      if(campo.nombre == "id") {
        return
      }

      let etiqueta = document.createElement("label")
      let texto = document.createElement("span")
      texto.textContent = campo.etiqueta
      let control

      if(campo.tipo == "textarea") {
        control = document.createElement("textarea")
        control.rows = 3
      } else if(campo.tipo == "select") {
        control = document.createElement("select")
        let vacia = document.createElement("option")
        vacia.value = ""
        vacia.textContent = "Selecciona una categoría"
        control.appendChild(vacia)
        campo.opciones.forEach((opcion) => {
          let elemento = document.createElement("option")
          elemento.value = opcion
          elemento.textContent = opcion
          control.appendChild(elemento)
        })
      } else {
        control = document.createElement("input")
        control.type = campo.tipo || "text"
      }

      control.name = campo.nombre
      control.id = "campo-producto-" + campo.nombre

      if(campo.nombre == "nombre" || campo.nombre == "categoria") {
        control.required = true
      }
      if(campo.tipo == "number") {
        control.min = "0"
        control.step = campo.nombre == "stock" ? "1" : "any"
      }

      if(campo.tipo == "checkbox") {
        etiqueta.className = "campo-check"
        etiqueta.append(control, texto)
      } else {
        etiqueta.append(texto, control)
      }

      contenedor.appendChild(etiqueta)
    })
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
        ajustar(this.panel.getBoundingClientRect().width + (evento.key == "ArrowLeft" ? 20 : -20))
      }
    })

    window.addEventListener("resize", () => ajustar(this.panel.getBoundingClientRect().width))
  }
}

window.erin.iu.EditorProductoIU = EditorProductoIU

document.addEventListener("componentesListos", () => {
  let aplicacion = window.erin.iu.aplicacion
  aplicacion.editorProducto = new EditorProductoIU(aplicacion.tabla, window.erin.iu.interacciones.toast)
  aplicacion.editorProducto.iniciar()
})
