// ============================================================
// CARGA DE TEMPLATES EXTERNOS
// ============================================================

function cargarTemplates(){
  let archivos = [
    "navegacion.html",
    "article.html",
    "herramienta.html",
    "usuario.html",
    "fila.html",
    "celda.html"
  ]

  let cargas = archivos.map(function(archivo){
    return fetch("templates/"+archivo)
    .then(function(resultado){
      return resultado.text()
    })
  })

  return Promise.all(cargas)
  .then(function(templates){
    document.querySelector("#templates").innerHTML = templates.join("")
  })
}

// ============================================================
// FUNCIÓN COMÚN PARA CREAR COMPONENTES
// ============================================================

function crearComponente(template){
  let plantilla = document.querySelector(template)
  return plantilla.content.cloneNode(true)
}

// ============================================================
// COMPONENTE NAVEGACIÓN
// ============================================================

function componenteNavegacion(){
  let navegaciones = document.querySelectorAll("nav[data-source]")

  navegaciones.forEach(function(navegacion){
    let origen = navegacion.getAttribute("data-source")

    fetch(origen)
    .then(function(resultado){
      return resultado.json()
    })
    .then(function(datos){
      datos.forEach(function(dato){
        let clon = crearComponente("#template-nav")
        let enlace = clon.querySelector("a")

        enlace.setAttribute("href",dato.url)
        enlace.querySelector(".texto").textContent = dato.texto

        if(dato.activo){
          enlace.classList.add("activo")
          enlace.setAttribute("aria-current","page")
        }

        navegacion.appendChild(clon)
      })
    })
  })
}

// ============================================================
// COMPONENTE ARTICLE
// ============================================================

function componenteArticulos(){
  let secciones = document.querySelectorAll("section[data-source]")

  secciones.forEach(function(seccion){
    let origen = seccion.getAttribute("data-source")

    fetch(origen)
    .then(function(resultado){
      return resultado.json()
    })
    .then(function(datos){
      datos.forEach(function(dato){
        let clon = crearComponente("#template-article")
        let articulo = clon.querySelector("article")

        articulo.querySelector(".texto").textContent = dato.texto

        if(dato.activo){
          articulo.classList.add("activo")
        }

        seccion.appendChild(clon)
      })
    })
  })
}

// ============================================================
// COMPONENTE HERRAMIENTAS
// ============================================================

function componenteHerramientas(datos){
  let herramientas = document.querySelector(".herramientas")

  datos.forEach(function(dato){
    let clon = crearComponente("#template-herramienta")

    clon.querySelector(".texto").textContent = dato.texto
    herramientas.appendChild(clon)
  })
}

// ============================================================
// COMPONENTE USUARIO
// ============================================================

function componenteUsuario(datos){
  let usuario = document.querySelector(".usuario")
  let clon = crearComponente("#template-usuario")

  clon.querySelector("p").textContent = datos.nombre
  usuario.appendChild(clon)
}

// ============================================================
// COMPONENTE TABLAS
// ============================================================

function componenteTablas(){
  let tablas = document.querySelectorAll("table[data-source]")

  tablas.forEach(function(tabla){
    let origen = tabla.getAttribute("data-source")

    fetch(origen)
    .then(function(resultado){
      return resultado.json()
    })
    .then(function(datos){
      let caption = document.createElement("caption")
      caption.textContent = datos.titulo
      tabla.appendChild(caption)

      // CABECERA
      let thead = document.createElement("thead")
      let filaCabecera = document.createElement("tr")

      datos.columnas.forEach(function(columna){
        let th = document.createElement("th")

        th.setAttribute("scope","col")
        th.textContent = columna.etiqueta
        filaCabecera.appendChild(th)
      })

      thead.appendChild(filaCabecera)
      tabla.appendChild(thead)

      // CUERPO
      let tbody = document.createElement("tbody")

      datos.registros.forEach(function(registro){
        let clonFila = crearComponente("#template-fila")
        let fila = clonFila.querySelector("tr")

        datos.columnas.forEach(function(columna){
          let clonCelda = crearComponente("#template-celda")
          let celda = clonCelda.querySelector("td")

          celda.textContent = registro[columna.campo]
          fila.appendChild(clonCelda)
        })

        tbody.appendChild(clonFila)
      })

      tabla.appendChild(tbody)
    })
  })
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

function iniciarComponentes(){
  cargarTemplates()
  .then(function(){
    componenteNavegacion()
    componenteArticulos()
    componenteTablas()

    componenteHerramientas([
      {
        texto:"Buscar"
      },
      {
        texto:"Nuevo"
      },
      {
        texto:"Configuración"
      }
    ])

    componenteUsuario({
      nombre:"Piero Olivares"
    })
  })
}

document.addEventListener("DOMContentLoaded", iniciarComponentes)
