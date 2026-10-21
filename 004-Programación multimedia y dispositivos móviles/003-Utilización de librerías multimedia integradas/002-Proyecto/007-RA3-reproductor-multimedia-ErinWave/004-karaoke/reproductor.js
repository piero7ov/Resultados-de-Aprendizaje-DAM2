let reproductor = document.querySelector(".reproductor")
let grupoIdiomas = document.querySelector(".idiomas")
let idiomaEs = document.querySelector("#idiomaEs")
let idiomaEn = document.querySelector("#idiomaEn")
let panelControles = document.querySelector("#panelControles")
let audio = document.querySelector("#audio")
let estado = document.querySelector("#estado")
let tituloPista = document.querySelector("#tituloPista")
let artistaPista = document.querySelector("#artistaPista")
let tituloBiblioteca = document.querySelector("#tituloBiblioteca")
let contadorBiblioteca = document.querySelector("#contadorBiblioteca")
let anadirCancion = document.querySelector("#anadirCancion")
let selectorAudio = document.querySelector("#selectorAudio")
let busqueda = document.querySelector("#busqueda")
let listaCanciones = document.querySelector("#listaCanciones")
let tituloCola = document.querySelector("#tituloCola")
let vaciarCola = document.querySelector("#vaciarCola")
let listaCola = document.querySelector("#listaCola")
let distribucion = document.querySelector(".distribucion")
let botonMinimizarCola = document.querySelector("#botonMinimizarCola")
let reproducir = document.querySelector("#reproducir")
let anterior = document.querySelector("#anterior")
let siguiente = document.querySelector("#siguiente")
let aleatorio = document.querySelector("#aleatorio")
let repetir = document.querySelector("#repetir")
let progreso = document.querySelector("#progreso")
let tiempoActual = document.querySelector("#tiempoActual")
let duracion = document.querySelector("#duracion")
let etiquetaVolumen = document.querySelector("#etiquetaVolumen")
let volumen = document.querySelector("#volumen")
let valorVolumen = document.querySelector("#valorVolumen")
let botonKaraoke = document.querySelector("#botonKaraoke")
let brilloKaraoke = document.querySelector("#brilloKaraoke")
let cargaKaraoke = document.querySelector("#cargaKaraoke")
let panelKaraoke = document.querySelector("#panelKaraoke")
let tituloPanelKaraoke = document.querySelector("#tituloPanelKaraoke")
let estadoKaraoke = document.querySelector("#estadoKaraoke")
let mensajeKaraoke = document.querySelector("#mensajeKaraoke")
let letrasKaraoke = document.querySelector("#letrasKaraoke")
let lineaAnterior = document.querySelector("#lineaAnterior")
let lineaActual = document.querySelector("#lineaActual")
let lineaSiguiente = document.querySelector("#lineaSiguiente")
let panelPruebaKaraoke = document.querySelector("#panelPruebaKaraoke")
let tituloPruebaKaraoke = document.querySelector("#tituloPruebaKaraoke")
let tiempoPruebaKaraoke = document.querySelector("#tiempoPruebaKaraoke")
let fasePruebaKaraoke = document.querySelector("#fasePruebaKaraoke")
let porcentajePruebaKaraoke = document.querySelector("#porcentajePruebaKaraoke")
let barraPruebaKaraoke = document.querySelector("#barraPruebaKaraoke")
let progresoPruebaKaraoke = document.querySelector("#progresoPruebaKaraoke")
let detallePruebaKaraoke = document.querySelector("#detallePruebaKaraoke")

// Panel provisional para comprobar Whisper. Cambiar a false cuando terminen las pruebas.
const MOSTRAR_PANEL_PRUEBAS_KARAOKE = true

let traducciones = {
  es:{
    tituloDocumento:"ERINWAVE · Karaoke",
    etiquetaReproductor:"Reproductor ERINWAVE",
    grupoIdiomas:"Idioma de la interfaz",
    cambiarEs:"Cambiar la interfaz a español",
    cambiarEn:"Cambiar la interfaz a inglés",
    controles:"Controles del reproductor",
    buscando:"Preparando tu música",
    sinCanciones:"Tu biblioteca está vacía",
    anadeMp3:"Añade canciones para empezar",
    biblioteca:"Biblioteca",
    anadirCancion:"Añadir canción",
    subiendoCancion:"Añadiendo canción",
    cancionAnadida:"Canción añadida",
    archivoDuplicado:"La canción ya existe",
    audioNoValido:"El archivo no es un MP3 válido",
    subidaFallida:"No se pudo añadir la canción",
    buscar:"Buscar canción o artista",
    sinResultados:"No hay resultados para esta búsqueda",
    cola:"Cola",
    vaciar:"Vaciar",
    minimizarCola:"Minimizar cola",
    abrirCola:"Abrir cola",
    colaVacia:"Tu cola está vacía",
    artistaDesconocido:"Artista desconocido",
    anadirCola:"Añadir a la cola",
    quitarCola:"Quitar de la cola",
    anterior:"Canción anterior",
    siguiente:"Canción siguiente",
    reproducir:"Reproducir",
    pausar:"Pausar",
    progreso:"Posición de reproducción",
    volumen:"Volumen",
    aleatorioActivado:"Orden aleatorio activado",
    aleatorioDesactivado:"Orden aleatorio desactivado",
    repetirDesactivado:"Repetición desactivada",
    repetirTodo:"Repetir toda la biblioteca",
    repetirUna:"Repetir la canción actual",
    karaokeGenerar:"Generar karaoke",
    karaokeAbrir:"Mostrar karaoke",
    karaokeOcultar:"Ocultar karaoke",
    karaokeGenerando:"Generando karaoke",
    karaokeDisponible:"Karaoke disponible",
    karaoke:"Karaoke",
    karaokeSinLetra:"Sin letra",
    karaokePulsa:"Pulsa el micrófono para preparar el karaoke",
    karaokeCargando:"Cargando letra",
    karaokeRevision:"Automático · revisar",
    karaokeError:"No se pudo preparar el karaoke",
    karaokeEnCurso:"Ya hay un karaoke preparándose",
    karaokeNoDisponible:"El generador no está disponible",
    karaokeModeloNoDisponible:"Falta el modelo necesario de Whisper",
    servidorNoDisponible:"Servidor detenido",
    generacionInterrumpida:"La generación se interrumpió",
    pruebaKaraoke:"Diagnóstico temporal · karaoke",
    pruebaPreparando:"Preparando la conversión",
    pruebaModelo:"Cargando Whisper",
    pruebaTranscribiendo:"Reconociendo la letra",
    pruebaCorrigiendo:"Comparando con la letra revisada",
    pruebaGuardando:"Guardando el VTT",
    pruebaCompletado:"Karaoke preparado",
    pruebaError:"La generación se ha detenido",
    prepararKaraoke:"Preparar karaoke",
    elegirIdiomaKaraoke:"Elige el idioma de la canción. La opción automática intentará detectarlo. Puede tardar unos minutos.",
    cerrar:"Cerrar",
    automatico:"Automático",
    espanol:"Español",
    ingles:"English",
    lineaAnterior:"Frase anterior",
    lineaActual:"Frase actual",
    lineaSiguiente:"Frase siguiente",
    lineasAlineadas:"líneas alineadas",
    tiemposEstimados:"con tiempo estimado",
    lineasPendientes:"pendientes de ubicar",
    carpetaVacia:"Sin canciones",
    cargandoPista:"Cargando canción",
    errorBiblioteca:"No se pudo abrir la biblioteca",
    sinSeleccion:"Elige una canción",
    noReproducir:"No se pudo reproducir",
    preparado:"Preparado",
    reproduciendo:"Reproduciendo",
    enPausa:"En pausa",
    finalizada:"Canción finalizada",
    cargandoAudio:"Cargando audio",
    errorPista:"No se pudo cargar la canción"
  },
  en:{
    tituloDocumento:"ERINWAVE · Karaoke",
    etiquetaReproductor:"ERINWAVE player",
    grupoIdiomas:"Interface language",
    cambiarEs:"Switch the interface to Spanish",
    cambiarEn:"Switch the interface to English",
    controles:"Player controls",
    buscando:"Getting your music ready",
    sinCanciones:"Your library is empty",
    anadeMp3:"Add songs to get started",
    biblioteca:"Library",
    anadirCancion:"Add song",
    subiendoCancion:"Adding song",
    cancionAnadida:"Song added",
    archivoDuplicado:"The song already exists",
    audioNoValido:"The file is not a valid MP3",
    subidaFallida:"The song could not be added",
    buscar:"Search by song or artist",
    sinResultados:"No results for this search",
    cola:"Queue",
    vaciar:"Clear",
    minimizarCola:"Minimise queue",
    abrirCola:"Open queue",
    colaVacia:"Your queue is empty",
    artistaDesconocido:"Unknown artist",
    anadirCola:"Add to queue",
    quitarCola:"Remove from queue",
    anterior:"Previous song",
    siguiente:"Next song",
    reproducir:"Play",
    pausar:"Pause",
    progreso:"Playback position",
    volumen:"Volume",
    aleatorioActivado:"Shuffle on",
    aleatorioDesactivado:"Shuffle off",
    repetirDesactivado:"Repeat off",
    repetirTodo:"Repeat the whole library",
    repetirUna:"Repeat the current song",
    karaokeGenerar:"Generate karaoke",
    karaokeAbrir:"Show karaoke",
    karaokeOcultar:"Hide karaoke",
    karaokeGenerando:"Generating karaoke",
    karaokeDisponible:"Karaoke available",
    karaoke:"Karaoke",
    karaokeSinLetra:"No lyrics",
    karaokePulsa:"Press the microphone to prepare karaoke",
    karaokeCargando:"Loading lyrics",
    karaokeRevision:"Automatic · review",
    karaokeError:"Karaoke could not be prepared",
    karaokeEnCurso:"Another karaoke is already being prepared",
    karaokeNoDisponible:"The generator is not available",
    karaokeModeloNoDisponible:"The required Whisper model is missing",
    servidorNoDisponible:"Server stopped",
    generacionInterrumpida:"Generation was interrupted",
    pruebaKaraoke:"Temporary diagnostics · karaoke",
    pruebaPreparando:"Preparing conversion",
    pruebaModelo:"Loading Whisper",
    pruebaTranscribiendo:"Recognising the lyrics",
    pruebaCorrigiendo:"Comparing with the reviewed lyrics",
    pruebaGuardando:"Saving the VTT",
    pruebaCompletado:"Karaoke ready",
    pruebaError:"Generation has stopped",
    prepararKaraoke:"Prepare karaoke",
    elegirIdiomaKaraoke:"Choose the song language. Automatic mode will try to detect it. This may take a few minutes.",
    cerrar:"Close",
    automatico:"Automatic",
    espanol:"Español",
    ingles:"English",
    lineaAnterior:"Previous phrase",
    lineaActual:"Current phrase",
    lineaSiguiente:"Next phrase",
    lineasAlineadas:"lines aligned",
    tiemposEstimados:"with estimated timing",
    lineasPendientes:"pending placement",
    carpetaVacia:"No songs",
    cargandoPista:"Loading song",
    errorBiblioteca:"The library could not be opened",
    sinSeleccion:"Choose a song",
    noReproducir:"Playback failed",
    preparado:"Ready",
    reproduciendo:"Playing",
    enPausa:"Paused",
    finalizada:"Song finished",
    cargandoAudio:"Loading audio",
    errorPista:"The song could not be loaded"
  }
}

let iconoReproducir = "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M8 5.5 18 12 8 18.5Z' fill='currentColor'/></svg>"
let iconoPausar = "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='6' y='5' width='4' height='14' rx='1' fill='currentColor'/><rect x='14' y='5' width='4' height='14' rx='1' fill='currentColor'/></svg>"
let biblioteca = []
let cola = []
let archivoActual = ""
let firmaBiblioteca = ""
let consultandoBiblioteca = false
let idiomaActual = "es"
let claveEstado = "buscando"
let estadoEsError = false
let aleatorioActivo = false
let modoRepeticion = "ninguno"
let reproduccionPendiente = false
let frasesKaraoke = []
let indiceKaraoke = -1
let archivoKaraoke = ""
let generandoKaraoke = false
let archivoGenerando = ""
let inicioPruebaKaraoke = 0
let relojPruebaKaraoke = null
let fasePruebaActual = "pruebaPreparando"
let modeloPruebaActual = "small"
let colaMinimizada = true
let archivoTrabajoComprobado = ""

try{
  let idiomaGuardado = localStorage.getItem("erinwave-idioma")

  if(idiomaGuardado === "es" || idiomaGuardado === "en"){
    idiomaActual = idiomaGuardado
  }
}catch(error){
  console.warn("No se pudo leer la preferencia de idioma",error)
}

audio.volume = Number(volumen.value)

function traducir(clave){
  return traducciones[idiomaActual][clave]
}

function cambiarEstado(clave,esError){
  claveEstado = clave
  estadoEsError = Boolean(esError)
  estado.textContent = traducir(clave)
  estado.classList.toggle("error",estadoEsError)
}

function formatearTiempo(segundos){
  if(!Number.isFinite(segundos)){
    return "0:00"
  }

  let minutos = Math.floor(segundos / 60)
  let resto = Math.floor(segundos % 60)

  if(resto < 10){
    resto = "0" + resto
  }

  return minutos + ":" + resto
}

function actualizarRelojPruebaKaraoke(){
  if(inicioPruebaKaraoke === 0){
    tiempoPruebaKaraoke.textContent = "0:00"
    return
  }

  tiempoPruebaKaraoke.textContent = formatearTiempo((Date.now() - inicioPruebaKaraoke) / 1000)
}

function mostrarPanelPruebaKaraoke(pista){
  if(!MOSTRAR_PANEL_PRUEBAS_KARAOKE){
    return
  }

  inicioPruebaKaraoke = Date.now()
  modeloPruebaActual = "small"
  fasePruebaActual = "pruebaPreparando"
  tituloPruebaKaraoke.textContent = traducir("pruebaKaraoke")
  fasePruebaKaraoke.textContent = traducir(fasePruebaActual)
  porcentajePruebaKaraoke.textContent = "—"
  progresoPruebaKaraoke.style.removeProperty("width")
  barraPruebaKaraoke.classList.add("indeterminada")
  detallePruebaKaraoke.textContent = modeloPruebaActual + " · CPU · " + obtenerTitulo(pista)
  panelPruebaKaraoke.classList.remove("oculto")
  actualizarRelojPruebaKaraoke()
  clearInterval(relojPruebaKaraoke)
  relojPruebaKaraoke = setInterval(actualizarRelojPruebaKaraoke,1000)
}

function actualizarPanelPruebaKaraoke(evento){
  if(!MOSTRAR_PANEL_PRUEBAS_KARAOKE){
    return
  }

  if(evento.modelo){
    modeloPruebaActual = evento.modelo
    let partesDetalle = detallePruebaKaraoke.textContent.split(" · CPU · ")

    if(partesDetalle.length > 1){
      detallePruebaKaraoke.textContent = modeloPruebaActual + " · CPU · " + partesDetalle.slice(1).join(" · CPU · ")
    }
  }

  let fases = {
    iniciando:"pruebaModelo",
    transcribiendo:"pruebaTranscribiendo",
    corrigiendo:"pruebaCorrigiendo",
    guardando:"pruebaGuardando",
    completado:"pruebaCompletado",
    error:"pruebaError"
  }

  if(fases[evento.fase]){
    fasePruebaActual = fases[evento.fase]
    fasePruebaKaraoke.textContent = traducir(fasePruebaActual)
  }

  if(Number.isFinite(evento.porcentaje)){
    let porcentaje = Math.max(0,Math.min(100,Math.round(evento.porcentaje)))

    if(porcentaje > 0 || evento.fase === "guardando" || evento.fase === "completado"){
      barraPruebaKaraoke.classList.remove("indeterminada")
      porcentajePruebaKaraoke.textContent = porcentaje + "%"
      progresoPruebaKaraoke.style.width = porcentaje + "%"
    }
  }

  if(evento.fase === "error"){
    barraPruebaKaraoke.classList.remove("indeterminada")
    porcentajePruebaKaraoke.textContent = "—"
    progresoPruebaKaraoke.style.width = "0%"
  }

  if(evento.idiomaDetectado){
    detallePruebaKaraoke.textContent = modeloPruebaActual + " · CPU · " + evento.idiomaDetectado
  }

  if(evento.alineacion && evento.alineacion.lineasLetra > 0){
    detallePruebaKaraoke.textContent = modeloPruebaActual + " · CPU · "
      + (evento.alineacion.lineasMostradas ?? evento.alineacion.coincidencias) + "/" + evento.alineacion.lineasLetra
      + " " + traducir("lineasAlineadas")
      + " · " + (evento.alineacion.lineasEstimadas ?? 0) + " " + traducir("tiemposEstimados")
      + " · " + (evento.alineacion.lineasPendientes ?? 0) + " " + traducir("lineasPendientes")
  }

  actualizarRelojPruebaKaraoke()
}

function cerrarPanelPruebaKaraoke(generado){
  clearInterval(relojPruebaKaraoke)
  relojPruebaKaraoke = null
  inicioPruebaKaraoke = 0

  if(!MOSTRAR_PANEL_PRUEBAS_KARAOKE){
    panelPruebaKaraoke.classList.add("oculto")
    return
  }

  let retraso = generado ? 1200 : 6000

  setTimeout(function(){
    if(!generandoKaraoke){
      panelPruebaKaraoke.classList.add("oculto")
    }
  },retraso)
}

function ocultarPanelKaraoke(){
  panelKaraoke.classList.add("cerrado")
  panelKaraoke.setAttribute("aria-hidden","true")
  botonKaraoke.setAttribute("aria-expanded","false")
}

function mostrarPanelKaraoke(){
  if(frasesKaraoke.length === 0){
    return
  }

  panelKaraoke.classList.remove("cerrado")
  panelKaraoke.setAttribute("aria-hidden","false")
  botonKaraoke.setAttribute("aria-expanded","true")
}

function actualizarEstadoCola(){
  distribucion.classList.toggle("cola-minimizada",colaMinimizada)
  botonMinimizarCola.setAttribute("aria-expanded",String(!colaMinimizada))
  let etiqueta = traducir(colaMinimizada ? "abrirCola" : "minimizarCola")
  botonMinimizarCola.title = etiqueta
  botonMinimizarCola.setAttribute("aria-label",etiqueta)
}

function obtenerPistaActual(){
  return biblioteca.find(function(pista){
    return pista.archivo === archivoActual
  })
}

function buscarPista(archivo){
  return biblioteca.find(function(pista){
    return pista.archivo === archivo
  })
}

function humanizarTexto(texto){
  let resultado = String(texto || "")
    .replace(/_+/g," ")
    .replace(/\s+/g," ")
    .trim()

  if(resultado === ""){
    return ""
  }

  return resultado.charAt(0).toLocaleUpperCase(idiomaActual) + resultado.slice(1)
}

function obtenerTitulo(pista){
  return humanizarTexto(pista.titulo)
}

function obtenerArtista(pista){
  return pista.artista ? humanizarTexto(pista.artista) : traducir("artistaDesconocido")
}

function crearDatosCancion(pista){
  let boton = document.createElement("button")
  let nombre = document.createElement("span")
  let artista = document.createElement("span")

  boton.className = "datos-cancion"
  boton.type = "button"
  nombre.className = "nombre-cancion"
  artista.className = "artista-cancion"
  nombre.textContent = obtenerTitulo(pista)
  artista.textContent = obtenerArtista(pista)
  boton.append(nombre,artista)

  return boton
}

function actualizarInformacionPista(){
  let pista = obtenerPistaActual()

  if(!pista){
    tituloPista.textContent = traducir("sinCanciones")
    artistaPista.textContent = traducir("anadeMp3")
    return
  }

  tituloPista.textContent = obtenerTitulo(pista)
  artistaPista.textContent = obtenerArtista(pista)
}

function actualizarBotonKaraoke(pista){
  let tieneKaraoke = Boolean(pista && pista.tieneKaraoke)
  let etiqueta = traducir("karaokeGenerar")

  if(generandoKaraoke){
    etiqueta = traducir("karaokeGenerando")
  }else if(tieneKaraoke){
    etiqueta = panelKaraoke.classList.contains("cerrado")
      ? traducir("karaokeAbrir")
      : traducir("karaokeOcultar")
  }

  botonKaraoke.disabled = !pista || generandoKaraoke
  botonKaraoke.classList.toggle("generando",generandoKaraoke)
  brilloKaraoke.classList.toggle("oculto",!pista || tieneKaraoke || generandoKaraoke)
  cargaKaraoke.classList.toggle("oculto",!generandoKaraoke)
  botonKaraoke.title = etiqueta
  botonKaraoke.setAttribute("aria-label",etiqueta)
  botonKaraoke.setAttribute("aria-expanded",String(tieneKaraoke && !panelKaraoke.classList.contains("cerrado")))
  anadirCancion.disabled = generandoKaraoke
}

function mostrarMensajeKaraoke(claveEstado,claveMensaje){
  estadoKaraoke.textContent = traducir(claveEstado)
  mensajeKaraoke.textContent = traducir(claveMensaje)
  mensajeKaraoke.classList.remove("oculto")
  letrasKaraoke.classList.add("oculto")
}

function convertirMarcaTiempo(marca){
  let partes = marca.replace(",",".").split(":").map(Number)

  if(partes.length === 3){
    return partes[0] * 3600 + partes[1] * 60 + partes[2]
  }

  if(partes.length === 2){
    return partes[0] * 60 + partes[1]
  }

  return Number.NaN
}

function analizarVtt(contenido){
  let texto = contenido.replace(/^\uFEFF/,"").replace(/\r/g,"")

  if(!texto.startsWith("WEBVTT")){
    throw new Error("El archivo no es WebVTT")
  }

  return texto.split(/\n{2,}/).flatMap(function(bloque){
    let lineas = bloque.split("\n")
    let indiceTiempo = lineas.findIndex(function(linea){
      return linea.includes("-->")
    })

    if(indiceTiempo === -1){
      return []
    }

    let marcas = lineas[indiceTiempo].split("-->")
    let inicio = convertirMarcaTiempo(marcas[0].trim())
    let fin = convertirMarcaTiempo(marcas[1].trim().split(/\s+/)[0])
    let textoFrase = lineas.slice(indiceTiempo + 1).join(" ").replace(/<[^>]+>/g,"").trim()

    if(!Number.isFinite(inicio) || !Number.isFinite(fin) || textoFrase === ""){
      return []
    }

    return [{inicio:inicio,fin:fin,texto:textoFrase}]
  })
}

function colocarFrase(elemento,indice){
  let frase = frasesKaraoke[indice]
  elemento.textContent = frase ? frase.texto : ""
  elemento.dataset.indice = frase ? String(indice) : ""
  elemento.disabled = !frase
}


function actualizarLineasKaraoke(){
  if(frasesKaraoke.length === 0){
    return
  }

  let nuevoIndice = 0

  for(let indice = 0; indice < frasesKaraoke.length; indice += 1){
    if(frasesKaraoke[indice].inicio <= audio.currentTime + 0.05){
      nuevoIndice = indice
    }else{
      break
    }
  }

  if(nuevoIndice === indiceKaraoke){
    return
  }

  indiceKaraoke = nuevoIndice
  colocarFrase(lineaAnterior,indiceKaraoke - 1)
  colocarFrase(lineaActual,indiceKaraoke)
  colocarFrase(lineaSiguiente,indiceKaraoke + 1)
}

async function cargarKaraoke(pista,abrirAlCargar){
  frasesKaraoke = []
  indiceKaraoke = -1
  archivoKaraoke = pista ? pista.archivo : ""
  ocultarPanelKaraoke()

  if(!pista || !pista.tieneKaraoke || !pista.urlKaraoke){
    return
  }

  mostrarMensajeKaraoke("karaokeCargando","karaokeCargando")
  let archivoSolicitado = pista.archivo

  try{
    let respuesta = await fetch(pista.urlKaraoke + "?momento=" + Date.now())

    if(!respuesta.ok){
      throw new Error("No se pudo abrir el karaoke")
    }

    let frases = analizarVtt(await respuesta.text())

    if(frases.length === 0){
      throw new Error("El karaoke no contiene frases")
    }

    if(archivoActual !== archivoSolicitado){
      return
    }

    frasesKaraoke = frases
    archivoKaraoke = archivoSolicitado
    mensajeKaraoke.classList.add("oculto")
    letrasKaraoke.classList.remove("oculto")
    estadoKaraoke.textContent = traducir("karaokeRevision")
    actualizarLineasKaraoke()

    if(abrirAlCargar){
      mostrarPanelKaraoke()
    }
  }catch(error){
    ocultarPanelKaraoke()
    console.error(error)
  }
}

function dibujarBiblioteca(){
  let textoBuscado = busqueda.value.trim().toLocaleLowerCase(idiomaActual)
  let cancionesVisibles = biblioteca.filter(function(pista){
    let datos = (obtenerTitulo(pista) + " " + obtenerArtista(pista)).toLocaleLowerCase(idiomaActual)
    return datos.includes(textoBuscado)
  })

  listaCanciones.innerHTML = ""
  contadorBiblioteca.textContent = biblioteca.length

  if(cancionesVisibles.length === 0){
    let mensaje = document.createElement("li")
    mensaje.className = "mensaje-lista"
    mensaje.textContent = biblioteca.length === 0 ? traducir("sinCanciones") : traducir("sinResultados")
    listaCanciones.appendChild(mensaje)
    return
  }

  cancionesVisibles.forEach(function(pista){
    let posicion = biblioteca.indexOf(pista) + 1
    let fila = document.createElement("li")
    let numero = document.createElement("span")
    let datos = crearDatosCancion(pista)
    let tiempo = document.createElement("span")
    let anadir = document.createElement("button")

    fila.className = "fila-cancion"
    fila.classList.toggle("seleccionada",pista.archivo === archivoActual)
    numero.className = "numero-cancion"
    numero.textContent = String(posicion).padStart(2,"0")
    tiempo.className = "duracion-cancion"
    tiempo.textContent = Number.isFinite(pista.duracion) ? formatearTiempo(pista.duracion) : "--:--"
    anadir.className = "boton-lista"
    anadir.type = "button"
    anadir.textContent = "+"
    anadir.title = traducir("anadirCola")
    anadir.setAttribute("aria-label",traducir("anadirCola") + ": " + obtenerTitulo(pista))

    datos.onclick = function(){
      cargarPista(pista,false)
    }

    datos.ondblclick = function(){
      cargarPista(pista,true)
    }

    anadir.onclick = function(){
      cola.push(pista.archivo)
      dibujarCola()
    }

    fila.append(numero,datos,tiempo,anadir)
    listaCanciones.appendChild(fila)
  })
}

function dibujarCola(){
  listaCola.innerHTML = ""
  vaciarCola.disabled = cola.length === 0

  if(cola.length === 0){
    let mensaje = document.createElement("li")
    mensaje.className = "mensaje-lista"
    mensaje.textContent = traducir("colaVacia")
    listaCola.appendChild(mensaje)
    return
  }

  cola.forEach(function(archivo,indice){
    let pista = buscarPista(archivo)

    if(!pista){
      return
    }

    let fila = document.createElement("li")
    let numero = document.createElement("span")
    let datos = crearDatosCancion(pista)
    let quitar = document.createElement("button")

    fila.className = "fila-cola"
    numero.className = "numero-cancion"
    numero.textContent = String(indice + 1).padStart(2,"0")
    quitar.className = "boton-lista"
    quitar.type = "button"
    quitar.textContent = "×"
    quitar.title = traducir("quitarCola")
    quitar.setAttribute("aria-label",traducir("quitarCola") + ": " + obtenerTitulo(pista))

    datos.onclick = function(){
      cola.splice(indice,1)
      dibujarCola()
      cargarPista(pista,true)
    }

    quitar.onclick = function(){
      cola.splice(indice,1)
      dibujarCola()
    }

    fila.append(numero,datos,quitar)
    listaCola.appendChild(fila)
  })
}

function actualizarModos(){
  let claveAleatorio = aleatorioActivo ? "aleatorioActivado" : "aleatorioDesactivado"
  let claveRepeticion = "repetirDesactivado"

  if(modoRepeticion === "todo"){
    claveRepeticion = "repetirTodo"
  }else if(modoRepeticion === "una"){
    claveRepeticion = "repetirUna"
  }

  aleatorio.classList.toggle("activo",aleatorioActivo)
  aleatorio.setAttribute("aria-pressed",String(aleatorioActivo))
  aleatorio.title = traducir(claveAleatorio)
  aleatorio.setAttribute("aria-label",traducir(claveAleatorio))
  repetir.classList.toggle("activo",modoRepeticion !== "ninguno")
  repetir.setAttribute("aria-pressed",String(modoRepeticion !== "ninguno"))
  repetir.textContent = modoRepeticion === "una" ? "↻¹" : "↻"
  repetir.title = traducir(claveRepeticion)
  repetir.setAttribute("aria-label",traducir(claveRepeticion))
}

function aplicarIdioma(){
  document.documentElement.lang = idiomaActual
  document.title = traducir("tituloDocumento")
  reproductor.setAttribute("aria-label",traducir("etiquetaReproductor"))
  grupoIdiomas.setAttribute("aria-label",traducir("grupoIdiomas"))
  idiomaEs.title = traducir("cambiarEs")
  idiomaEs.setAttribute("aria-label",traducir("cambiarEs"))
  idiomaEn.title = traducir("cambiarEn")
  idiomaEn.setAttribute("aria-label",traducir("cambiarEn"))
  idiomaEs.classList.toggle("activo",idiomaActual === "es")
  idiomaEn.classList.toggle("activo",idiomaActual === "en")
  idiomaEs.setAttribute("aria-pressed",String(idiomaActual === "es"))
  idiomaEn.setAttribute("aria-pressed",String(idiomaActual === "en"))
  panelControles.setAttribute("aria-label",traducir("controles"))
  tituloBiblioteca.textContent = traducir("biblioteca")
  anadirCancion.title = traducir("anadirCancion")
  anadirCancion.setAttribute("aria-label",traducir("anadirCancion"))
  busqueda.placeholder = traducir("buscar")
  busqueda.setAttribute("aria-label",traducir("buscar"))
  tituloCola.textContent = traducir("cola")
  vaciarCola.textContent = traducir("vaciar")
  vaciarCola.title = traducir("vaciar")
  actualizarEstadoCola()
  progreso.setAttribute("aria-label",traducir("progreso"))
  etiquetaVolumen.textContent = traducir("volumen")
  volumen.setAttribute("aria-label",traducir("volumen"))
  anterior.title = traducir("anterior")
  anterior.setAttribute("aria-label",traducir("anterior"))
  siguiente.title = traducir("siguiente")
  siguiente.setAttribute("aria-label",traducir("siguiente"))
  reproducir.title = audio.paused ? traducir("reproducir") : traducir("pausar")
  reproducir.setAttribute("aria-label",reproducir.title)
  tituloPanelKaraoke.textContent = traducir("karaoke")
  tituloPruebaKaraoke.textContent = traducir("pruebaKaraoke")
  fasePruebaKaraoke.textContent = traducir(fasePruebaActual)
  lineaAnterior.setAttribute("aria-label",traducir("lineaAnterior"))
  lineaActual.setAttribute("aria-label",traducir("lineaActual"))
  lineaSiguiente.setAttribute("aria-label",traducir("lineaSiguiente"))
  estado.textContent = traducir(claveEstado)
  estado.classList.toggle("error",estadoEsError)

  if(frasesKaraoke.length > 0){
    estadoKaraoke.textContent = traducir("karaokeRevision")
  }

  actualizarModos()
  dibujarBiblioteca()
  dibujarCola()
  actualizarInformacionPista()
  actualizarBotonKaraoke(obtenerPistaActual())
}

function cambiarIdioma(nuevoIdioma){
  if(nuevoIdioma !== "es" && nuevoIdioma !== "en"){
    return
  }

  idiomaActual = nuevoIdioma

  try{
    localStorage.setItem("erinwave-idioma",idiomaActual)
  }catch(error){
    console.warn("No se pudo guardar la preferencia de idioma",error)
  }

  aplicarIdioma()
}

function vaciarReproductor(){
  reproduccionPendiente = false
  audio.pause()
  audio.removeAttribute("src")
  audio.load()
  archivoActual = ""
  progreso.max = 0
  progreso.value = 0
  tiempoActual.textContent = "0:00"
  duracion.textContent = "0:00"
  dibujarBiblioteca()
  actualizarInformacionPista()
  actualizarBotonKaraoke(null)
  cargarKaraoke(null)
  cambiarEstado("carpetaVacia",false)
}

function iniciarReproduccion(){
  reproduccionPendiente = false

  audio.play().catch(function(error){
    cambiarEstado("noReproducir",true)
    console.error(error)
  })
}

function cargarPista(pista,reproducirAhora){
  if(!pista){
    vaciarReproductor()
    return
  }

  if(archivoActual === pista.archivo && audio.getAttribute("src")){
    actualizarInformacionPista()
    actualizarBotonKaraoke(pista)
    dibujarBiblioteca()

    if(archivoKaraoke !== pista.archivo){
      cargarKaraoke(pista)
    }

    recuperarTrabajoKaraoke(pista)

    if(reproducirAhora){
      iniciarReproduccion()
    }

    return
  }

  audio.pause()
  reproduccionPendiente = Boolean(reproducirAhora)
  archivoActual = pista.archivo
  progreso.max = 0
  progreso.value = 0
  tiempoActual.textContent = "0:00"
  duracion.textContent = Number.isFinite(pista.duracion) ? formatearTiempo(pista.duracion) : "0:00"
  actualizarInformacionPista()
  actualizarBotonKaraoke(pista)
  cargarKaraoke(pista)
  dibujarBiblioteca()
  cambiarEstado("cargandoPista",false)
  audio.src = pista.url
  audio.load()
  recuperarTrabajoKaraoke(pista)
}

function cargarDuraciones(){
  biblioteca.forEach(function(pista){
    if(pista.duracionConsultada){
      return
    }

    pista.duracionConsultada = true
    let lector = new Audio()
    lector.preload = "metadata"

    lector.onloadedmetadata = function(){
      pista.duracion = lector.duration
      dibujarBiblioteca()
      lector.removeAttribute("src")
    }

    lector.onerror = function(){
      lector.removeAttribute("src")
    }

    lector.src = pista.url
  })
}

async function cargarBiblioteca(){
  if(consultandoBiblioteca || generandoKaraoke){
    return
  }

  consultandoBiblioteca = true

  try{
    let respuesta = await fetch("api/listar-audios.php?momento=" + Date.now())

    if(!respuesta.ok){
      throw new Error("El servidor no pudo explorar la carpeta")
    }

    let datos = await respuesta.json()

    if(!Array.isArray(datos.canciones)){
      throw new Error("La respuesta de la biblioteca no es válida")
    }

    let nuevaFirma = JSON.stringify(datos.canciones)

    if(nuevaFirma === firmaBiblioteca){
      return
    }

    let datosAnteriores = new Map(biblioteca.map(function(pista){
      return [pista.archivo,pista]
    }))
    let pistaAnterior = archivoActual

    biblioteca = datos.canciones.map(function(pista){
      let anterior = datosAnteriores.get(pista.archivo)

      if(anterior){
        pista.duracion = anterior.duracion
        pista.duracionConsultada = anterior.duracionConsultada
      }

      return pista
    })
    firmaBiblioteca = nuevaFirma
    cola = cola.filter(function(archivo){
      return Boolean(buscarPista(archivo))
    })

    let pistaConservada = buscarPista(pistaAnterior)

    if(pistaConservada){
      archivoActual = pistaConservada.archivo
      dibujarBiblioteca()
      dibujarCola()
      actualizarInformacionPista()
      actualizarBotonKaraoke(pistaConservada)

      if(
        archivoKaraoke !== pistaConservada.archivo
        || (pistaConservada.tieneKaraoke && frasesKaraoke.length === 0 && !generandoKaraoke)
      ){
        cargarKaraoke(pistaConservada)
      }

      cargarDuraciones()
      return
    }

    if(biblioteca.length === 0){
      dibujarBiblioteca()
      dibujarCola()
      vaciarReproductor()
      return
    }

    dibujarCola()
    cargarPista(biblioteca[0],false)
    cargarDuraciones()
  }catch(error){
    cambiarEstado(error instanceof TypeError ? "servidorNoDisponible" : "errorBiblioteca",true)
    console.error(error)
  }finally{
    consultandoBiblioteca = false
  }
}

async function subirCancion(archivo){
  if(!archivo || !archivo.name.toLowerCase().endsWith(".mp3")){
    cambiarEstado("audioNoValido",true)
    return
  }

  anadirCancion.disabled = true
  cambiarEstado("subiendoCancion",false)
  let formulario = new FormData()
  formulario.append("audio",archivo,archivo.name)

  try{
    let respuesta = await fetch("api/subir-audio.php",{
      method:"POST",
      body:formulario
    })
    let datos = await respuesta.json()

    if(!respuesta.ok || !datos.ok){
      let error = new Error(datos.codigo || "subida_fallida")
      error.codigo = datos.codigo
      throw error
    }

    firmaBiblioteca = ""
    await cargarBiblioteca()
    let pista = buscarPista(datos.archivo)

    if(pista){
      cargarPista(pista,false)
    }

    cambiarEstado("cancionAnadida",false)
  }catch(error){
    if(error.codigo === "archivo_duplicado"){
      cambiarEstado("archivoDuplicado",true)
    }else if(error.codigo === "archivo_no_valido" || error.codigo === "contenido_no_mp3"){
      cambiarEstado("audioNoValido",true)
    }else if(error instanceof TypeError){
      cambiarEstado("servidorNoDisponible",true)
    }else{
      cambiarEstado("subidaFallida",true)
    }

    console.error(error)
  }finally{
    selectorAudio.value = ""
    anadirCancion.disabled = generandoKaraoke
  }
}

function elegirAleatoria(){
  if(biblioteca.length === 0){
    return null
  }

  if(biblioteca.length === 1){
    return biblioteca[0]
  }

  let disponibles = biblioteca.filter(function(pista){
    return pista.archivo !== archivoActual
  })
  return disponibles[Math.floor(Math.random() * disponibles.length)]
}

function irSiguiente(esFinal){
  let siguientePista = null

  if(esFinal && modoRepeticion === "una"){
    siguientePista = obtenerPistaActual()
  }else if(cola.length > 0){
    siguientePista = buscarPista(cola.shift())
    dibujarCola()
  }else if(aleatorioActivo){
    siguientePista = elegirAleatoria()
  }else{
    let indiceActual = biblioteca.findIndex(function(pista){
      return pista.archivo === archivoActual
    })

    if(indiceActual >= 0 && indiceActual < biblioteca.length - 1){
      siguientePista = biblioteca[indiceActual + 1]
    }else if(modoRepeticion === "todo"){
      siguientePista = biblioteca[0]
    }
  }

  if(siguientePista){
    if(esFinal && modoRepeticion === "una"){
      audio.currentTime = 0
      iniciarReproduccion()
    }else{
      cargarPista(siguientePista,true)
    }
  }else if(esFinal){
    cambiarEstado("finalizada",false)
  }
}

function irAnterior(){
  if(!obtenerPistaActual()){
    return
  }

  if(audio.currentTime > 3){
    audio.currentTime = 0
    iniciarReproduccion()
    return
  }

  let pistaAnterior = null

  if(aleatorioActivo){
    pistaAnterior = elegirAleatoria()
  }else{
    let indiceActual = biblioteca.findIndex(function(pista){
      return pista.archivo === archivoActual
    })

    if(indiceActual > 0){
      pistaAnterior = biblioteca[indiceActual - 1]
    }else if(modoRepeticion === "todo"){
      pistaAnterior = biblioteca[biblioteca.length - 1]
    }
  }

  if(pistaAnterior){
    cargarPista(pistaAnterior,true)
  }else{
    audio.currentTime = 0
    progreso.value = 0
    tiempoActual.textContent = "0:00"
  }
}

function claveErrorKaraoke(codigo){
  if(codigo === "generacion_en_curso"){
    return "karaokeEnCurso"
  }

  if(codigo === "whisper_no_disponible"){
    return "karaokeNoDisponible"
  }

  if(codigo === "modelo_no_disponible"){
    return "karaokeModeloNoDisponible"
  }

  if(codigo === "servidor_no_disponible"){
    return "servidorNoDisponible"
  }

  if(codigo === "generacion_interrumpida"){
    return "generacionInterrumpida"
  }

  return "karaokeError"
}

function esperar(milisegundos){
  return new Promise(function(resolver){
    setTimeout(resolver,milisegundos)
  })
}

async function consultarTrabajoKaraoke(archivo){
  let respuesta

  try{
    respuesta = await fetch(
      "api/estado-karaoke.php?archivo=" + encodeURIComponent(archivo) + "&momento=" + Date.now(),
      {cache:"no-store"}
    )
  }catch(error){
    let fallo = new Error("El servidor no responde")
    fallo.codigo = "servidor_no_disponible"
    throw fallo
  }

  let datos = await respuesta.json()

  if(!respuesta.ok || !datos.ok){
    let error = new Error("No se pudo consultar la generación")
    error.codigo = datos.codigo || "estado_no_disponible"
    throw error
  }

  return datos.trabajo
}

function eventoDesdeTrabajo(trabajo){
  return {
    fase:trabajo.fase,
    porcentaje:trabajo.porcentaje,
    modelo:trabajo.modelo,
    idiomaDetectado:trabajo.idiomaDetectado,
    alineacion:trabajo.alineacion
  }
}

async function esperarTrabajoKaraoke(archivo){
  let consultasSinTrabajo = 0

  while(true){
    let trabajo = await consultarTrabajoKaraoke(archivo)

    if(trabajo === null){
      consultasSinTrabajo++

      if(consultasSinTrabajo >= 3){
        let error = new Error("No existe una generación activa")
        error.codigo = "generacion_fallida"
        throw error
      }
    }else{
      consultasSinTrabajo = 0
      actualizarPanelPruebaKaraoke(eventoDesdeTrabajo(trabajo))

      if(trabajo.estado === "completado"){
        return {
          urlKaraoke:trabajo.urlVtt,
          modelo:trabajo.modelo,
          alineacion:trabajo.alineacion
        }
      }

      if(trabajo.estado === "error" || trabajo.estado === "interrumpido"){
        let error = new Error("La generación se ha detenido")
        error.codigo = trabajo.codigoError || "generacion_interrumpida"
        throw error
      }
    }

    await esperar(1500)
  }
}

async function aplicarKaraokeGenerado(archivo,datos){
  let pistaGenerada = buscarPista(archivo)

  if(pistaGenerada){
    pistaGenerada.tieneKaraoke = true
    pistaGenerada.urlKaraoke = datos.urlKaraoke
  }

  if(archivoActual === archivo && pistaGenerada){
    await cargarKaraoke(pistaGenerada,true)
  }

  firmaBiblioteca = ""
}

async function leerEventosKaraoke(respuesta){
  let tipoContenido = respuesta.headers.get("Content-Type") || ""

  if(tipoContenido.includes("application/json")){
    let datos = await respuesta.json()

    if(!respuesta.ok || !datos.ok){
      let error = new Error("No se pudo generar el karaoke")
      error.codigo = datos.codigo
      throw error
    }

    return datos
  }

  if(!respuesta.ok || !respuesta.body){
    let error = new Error("No se pudo abrir el seguimiento de Whisper")
    error.codigo = "generacion_fallida"
    throw error
  }

  let lector = respuesta.body.getReader()
  let decodificador = new TextDecoder()
  let pendiente = ""
  let resultado = null

  while(true){
    let lectura = await lector.read()
    pendiente += decodificador.decode(lectura.value || new Uint8Array(),{stream:!lectura.done})
    let lineas = pendiente.split("\n")
    pendiente = lineas.pop() || ""

    lineas.forEach(function(linea){
      if(linea.trim() === ""){
        return
      }

      let evento = JSON.parse(linea)
      actualizarPanelPruebaKaraoke(evento)

      if(evento.tipo === "completado"){
        resultado = evento
      }

      if(evento.tipo === "error"){
        let error = new Error(evento.mensaje || "No se pudo generar el karaoke")
        error.codigo = evento.codigo
        throw error
      }
    })

    if(lectura.done){
      break
    }
  }

  if(!resultado){
    let error = new Error("Whisper terminó sin confirmar el VTT")
    error.codigo = "generacion_fallida"
    throw error
  }

  return resultado
}

async function generarKaraoke(){
  let pista = obtenerPistaActual()

  if(!pista || generandoKaraoke){
    return
  }

  ocultarPanelKaraoke()
  generandoKaraoke = true
  archivoGenerando = pista.archivo
  actualizarBotonKaraoke(pista)
  mostrarPanelPruebaKaraoke(pista)
  let generado = false
  let archivoSolicitado = pista.archivo

  try{
    let datos

    try{
      let respuesta = await fetch("api/generar-karaoke.php",{
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          archivo:pista.archivo
        })
      })
      datos = await leerEventosKaraoke(respuesta)
    }catch(errorConexion){
      if([
        "whisper_no_disponible",
        "modelo_no_disponible",
        "cancion_no_encontrada",
        "archivo_no_valido",
        "base_datos_no_disponible",
        "generacion_en_curso"
      ].includes(errorConexion.codigo)){
        throw errorConexion
      }

      datos = await esperarTrabajoKaraoke(archivoSolicitado)
    }

    await aplicarKaraokeGenerado(archivoSolicitado,datos)
    generado = true
  }catch(error){
    actualizarPanelPruebaKaraoke({
      fase:"error"
    })
    detallePruebaKaraoke.textContent = error.codigo || error.message

    if(archivoActual === archivoSolicitado){
      let clave = claveErrorKaraoke(error.codigo)
      cambiarEstado(clave,true)
    }

    console.error(error)
  }finally{
    generandoKaraoke = false
    archivoGenerando = ""
    cerrarPanelPruebaKaraoke(generado)
    actualizarBotonKaraoke(obtenerPistaActual())

    if(generado){
      cargarBiblioteca()
    }
  }
}

async function recuperarTrabajoKaraoke(pista){
  if(
    !pista
    || pista.tieneKaraoke
    || generandoKaraoke
    || archivoTrabajoComprobado === pista.archivo
  ){
    return
  }

  archivoTrabajoComprobado = pista.archivo

  try{
    let trabajo = await consultarTrabajoKaraoke(pista.archivo)

    if(!trabajo || trabajo.estado !== "en_curso"){
      return
    }

    generandoKaraoke = true
    archivoGenerando = pista.archivo
    actualizarBotonKaraoke(pista)
    mostrarPanelPruebaKaraoke(pista)
    actualizarPanelPruebaKaraoke(eventoDesdeTrabajo(trabajo))
    let datos = await esperarTrabajoKaraoke(pista.archivo)
    await aplicarKaraokeGenerado(pista.archivo,datos)
    cerrarPanelPruebaKaraoke(true)
  }catch(error){
    actualizarPanelPruebaKaraoke({fase:"error"})
    detallePruebaKaraoke.textContent = error.codigo || error.message
    cambiarEstado(claveErrorKaraoke(error.codigo),true)
    cerrarPanelPruebaKaraoke(false)
  }finally{
    generandoKaraoke = false
    archivoGenerando = ""
    actualizarBotonKaraoke(obtenerPistaActual())
    cargarBiblioteca()
  }
}

function saltarAFrase(elemento){
  let indice = Number(elemento.dataset.indice)

  if(!Number.isInteger(indice) || !frasesKaraoke[indice]){
    return
  }

  audio.currentTime = frasesKaraoke[indice].inicio
  progreso.value = audio.currentTime
  tiempoActual.textContent = formatearTiempo(audio.currentTime)
  indiceKaraoke = -1
  actualizarLineasKaraoke()
}

idiomaEs.onclick = function(){
  cambiarIdioma("es")
}

idiomaEn.onclick = function(){
  cambiarIdioma("en")
}

botonKaraoke.onclick = async function(){
  let pista = obtenerPistaActual()

  if(!pista || generandoKaraoke){
    return
  }

  if(pista.tieneKaraoke){
    if(!panelKaraoke.classList.contains("cerrado")){
      ocultarPanelKaraoke()
    }else if(frasesKaraoke.length > 0 && archivoKaraoke === pista.archivo){
      mostrarPanelKaraoke()
    }else{
      await cargarKaraoke(pista,true)
    }

    actualizarBotonKaraoke(pista)
  }else{
    generarKaraoke()
  }
}

lineaAnterior.onclick = function(){
  saltarAFrase(lineaAnterior)
}

lineaActual.onclick = function(){
  saltarAFrase(lineaActual)
}

lineaSiguiente.onclick = function(){
  saltarAFrase(lineaSiguiente)
}

busqueda.oninput = function(){
  dibujarBiblioteca()
}

anadirCancion.onclick = function(){
  if(!generandoKaraoke){
    selectorAudio.click()
  }
}

selectorAudio.onchange = function(){
  subirCancion(selectorAudio.files[0])
}

vaciarCola.onclick = function(){
  cola = []
  dibujarCola()
}

botonMinimizarCola.onclick = function(){
  colaMinimizada = !colaMinimizada
  actualizarEstadoCola()
}

reproducir.onclick = function(){
  if(!audio.getAttribute("src")){
    cambiarEstado("sinSeleccion",true)
    return
  }

  if(audio.paused){
    iniciarReproduccion()
  }else{
    audio.pause()
  }
}

anterior.onclick = irAnterior

siguiente.onclick = function(){
  irSiguiente(false)
}

aleatorio.onclick = function(){
  aleatorioActivo = !aleatorioActivo
  actualizarModos()
}

repetir.onclick = function(){
  if(modoRepeticion === "ninguno"){
    modoRepeticion = "todo"
  }else if(modoRepeticion === "todo"){
    modoRepeticion = "una"
  }else{
    modoRepeticion = "ninguno"
  }

  actualizarModos()
}

progreso.oninput = function(){
  if(Number.isFinite(audio.duration)){
    audio.currentTime = Number(progreso.value)
    indiceKaraoke = -1
    actualizarLineasKaraoke()
  }
}

volumen.oninput = function(){
  audio.volume = Number(volumen.value)
  valorVolumen.textContent = Math.round(audio.volume * 100) + "%"
}

audio.onloadedmetadata = function(){
  let pista = obtenerPistaActual()

  progreso.max = Number.isFinite(audio.duration) ? audio.duration : 0
  duracion.textContent = formatearTiempo(audio.duration)

  if(pista){
    pista.duracion = audio.duration
    pista.duracionConsultada = true
    dibujarBiblioteca()
  }

  cambiarEstado("preparado",false)

  if(reproduccionPendiente){
    iniciarReproduccion()
  }
}

audio.ontimeupdate = function(){
  progreso.value = audio.currentTime
  tiempoActual.textContent = formatearTiempo(audio.currentTime)
  actualizarLineasKaraoke()
}

audio.onplay = function(){
  reproducir.innerHTML = iconoPausar
  reproducir.title = traducir("pausar")
  reproducir.setAttribute("aria-label",traducir("pausar"))
  cambiarEstado("reproduciendo",false)
}

audio.onpause = function(){
  reproducir.innerHTML = iconoReproducir
  reproducir.title = traducir("reproducir")
  reproducir.setAttribute("aria-label",traducir("reproducir"))

  if(audio.currentTime > 0 && audio.currentTime < audio.duration){
    cambiarEstado("enPausa",false)
  }
}

audio.onended = function(){
  reproducir.innerHTML = iconoReproducir
  reproducir.title = traducir("reproducir")
  reproducir.setAttribute("aria-label",traducir("reproducir"))
  irSiguiente(true)
}

audio.onwaiting = function(){
  cambiarEstado("cargandoAudio",false)
}

audio.onerror = function(){
  cambiarEstado("errorPista",true)
}

aplicarIdioma()
cargarBiblioteca()
setInterval(cargarBiblioteca,5000)
