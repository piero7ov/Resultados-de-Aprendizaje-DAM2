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
  }

  cargar() {
    let tabla = document.querySelector("table[data-source]")

    if(!tabla) {
      return Promise.resolve()
    }

    let origen = tabla.getAttribute("data-source")
    let fabrica = this.fabrica

    return this.cargador.cargarJSON(origen)
    .then(function(datos) {
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

      datos.datos.forEach(function(registro) {
        let clonFila = fabrica.crear("#template-fila")
        let fila = clonFila.querySelector("tr")

        // Estos datos permiten filtrar sin depender del texto visible.
        fila.dataset.categoria = registro.categoria
        fila.dataset.disponible = registro.disponible ? "si" : "no"

        datos.campos.forEach(function(campo) {
          let clonCelda = fabrica.crear("#template-celda")
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

        cuerpo.appendChild(clonFila)
      })

      tabla.appendChild(cuerpo)
    })
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
      let filas = document.querySelectorAll("tbody tr")

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
      columna.dataset.ancho = columna.getBoundingClientRect().width

      // El botón emite click y el escuchador contrae o restaura su columna.
      boton.addEventListener("click", function() {
        let vaACompactarse = !columna.classList.contains("compacto")

        if(vaACompactarse) {
          columna.dataset.ancho = columna.getBoundingClientRect().width
          columna.classList.add("compacto")
          boton.setAttribute("aria-expanded", "false")
        } else {
          let anchoAnterior = parseFloat(columna.dataset.ancho)

          if(anchoAnterior) {
            columna.style.setProperty("--ancho-actual", anchoAnterior + "px")
          }

          columna.classList.remove("compacto")
          boton.setAttribute("aria-expanded", "true")
        }
      })
    })
  }

  activarSeparadores() {
    let separadores = document.querySelectorAll(".separador")

    separadores.forEach(function(separador) {
      // mousedown inicia el seguimiento del movimiento del separador.
      separador.addEventListener("mousedown", function(evento) {
        if(window.innerWidth <= 850) {
          return
        }

        let columna = separador.previousElementSibling

        if(columna.classList.contains("compacto")) {
          return
        }

        evento.preventDefault()

        let inicioX = evento.clientX
        let anchoInicial = columna.getBoundingClientRect().width
        let minimo = parseFloat(separador.dataset.minimo)
        let maximo = parseFloat(separador.dataset.maximo)
        let principal = separador.parentElement
        let otraColumna

        if(columna.classList.contains("navegacion")) {
          otraColumna = principal.querySelector(".elementos")
        } else {
          otraColumna = principal.querySelector(".navegacion")
        }

        let anchoSeparadores = separadores.length * separador.getBoundingClientRect().width
        let anchoMaximoPorEscenario =
          principal.getBoundingClientRect().width -
          otraColumna.getBoundingClientRect().width -
          anchoSeparadores -
          320

        maximo = Math.max(minimo, Math.min(maximo, anchoMaximoPorEscenario))

        columna.classList.add("ajustando-ancho")
        separador.classList.add("arrastrando")
        document.body.classList.add("redimensionando")

        function mover(eventoMovimiento) {
          let diferencia = eventoMovimiento.clientX - inicioX
          let nuevoAncho = anchoInicial + diferencia

          nuevoAncho = Math.max(minimo, Math.min(maximo, nuevoAncho))
          columna.style.setProperty("--ancho-actual", nuevoAncho + "px")
          columna.dataset.ancho = nuevoAncho
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
