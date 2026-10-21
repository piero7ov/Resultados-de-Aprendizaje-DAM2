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
let busqueda = document.querySelector("#busqueda")
let listaCanciones = document.querySelector("#listaCanciones")
let tituloCola = document.querySelector("#tituloCola")
let vaciarCola = document.querySelector("#vaciarCola")
let listaCola = document.querySelector("#listaCola")
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

let traducciones = {
  es:{
    tituloDocumento:"ERINWAVE · Biblioteca local",
    etiquetaReproductor:"Reproductor ERINWAVE",
    grupoIdiomas:"Idioma de la interfaz",
    cambiarEs:"Cambiar la interfaz a español",
    cambiarEn:"Cambiar la interfaz a inglés",
    controles:"Controles del reproductor",
    buscando:"Preparando tu música",
    sinCanciones:"Tu biblioteca está vacía",
    anadeMp3:"Añade canciones para empezar",
    biblioteca:"Biblioteca",
    buscar:"Buscar canción o artista",
    sinResultados:"No hay resultados para esta búsqueda",
    cola:"Cola",
    vaciar:"Vaciar",
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
    karaokeVersion3:"Generador de karaoke disponible en la versión 3",
    karaokeDisponible:"Karaoke disponible",
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
    tituloDocumento:"ERINWAVE · Local library",
    etiquetaReproductor:"ERINWAVE player",
    grupoIdiomas:"Interface language",
    cambiarEs:"Switch the interface to Spanish",
    cambiarEn:"Switch the interface to English",
    controles:"Player controls",
    buscando:"Getting your music ready",
    sinCanciones:"Your library is empty",
    anadeMp3:"Add songs to get started",
    biblioteca:"Library",
    buscar:"Search by song or artist",
    sinResultados:"No results for this search",
    cola:"Queue",
    vaciar:"Clear",
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
    karaokeVersion3:"Karaoke generator available in version 3",
    karaokeDisponible:"Karaoke available",
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
  let etiqueta = tieneKaraoke ? traducir("karaokeDisponible") : traducir("karaokeVersion3")
  brilloKaraoke.classList.toggle("oculto",tieneKaraoke)
  botonKaraoke.title = etiqueta
  botonKaraoke.setAttribute("aria-label",etiqueta)
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
  busqueda.placeholder = traducir("buscar")
  busqueda.setAttribute("aria-label",traducir("buscar"))
  tituloCola.textContent = traducir("cola")
  vaciarCola.textContent = traducir("vaciar")
  vaciarCola.title = traducir("vaciar")
  progreso.setAttribute("aria-label",traducir("progreso"))
  etiquetaVolumen.textContent = traducir("volumen")
  volumen.setAttribute("aria-label",traducir("volumen"))
  anterior.title = traducir("anterior")
  anterior.setAttribute("aria-label",traducir("anterior"))
  siguiente.title = traducir("siguiente")
  siguiente.setAttribute("aria-label",traducir("siguiente"))
  reproducir.title = audio.paused ? traducir("reproducir") : traducir("pausar")
  reproducir.setAttribute("aria-label",reproducir.title)
  estado.textContent = traducir(claveEstado)
  estado.classList.toggle("error",estadoEsError)
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
  dibujarBiblioteca()
  cambiarEstado("cargandoPista",false)
  audio.src = pista.url
  audio.load()
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
  if(consultandoBiblioteca){
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
    cambiarEstado("errorBiblioteca",true)
    console.error(error)
  }finally{
    consultandoBiblioteca = false
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

idiomaEs.onclick = function(){
  cambiarIdioma("es")
}

idiomaEn.onclick = function(){
  cambiarIdioma("en")
}

busqueda.oninput = function(){
  dibujarBiblioteca()
}

vaciarCola.onclick = function(){
  cola = []
  dibujarCola()
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
