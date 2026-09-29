// ============================================================
// CARGA DE ARCHIVOS EXTERNOS
// ============================================================

// Carga todos los templates antes de intentar crear componentes con ellos.
// Devuelve una promesa para poder esperar a que finalicen todos los fetch.
function cargarTemplates(){
  let archivos = [
    "navegacion.html",
    "article.html",
    "usuario.html",
    "fila.html",
    "celda.html",
    "minimizar.html",
    "formulario.html",
    "toast.html"
  ]

  // map convierte cada nombre de archivo en una petición pendiente.
  let cargas = archivos.map(function(archivo){
    return fetch("templates/"+archivo)
    .then(function(resultado){
      return resultado.text()
    })
  })

  // Promise.all continúa cuando todos los templates han terminado de cargar.
  return Promise.all(cargas)
  .then(function(templates){
    // Los templates se guardan ocultos en el documento para poder clonarlos.
    document.querySelector("#templates").innerHTML = templates.join("")
  })
}

// Función común para leer cualquiera de los orígenes de datos JSON.
function cargarJSON(origen){
  return fetch(origen)
  .then(function(resultado){
    return resultado.json()
  })
}

// ============================================================
// FUNCIONES COMUNES PARA LOS COMPONENTES
// ============================================================

// Clona el contenido de un elemento <template> sin modificar el original.
function crearComponente(template){
  let plantilla = document.querySelector(template)
  return plantilla.content.cloneNode(true)
}

// Completa la inicial y el texto compartidos por navegación y artículos.
function completarFicha(elemento,texto){
  elemento.querySelector(".ficha").textContent = texto.charAt(0).toUpperCase()
  elemento.querySelector(".etiqueta").textContent = texto
}

// Añade al final de cada columna su botón para contraerla o restaurarla.
function agregarBotonMinimizar(columna,nombre){
  let clon = crearComponente("#template-minimizar")
  let boton = clon.querySelector("button")
  boton.setAttribute("aria-label","Minimizar "+nombre)
  columna.appendChild(clon)
}

// ============================================================
// GENERACIÓN DE LOS COMPONENTES DESDE JSON Y TEMPLATES
// ============================================================

// Genera los enlaces de la primera columna con menu.json.
function componenteNavegacion(){
  let navegacion = document.querySelector(".navegacion[data-source]")

  // Algunas páginas, como el login, no utilizan las columnas laterales.
  if(!navegacion){
    return Promise.resolve()
  }

  let origen = navegacion.getAttribute("data-source")

  return cargarJSON(origen)
  .then(function(datos){
    datos.forEach(function(dato){
      let clon = crearComponente("#template-navegacion")
      let enlace = clon.querySelector("a")

      enlace.setAttribute("href",dato.url)
      completarFicha(enlace,dato.texto)

      let paginaActual = window.location.pathname.split("/").pop() || "index.html"

      // La página actual manda sobre el estado inicial definido en el JSON.
      if(dato.pagina == paginaActual || (!dato.pagina && dato.activo)){
        enlace.classList.add("activo")
        enlace.setAttribute("aria-current","page")
      }

      navegacion.appendChild(clon)
    })

    agregarBotonMinimizar(navegacion,"navegación")
  })
}

// Genera los artículos de la segunda columna con entidades.json.
function componenteArticulos(){
  let elementos = document.querySelector(".elementos[data-source]")

  if(!elementos){
    return Promise.resolve()
  }

  let origen = elementos.getAttribute("data-source")

  return cargarJSON(origen)
  .then(function(datos){
    datos.forEach(function(dato){
      let clon = crearComponente("#template-article")
      let articulo = clon.querySelector("article")

      completarFicha(articulo,dato.texto)

      if(dato.activo){
        articulo.classList.add("activo")
      }

      elementos.appendChild(clon)
    })

    agregarBotonMinimizar(elementos,"elementos")
  })
}

// Genera los datos del usuario utilizando usuario.json y su template.
function componenteUsuario(){
  let usuario = document.querySelector(".usuario[data-source]")

  if(!usuario){
    return Promise.resolve()
  }

  let origen = usuario.getAttribute("data-source")

  return cargarJSON(origen)
  .then(function(datos){
    let clon = crearComponente("#template-usuario")

    clon.querySelector("p").textContent = datos.nombre
    clon.querySelector("a").setAttribute("href",datos.url)
    usuario.appendChild(clon)
  })
}

// Construye la cabecera y el cuerpo de la tabla a partir de productos.json.
function componenteTabla(){
  let tabla = document.querySelector("table[data-source]")

  if(!tabla){
    return Promise.resolve()
  }

  let origen = tabla.getAttribute("data-source")

  return cargarJSON(origen)
  .then(function(datos){
    // CABECERA: se crea una celda <th> por cada campo definido en el JSON.
    let cabecera = document.createElement("thead")
    let filaCabecera = document.createElement("tr")

    datos.campos.forEach(function(campo){
      let celda = document.createElement("th")
      celda.textContent = campo.etiqueta
      filaCabecera.appendChild(celda)
    })

    cabecera.appendChild(filaCabecera)
    tabla.appendChild(cabecera)

    // CUERPO: cada registro crea una fila clonada desde template-fila.
    let cuerpo = document.createElement("tbody")

    datos.datos.forEach(function(registro){
      let clonFila = crearComponente("#template-fila")
      let fila = clonFila.querySelector("tr")

      datos.campos.forEach(function(campo){
        // Cada valor del registro se introduce en una celda clonada.
        let clonCelda = crearComponente("#template-celda")
        let celda = clonCelda.querySelector("td")
        let valor = registro[campo.nombre]

        // Los booleanos se representan visualmente mediante un checkbox bloqueado.
        if(campo.tipo == "checkbox"){
          let control = document.createElement("input")
          control.setAttribute("type","checkbox")
          control.disabled = true
          control.checked = valor
          celda.appendChild(control)
        }else{
          celda.textContent = valor
        }

        fila.appendChild(clonCelda)
      })

      cuerpo.appendChild(clonFila)
    })

    tabla.appendChild(cuerpo)
  })
}

// ============================================================
// EVENTOS DE LA INTERFAZ
// ============================================================

// Filtra las filas mientras el usuario escribe en el buscador.
function activarBuscador(){
  let buscador = document.querySelector("#buscar")

  if(!buscador){
    return
  }

  buscador.addEventListener("input",function(){
    let busqueda = buscador.value.toLowerCase()
    let filas = document.querySelectorAll("tbody tr")

    filas.forEach(function(fila){
      let texto = fila.textContent.toLowerCase()
      // hidden evita reconstruir la tabla: solo oculta las filas no coincidentes.
      fila.hidden = !texto.includes(busqueda)
    })
  })
}

// Activa la contracción y restauración de las dos columnas laterales.
function activarColumnas(){
  let columnas = document.querySelectorAll("main .navegacion, main .elementos")

  columnas.forEach(function(columna){
    let boton = columna.querySelector(".minimizar")

    // Se recuerda el ancho inicial para recuperarlo después de contraer.
    columna.dataset.ancho = columna.getBoundingClientRect().width

    boton.onclick = function(){
      let vaACompactarse = !columna.classList.contains("compacto")

      if(vaACompactarse){
        // Antes de contraer se guarda el ancho actual, incluido uno redimensionado.
        columna.dataset.ancho = columna.getBoundingClientRect().width
        columna.classList.add("compacto")
        boton.setAttribute("aria-expanded","false")
      }else{
        // Al restaurar se recupera exactamente el ancho guardado anteriormente.
        let anchoAnterior = parseFloat(columna.dataset.ancho)

        if(anchoAnterior){
          columna.style.setProperty("--ancho-actual",anchoAnterior+"px")
        }

        columna.classList.remove("compacto")
        boton.setAttribute("aria-expanded","true")
      }
    }
  })
}

// Permite arrastrar cada separador para cambiar el ancho de su columna izquierda.
function activarSeparadores(){
  let separadores = document.querySelectorAll(".separador")

  separadores.forEach(function(separador){
    separador.onmousedown = function(evento){
      // En móvil las columnas se apilan y los separadores están desactivados.
      if(window.innerWidth <= 850){
        return
      }

      let columna = separador.previousElementSibling

      // Una columna contraída debe restaurarse antes de poder redimensionarla.
      if(columna.classList.contains("compacto")){
        return
      }

      evento.preventDefault()

      let inicioX = evento.clientX
      let anchoInicial = columna.getBoundingClientRect().width
      let minimo = parseFloat(separador.dataset.minimo)
      let maximo = parseFloat(separador.dataset.maximo)
      let principal = separador.parentElement
      let otraColumna

      if(columna.classList.contains("navegacion")){
        otraColumna = principal.querySelector(".elementos")
      }else{
        otraColumna = principal.querySelector(".navegacion")
      }

      let anchoSeparadores = separadores.length*separador.getBoundingClientRect().width

      // El máximo real descuenta la otra columna, ambos separadores y los
      // 320 píxeles mínimos reservados para el escenario principal.
      let anchoMaximoPorEscenario =
        principal.getBoundingClientRect().width-
        otraColumna.getBoundingClientRect().width-
        anchoSeparadores-
        320

      // Se respeta tanto el límite del HTML como el espacio disponible.
      maximo = Math.max(minimo,Math.min(maximo,anchoMaximoPorEscenario))

      columna.classList.add("ajustando-ancho")
      separador.classList.add("arrastrando")
      document.body.classList.add("redimensionando")

      function mover(eventoMovimiento){
        // La diferencia horizontal del ratón se suma al ancho de partida.
        let diferencia = eventoMovimiento.clientX-inicioX
        let nuevoAncho = anchoInicial+diferencia

        // El ancho nunca puede salir de los límites mínimo y máximo calculados.
        nuevoAncho = Math.max(minimo,Math.min(maximo,nuevoAncho))

        columna.style.setProperty("--ancho-actual",nuevoAncho+"px")
        columna.dataset.ancho = nuevoAncho
      }

      function terminar(){
        // Se limpian clases y eventos temporales al soltar el botón del ratón.
        columna.classList.remove("ajustando-ancho")
        separador.classList.remove("arrastrando")
        document.body.classList.remove("redimensionando")

        document.removeEventListener("mousemove",mover)
        document.removeEventListener("mouseup",terminar)
      }

      document.addEventListener("mousemove",mover)
      document.addEventListener("mouseup",terminar)
    }
  })
}

// ============================================================
// INICIALIZACIÓN
// ============================================================

// El orden es importante: primero se cargan los templates, después se crean
// los componentes y, cuando ya existen en el DOM, se conectan sus eventos.
function iniciarComponentes(){
  cargarTemplates()
  .then(function(){
    // Estos cuatro componentes son independientes y pueden generarse en paralelo.
    return Promise.all([
      componenteNavegacion(),
      componenteArticulos(),
      componenteUsuario(),
      componenteTabla()
    ])
  })
  .then(function(){
    activarBuscador()
    activarColumnas()
    activarSeparadores()

    // Las mejoras esperan este evento para utilizar los templates ya cargados.
    document.dispatchEvent(new CustomEvent("componentesListos"))
  })
  // Cualquier fallo de carga queda visible en la consola del navegador.
  .catch(function(error){
    console.error("No se ha podido iniciar la interfaz",error)
  })
}

// Se inicia el proyecto cuando la estructura inicial del HTML está disponible.
document.addEventListener("DOMContentLoaded",iniciarComponentes)
