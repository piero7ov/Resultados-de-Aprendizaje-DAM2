// Namespace técnico de la interfaz. El guion de "erin-iu" no puede usarse
// directamente en un identificador de JavaScript, por eso se emplea erin.iu.
window.erin = window.erin || {}
window.erin.iu = window.erin.iu || {}

// ============================================================
// CARGA DE ARCHIVOS EXTERNOS
// ============================================================

class CargadorRecursos {
  constructor() {
    this.archivosTemplate = [
      "navegacion.html",
      "article.html",
      "usuario.html",
      "fila.html",
      "celda.html",
      "minimizar.html",
      "formulario.html",
      "toast.html"
    ]
  }

  // Carga todos los templates antes de crear componentes con ellos.
  cargarTemplates() {
    let cargas = this.archivosTemplate.map(function(archivo) {
      return fetch("templates/" + archivo)
      .then(function(resultado) {
        return resultado.text()
      })
    })

    return Promise.all(cargas)
    .then(function(templates) {
      document.querySelector("#templates").innerHTML = templates.join("")
    })
  }

  // Lee cualquiera de los orígenes de datos JSON del proyecto.
  cargarJSON(origen) {
    return fetch(origen)
    .then(function(resultado) {
      return resultado.json()
    })
  }
}

// ============================================================
// CREACIÓN DE COMPONENTES
// ============================================================

class FabricaComponentes {
  // Clona un template sin modificar el original.
  crear(template) {
    let plantilla = document.querySelector(template)
    return plantilla.content.cloneNode(true)
  }

  completarFicha(elemento, texto) {
    elemento.querySelector(".ficha").textContent = texto.charAt(0).toUpperCase()
    elemento.querySelector(".etiqueta").textContent = texto
  }

  agregarBotonMinimizar(columna, nombre) {
    let clon = this.crear("#template-minimizar")
    let boton = clon.querySelector("button")
    boton.setAttribute("aria-label", "Minimizar " + nombre)
    columna.appendChild(clon)
  }
}

// ============================================================
// COMPONENTES GENERADOS DESDE JSON Y TEMPLATES
// ============================================================

class NavegacionIU {
  constructor(cargador, fabrica) {
    this.cargador = cargador
    this.fabrica = fabrica
  }

  cargar() {
    let navegacion = document.querySelector(".navegacion[data-source]")

    if(!navegacion) {
      return Promise.resolve()
    }

    let origen = navegacion.getAttribute("data-source")
    let fabrica = this.fabrica

    return this.cargador.cargarJSON(origen)
    .then(function(datos) {
      datos.forEach(function(dato) {
        let clon = fabrica.crear("#template-navegacion")
        let enlace = clon.querySelector("a")

        enlace.setAttribute("href", dato.url)
        fabrica.completarFicha(enlace, dato.texto)

        let paginaActual = window.location.pathname.split("/").pop() || "index.html"

        if(dato.pagina == paginaActual || (!dato.pagina && dato.activo)) {
          enlace.classList.add("activo")
          enlace.setAttribute("aria-current", "page")
        }

        navegacion.appendChild(clon)
      })

      fabrica.agregarBotonMinimizar(navegacion, "navegación")
    })
  }
}

class ArticulosIU {
  constructor(cargador, fabrica) {
    this.cargador = cargador
    this.fabrica = fabrica
  }

  cargar() {
    let elementos = document.querySelector(".elementos[data-source]")

    if(!elementos) {
      return Promise.resolve()
    }

    let origen = elementos.getAttribute("data-source")
    let fabrica = this.fabrica

    return this.cargador.cargarJSON(origen)
    .then(function(datos) {
      datos.forEach(function(dato) {
        let clon = fabrica.crear("#template-article")
        let articulo = clon.querySelector("article")

        fabrica.completarFicha(articulo, dato.texto)

        if(dato.activo) {
          articulo.classList.add("activo")
        }

        elementos.appendChild(clon)
      })

      fabrica.agregarBotonMinimizar(elementos, "elementos")
    })
  }
}

class UsuarioIU {
  constructor(cargador, fabrica) {
    this.cargador = cargador
    this.fabrica = fabrica
  }

  cargar() {
    let usuario = document.querySelector(".usuario[data-source]")

    if(!usuario) {
      return Promise.resolve()
    }

    let origen = usuario.getAttribute("data-source")
    let fabrica = this.fabrica

    return this.cargador.cargarJSON(origen)
    .then(function(datos) {
      let clon = fabrica.crear("#template-usuario")

      clon.querySelector("p").textContent = datos.nombre
      clon.querySelector("a").setAttribute("href", datos.url)
      usuario.appendChild(clon)
    })
  }
}

class TablaIU {
  constructor(cargador, fabrica) {
    this.cargador = cargador
    this.fabrica = fabrica
    this.datos = null
    this.tabla = null
  }

  cargar() {
    let tabla = document.querySelector("table[data-source]")

    if(!tabla) {
      return Promise.resolve()
    }

    let origen = tabla.getAttribute("data-source")

    return this.cargador.cargarJSON(origen)
    .then((datos) => {
      this.datos = datos
      this.tabla = tabla
      let cabecera = document.createElement("thead")
      let filaCabecera = document.createElement("tr")

      datos.campos.forEach(function(campo) {
        let celda = document.createElement("th")
        celda.textContent = campo.etiqueta
        celda.dataset.tipo = campo.tipo
        filaCabecera.appendChild(celda)
      })

      cabecera.appendChild(filaCabecera)
      tabla.appendChild(cabecera)

      let cuerpo = document.createElement("tbody")

      datos.datos.forEach((registro) => cuerpo.appendChild(this.crearFila(registro)))

      tabla.appendChild(cuerpo)
    })
  }

  crearFila(registro) {
    let clonFila = this.fabrica.crear("#template-fila")
    let fila = clonFila.querySelector("tr")

    // Estos datos permiten filtrar sin depender del texto visible.
    fila.dataset.categoria = registro.categoria
    fila.dataset.disponible = registro.disponible ? "si" : "no"
    fila.tabIndex = 0
    fila.setAttribute("aria-label", "Editar producto " + registro.nombre)
    fila.addEventListener("click", () => this.alEditar?.(registro, fila))
    fila.addEventListener("keydown", (evento) => {
      if(evento.key == "Enter" || evento.key == " ") {
        evento.preventDefault()
        this.alEditar?.(registro, fila)
      }
    })

    this.datos.campos.forEach((campo) => {
      let clonCelda = this.fabrica.crear("#template-celda")
      let celda = clonCelda.querySelector("td")
      let valor = registro[campo.nombre]

      celda.dataset.valor = valor

      if(campo.tipo == "checkbox") {
        let control = document.createElement("input")
        control.setAttribute("type", "checkbox")
        control.disabled = true
        control.checked = valor
        celda.appendChild(control)
      } else {
        celda.textContent = valor
      }

      fila.appendChild(clonCelda)
    })

    return clonFila
  }

  agregarRegistro(registro) {
    let ids = this.datos.datos.map((producto) => Number(producto.id) || 0)
    registro.id = Math.max(0, ...ids) + 1
    this.datos.datos.push(registro)
    this.tabla.querySelector("tbody").appendChild(this.crearFila(registro))
    document.dispatchEvent(new CustomEvent("productoCreado"))
  }

  actualizarRegistro(registro, fila) {
    let nuevaFila = this.crearFila(registro).querySelector("tr")
    fila.replaceWith(nuevaFila)
    document.dispatchEvent(new CustomEvent("productoActualizado"))
    return nuevaFila
  }
}

// ============================================================
// CONTROL DE LA INTERFAZ
// ============================================================

class BuscadorIU {
  activar() {
    let buscador = document.querySelector("#buscar")

    if(!buscador) {
      return
    }

    // Emisor: buscador. Evento: input. La función escuchadora filtra las filas.
    buscador.addEventListener("input", function() {
      let busqueda = buscador.value.toLowerCase()
      let filas = document.querySelectorAll("table[data-source] tbody tr")

      filas.forEach(function(fila) {
        let texto = fila.textContent.toLowerCase()
        let coincide = texto.includes(busqueda)

        fila.dataset.coincideBusqueda = coincide ? "si" : "no"
        fila.hidden = !coincide || fila.dataset.coincideFiltro == "no"
      })

      document.dispatchEvent(new CustomEvent("busquedaTablaActualizada"))
    })
  }
}

class GestorColumnas {
  activar() {
    this.activarMinimizacion()
    this.activarSeparadores()
  }

  activarMinimizacion() {
    let columnas = document.querySelectorAll("main .navegacion, main .elementos")

    columnas.forEach(function(columna) {
      let boton = columna.querySelector(".minimizar")
      let nombreColumna = columna.classList.contains("navegacion") ? "navegación" : "elementos"
      let identificadorColumna = columna.classList.contains("navegacion") ? "navegacion" : "elementos"

      // Relaciona el botón con su columna y describe la acción disponible.
      columna.id = "columna-" + identificadorColumna
      columna.dataset.ancho = columna.getBoundingClientRect().width
      boton.setAttribute("aria-controls", columna.id)
      boton.setAttribute("aria-label", "Contraer " + nombreColumna)

      // Al ser un button, Enter y espacio generan el mismo evento click.
      boton.addEventListener("click", function() {
        let vaACompactarse = !columna.classList.contains("compacto")

        if(vaACompactarse) {
          columna.dataset.ancho = columna.getBoundingClientRect().width
          columna.classList.add("compacto")
          boton.setAttribute("aria-expanded", "false")
          boton.setAttribute("aria-label", "Restaurar " + nombreColumna)
        } else {
          let anchoAnterior = parseFloat(columna.dataset.ancho)

          if(anchoAnterior) {
            columna.style.setProperty("--ancho-actual", anchoAnterior + "px")
          }

          columna.classList.remove("compacto")
          boton.setAttribute("aria-expanded", "true")
          boton.setAttribute("aria-label", "Contraer " + nombreColumna)
        }
      })
    })
  }

  activarSeparadores() {
    let separadores = document.querySelectorAll(".separador")

    separadores.forEach(function(separador) {
      let columna = separador.previousElementSibling
      let minimo = parseFloat(separador.dataset.minimo)
      let maximoConfigurado = parseFloat(separador.dataset.maximo)

      // Convierte el separador visual en un control accesible mediante Tab.
      separador.tabIndex = 0
      separador.setAttribute("aria-controls", columna.id)
      separador.setAttribute("aria-valuemin", minimo)

      function calcularMaximo() {
        let principal = separador.parentElement
        let otraColumna = columna.classList.contains("navegacion")
          ? principal.querySelector(".elementos")
          : principal.querySelector(".navegacion")
        let anchoSeparadores = separadores.length * separador.getBoundingClientRect().width
        let anchoMaximoPorEscenario =
          principal.getBoundingClientRect().width -
          otraColumna.getBoundingClientRect().width -
          anchoSeparadores -
          320

        // Reserva espacio suficiente para que el escenario principal siga siendo utilizable.
        return Math.max(minimo, Math.min(maximoConfigurado, anchoMaximoPorEscenario))
      }

      function aplicarAncho(nuevoAncho) {
        let maximo = calcularMaximo()
        nuevoAncho = Math.max(minimo, Math.min(maximo, nuevoAncho))

        columna.style.setProperty("--ancho-actual", nuevoAncho + "px")
        columna.dataset.ancho = nuevoAncho

        // Mantiene sincronizados el tamaño visual y el valor anunciado del separador.
        separador.setAttribute("aria-valuemax", Math.round(maximo))
        separador.setAttribute("aria-valuenow", Math.round(nuevoAncho))
        separador.setAttribute("aria-valuetext", Math.round(nuevoAncho) + " píxeles")
      }

      aplicarAncho(columna.getBoundingClientRect().width)

      // Las flechas ajustan 10 píxeles; Mayús aumenta el paso a 25 píxeles.
      // Home y End llevan directamente la columna a sus límites permitidos.
      separador.addEventListener("keydown", function(evento) {
        if(window.innerWidth <= 850 || columna.classList.contains("compacto")) {
          return
        }

        let teclasPermitidas = ["ArrowLeft", "ArrowRight", "Home", "End"]

        if(!teclasPermitidas.includes(evento.key)) {
          return
        }

        evento.preventDefault()
        let anchoActual = columna.getBoundingClientRect().width
        let paso = evento.shiftKey ? 25 : 10

        if(evento.key == "ArrowLeft") aplicarAncho(anchoActual - paso)
        if(evento.key == "ArrowRight") aplicarAncho(anchoActual + paso)
        if(evento.key == "Home") aplicarAncho(minimo)
        if(evento.key == "End") aplicarAncho(calcularMaximo())
      })

      // mousedown inicia el seguimiento del movimiento del separador.
      separador.addEventListener("mousedown", function(evento) {
        if(window.innerWidth <= 850) {
          return
        }

        if(columna.classList.contains("compacto")) {
          return
        }

        evento.preventDefault()

        let inicioX = evento.clientX
        let anchoInicial = columna.getBoundingClientRect().width
        columna.classList.add("ajustando-ancho")
        separador.classList.add("arrastrando")
        document.body.classList.add("redimensionando")

        function mover(eventoMovimiento) {
          let diferencia = eventoMovimiento.clientX - inicioX
          let nuevoAncho = anchoInicial + diferencia

          aplicarAncho(nuevoAncho)
        }

        function terminar() {
          columna.classList.remove("ajustando-ancho")
          separador.classList.remove("arrastrando")
          document.body.classList.remove("redimensionando")
          document.removeEventListener("mousemove", mover)
          document.removeEventListener("mouseup", terminar)
        }

        // Estos escuchadores temporales actúan mientras se arrastra la columna.
        document.addEventListener("mousemove", mover)
        document.addEventListener("mouseup", terminar)
      })
    })
  }
}

// Clase principal: guarda los objetos de la aplicación como propiedades y
// coordina su carga en el orden necesario.
class AplicacionIU {
  constructor() {
    this.cargador = new CargadorRecursos()
    this.fabrica = new FabricaComponentes()
    this.navegacion = new NavegacionIU(this.cargador, this.fabrica)
    this.articulos = new ArticulosIU(this.cargador, this.fabrica)
    this.usuario = new UsuarioIU(this.cargador, this.fabrica)
    this.tabla = new TablaIU(this.cargador, this.fabrica)
    this.buscador = new BuscadorIU()
    this.columnas = new GestorColumnas()
  }

  iniciar() {
    let aplicacion = this

    this.cargador.cargarTemplates()
    .then(function() {
      return Promise.all([
        aplicacion.navegacion.cargar(),
        aplicacion.articulos.cargar(),
        aplicacion.usuario.cargar(),
        aplicacion.tabla.cargar()
      ])
    })
    .then(function() {
      aplicacion.buscador.activar()
      aplicacion.columnas.activar()

      // La aplicación emite un evento propio al terminar de crear los componentes.
      document.dispatchEvent(new CustomEvent("componentesListos"))
    })
    .catch(function(error) {
      console.error("No se ha podido iniciar la interfaz", error)
    })
  }
}

// Las clases quedan accesibles desde el namespace para poder reutilizarlas.
window.erin.iu.CargadorRecursos = CargadorRecursos
window.erin.iu.FabricaComponentes = FabricaComponentes
window.erin.iu.NavegacionIU = NavegacionIU
window.erin.iu.ArticulosIU = ArticulosIU
window.erin.iu.UsuarioIU = UsuarioIU
window.erin.iu.TablaIU = TablaIU
window.erin.iu.BuscadorIU = BuscadorIU
window.erin.iu.GestorColumnas = GestorColumnas
window.erin.iu.AplicacionIU = AplicacionIU

window.erin.iu.aplicacion = new AplicacionIU()

// DOMContentLoaded avisa de que el HTML inicial ya se puede utilizar.
document.addEventListener("DOMContentLoaded", function() {
  window.erin.iu.aplicacion.iniciar()
})
