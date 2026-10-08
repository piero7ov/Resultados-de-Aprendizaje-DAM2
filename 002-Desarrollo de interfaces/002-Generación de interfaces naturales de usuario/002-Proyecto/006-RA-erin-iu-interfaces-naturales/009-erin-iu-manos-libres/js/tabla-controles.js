// ============================================================
// FILTROS SIMPLES Y ORDENACIÓN DE LA TABLA
// ============================================================

class ControlesTablaIU {
  constructor() {
    this.tabla = document.querySelector("table[data-source]")
    this.botonFiltros = document.querySelector("#mostrar-filtros")
    this.panelFiltros = document.querySelector("#panel-filtros")
    this.categoria = document.querySelector("#filtro-categoria")
    this.disponibilidad = document.querySelector("#filtro-disponibilidad")
    this.resultados = document.querySelector("#resultados-filtro")
  }

  iniciar() {
    if(!this.tabla || !this.botonFiltros || !this.panelFiltros) {
      return
    }

    this.prepararFilas()
    this.cargarCategorias()
    this.prepararFiltros()
    this.prepararOrdenacion()
    this.actualizarResultados()
    document.addEventListener("productoCreado", () => this.registroAñadido())
    document.addEventListener("productoActualizado", () => this.registroAñadido())
  }

  prepararFilas() {
    this.filas().forEach((fila) => {
      fila.dataset.coincideBusqueda = "si"
      fila.dataset.coincideFiltro = "si"
    })
  }

  cargarCategorias() {
    let seleccion = this.categoria.value
    let categorias = new Set()

    this.filas().forEach((fila) => {
      categorias.add(fila.dataset.categoria)
    })

    this.categoria.replaceChildren(this.categoria.options[0])

    Array.from(categorias)
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach((categoria) => {
      let opcion = document.createElement("option")
      opcion.value = categoria
      opcion.textContent = categoria
      this.categoria.appendChild(opcion)
    })

    this.categoria.value = seleccion
  }

  registroAñadido() {
    this.cargarCategorias()

    let cabeceras = Array.from(this.tabla.querySelectorAll("thead th"))
    let indice = cabeceras.findIndex((cabecera) => cabecera.getAttribute("aria-sort") != "none")

    if(indice >= 0) {
      let cabecera = cabeceras[indice]
      this.ordenar(indice, cabecera.dataset.tipo, cabecera.getAttribute("aria-sort"), cabecera)
    }

    this.aplicarFiltros()
    document.querySelector("#buscar").dispatchEvent(new Event("input"))
  }

  prepararFiltros() {
    // El botón alterna el panel y lleva el foco al primer selector al abrirlo.
    this.botonFiltros.addEventListener("click", () => {
      let seAbre = this.panelFiltros.hidden
      this.panelFiltros.hidden = !seAbre
      this.botonFiltros.setAttribute("aria-expanded", String(seAbre))

      if(seAbre) {
        this.categoria.focus()
      }
    })

    this.categoria.addEventListener("change", () => this.aplicarFiltros())
    this.disponibilidad.addEventListener("change", () => this.aplicarFiltros())

    document.querySelector("#limpiar-filtros").addEventListener("click", () => {
      this.categoria.value = ""
      this.disponibilidad.value = ""
      this.aplicarFiltros()
    })

    // Escape cierra el panel sin modificar los filtros aplicados.
    document.addEventListener("keydown", (evento) => {
      if(evento.key == "Escape" && !this.panelFiltros.hidden) {
        this.panelFiltros.hidden = true
        this.botonFiltros.setAttribute("aria-expanded", "false")
        this.botonFiltros.focus()
      }
    })

    // El buscador general avisa cuando cambia el conjunto de filas visibles.
    document.addEventListener("busquedaTablaActualizada", () => {
      this.actualizarResultados()
    })
  }

  aplicarFiltros() {
    let categoriaElegida = this.categoria.value
    let disponibilidadElegida = this.disponibilidad.value

    this.filas().forEach((fila) => {
      let coincideCategoria = !categoriaElegida || fila.dataset.categoria == categoriaElegida
      let coincideDisponibilidad = !disponibilidadElegida || fila.dataset.disponible == disponibilidadElegida
      let coincide = coincideCategoria && coincideDisponibilidad

      // Conserva por separado el resultado del buscador y el de los selectores.
      fila.dataset.coincideFiltro = coincide ? "si" : "no"
      fila.hidden = !coincide || fila.dataset.coincideBusqueda == "no"
    })

    this.actualizarResultados()
  }

  prepararOrdenacion() {
    let cabeceras = this.tabla.querySelectorAll("thead th")

    cabeceras.forEach((cabecera, indice) => {
      let etiqueta = cabecera.textContent
      let tipo = cabecera.dataset.tipo

      cabecera.textContent = ""
      cabecera.setAttribute("aria-sort", "none")

      let texto = document.createElement("span")
      texto.textContent = etiqueta

      let controles = document.createElement("span")
      controles.className = "control-ordenacion"

      controles.appendChild(this.crearControlOrdenacion(etiqueta, indice, tipo, cabecera))

      cabecera.appendChild(texto)
      cabecera.appendChild(controles)
    })
  }

  crearControlOrdenacion(etiqueta, indice, tipo, cabecera) {
    let boton = document.createElement("button")
    boton.className = "triangulo-ordenacion"
    boton.type = "button"
    boton.dataset.direccion = "ascendente"
    boton.setAttribute("aria-label", `Ordenar ${etiqueta} de forma ascendente`)

    boton.addEventListener("click", () => {
      let direccion = boton.dataset.direccion
      this.ordenar(indice, tipo, direccion, cabecera)

      // El mismo triángulo gira para mostrar el sentido aplicado.
      this.tabla.querySelectorAll(".triangulo-ordenacion").forEach((control) => {
        control.classList.remove("activo", "descendente")
      })
      boton.classList.add("activo")
      boton.classList.toggle("descendente", direccion == "descendente")

      let siguienteDireccion = direccion == "ascendente" ? "descendente" : "ascendente"
      boton.dataset.direccion = siguienteDireccion
      boton.setAttribute("aria-label", `Ordenar ${etiqueta} de forma ${siguienteDireccion}`)
    })

    return boton
  }

  ordenar(indice, tipo, direccion, cabeceraActiva) {
    let cuerpo = this.tabla.querySelector("tbody")
    let filas = this.filas()
    let multiplicador = direccion == "ascendente" ? 1 : -1

    filas.sort((filaA, filaB) => {
      let valorA = filaA.children[indice].dataset.valor
      let valorB = filaB.children[indice].dataset.valor
      return this.comparar(valorA, valorB, tipo) * multiplicador
    })

    filas.forEach((fila) => cuerpo.appendChild(fila))

    this.tabla.querySelectorAll("thead th").forEach((cabecera) => {
      cabecera.setAttribute("aria-sort", "none")
    })

    // aria-sort permite conocer qué columna está ordenada y en qué sentido.
    cabeceraActiva.setAttribute("aria-sort", direccion)
  }

  comparar(valorA, valorB, tipo) {
    if(tipo == "number") {
      return Number(valorA) - Number(valorB)
    }

    if(tipo == "date") {
      return new Date(valorA) - new Date(valorB)
    }

    if(tipo == "checkbox") {
      return Number(valorA == "true") - Number(valorB == "true")
    }

    return valorA.localeCompare(valorB, "es", { numeric: true, sensitivity: "base" })
  }

  actualizarResultados() {
    let visibles = this.filas().filter((fila) => !fila.hidden).length
    this.resultados.textContent = `${visibles} producto${visibles == 1 ? "" : "s"}`
  }

  filas() {
    return Array.from(this.tabla.querySelectorAll("tbody tr"))
  }
}

window.erin.iu.ControlesTablaIU = ControlesTablaIU

// La tabla se genera de forma asíncrona; por eso se espera al evento propio.
document.addEventListener("componentesListos", () => {
  window.erin.iu.controlesTabla = new ControlesTablaIU()
  window.erin.iu.controlesTabla.iniciar()
})
