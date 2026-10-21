(function(){
  const audio = document.querySelector("#audio")
  const panel = document.querySelector("#visualizador")
  const alojamiento = document.querySelector("#alojamientoVisualizador")
  const escenario = document.querySelector("#escenarioVisualizador")
  const onda = document.querySelector("#ondaProgreso")
  const botonPlegar = document.querySelector("#plegarVisualizador")
  const contenido = document.querySelector("#contenidoVisualizador")
  const milkdrop = document.querySelector("#lienzoMilkdrop")
  const selector = document.querySelector("#escenaVisualizador")
  const botonVentana = document.querySelector("#ventanaVisualizador")
  const botonCompleta = document.querySelector("#pantallaCompletaVisualizador")
  const botonEscena = document.querySelector("#siguienteEscena")
  const recuperar = document.querySelector("#recuperarVisualizador")
  const aviso = document.querySelector("#avisoVisualizador")
  const volumenPrincipal = document.querySelector("#volumen")
  const volumenFlotante = document.querySelector("#volumenFlotante")
  const tituloPrincipal = document.querySelector("#tituloPista")
  const artistaPrincipal = document.querySelector("#artistaPista")
  const tituloFlotante = document.querySelector("#tituloFlotante")
  const artistaFlotante = document.querySelector("#artistaFlotante")
  const reproducirFlotante = document.querySelector("#reproducirFlotante")
  const anteriorFlotante = document.querySelector("#anteriorFlotante")
  const siguienteFlotante = document.querySelector("#siguienteFlotante")
  const basePagina = new URL(".",document.baseURI)
  const contextoOnda = onda.getContext("2d")
  const formasGuardadas = new Map()
  let alturasCancion = null
  let turnoForma = 0
  let peticionForma = null
  let colaFormas = Promise.resolve()
  let minimizado = false
  const textos = {
    es:{
      titulo:"Visualizador", efecto:"Efecto visual", minimizar:"Minimizar visualizador", desplegar:"Desplegar visualizador",
      siguiente:"Siguiente efecto", completa:"Pantalla completa", salirCompleta:"Salir de pantalla completa",
      ventana:"Ventana flotante", volver:"Volver al reproductor", recuperar:"Volver a traer el visualizador",
      reproducir:"Reproducir", pausar:"Pausar", anterior:"Canción anterior", siguientePista:"Canción siguiente",
      volumen:"Volumen", bloqueada:"Permite las ventanas emergentes para abrir el visualizador.",
      ventanaNormal:"Ventana independiente · no se mantiene siempre encima.",
      errorVentana:"No se pudo abrir la ventana flotante. Prueba de nuevo.",
      errorCompleta:"El navegador no permite ampliar esta ventana.",
      errorEfecto:"El visualizador no está disponible. La música puede continuar.",
      sinEfectos:"No se pudieron cargar los efectos del visualizador.",
      sinAnalisis:"Tu navegador no permite visualizar este audio."
    },
    en:{
      titulo:"Visualizer", efecto:"Visual effect", minimizar:"Minimize visualizer", desplegar:"Expand visualizer",
      siguiente:"Next effect", completa:"Full screen", salirCompleta:"Exit full screen",
      ventana:"Floating window", volver:"Return to player", recuperar:"Bring the visualizer back",
      reproducir:"Play", pausar:"Pause", anterior:"Previous song", siguientePista:"Next song",
      volumen:"Volume", bloqueada:"Allow pop-ups to open the visualizer.",
      ventanaNormal:"Separate window · does not stay always on top.",
      errorVentana:"The floating window could not be opened. Try again.",
      errorCompleta:"The browser cannot expand this window.",
      errorEfecto:"The visualizer is unavailable. Music can keep playing.",
      sinEfectos:"The visualizer effects could not be loaded.",
      sinAnalisis:"Your browser cannot visualize this audio."
    }
  }
  let motor = null
  let presets = {}
  let dependencia = "pendiente"
  let errorMotor = false
  let ventana = null
  let abriendoVentana = false
  let tipoVentana = ""
  let claveAviso = ""
  let reloj = window
  let fotograma = null
  let ultimoDibujo = 0
  let ultimaEscena = ""
  let anchoMotor = 0
  let altoMotor = 0

  function traducir(clave){
    return textos[document.documentElement.lang === "en" ? "en" : "es"][clave]
  }

  function etiquetar(boton,clave){
    boton.title = traducir(clave)
    boton.setAttribute("aria-label",traducir(clave))
  }

  function mostrarAviso(clave){
    claveAviso = clave
    aviso.hidden = !clave
    aviso.textContent = clave ? traducir(clave) : ""
  }

  function actualizarControles(){
    tituloFlotante.textContent = tituloPrincipal.textContent
    artistaFlotante.textContent = artistaPrincipal.textContent
    tituloFlotante.title = tituloPrincipal.textContent
    artistaFlotante.title = artistaPrincipal.textContent
    reproducirFlotante.innerHTML = document.querySelector("#reproducir").innerHTML
    anteriorFlotante.innerHTML = document.querySelector("#anterior").innerHTML
    siguienteFlotante.innerHTML = document.querySelector("#siguiente").innerHTML
    const sinAudio = !audio.getAttribute("src")
    reproducirFlotante.disabled = sinAudio
    anteriorFlotante.disabled = sinAudio
    siguienteFlotante.disabled = sinAudio
    etiquetar(reproducirFlotante,audio.paused ? "reproducir" : "pausar")
    etiquetar(anteriorFlotante,"anterior")
    etiquetar(siguienteFlotante,"siguientePista")
    volumenFlotante.value = volumenPrincipal.value
    panel.querySelector("#valorVolumenFlotante").textContent = Math.round(Number(volumenPrincipal.value) * 100) + "%"
  }

  function aplicarIdioma(){
    panel.setAttribute("aria-label",traducir("titulo"))
    panel.querySelector("#nombreVisualizador").textContent = traducir("titulo")
    selector.setAttribute("aria-label",traducir("efecto"))
    etiquetar(botonPlegar,minimizado ? "desplegar" : "minimizar")
    etiquetar(botonEscena,"siguiente")
    etiquetar(botonVentana,ventana ? "volver" : "ventana")
    etiquetar(botonCompleta,panel.ownerDocument.fullscreenElement ? "salirCompleta" : "completa")
    recuperar.textContent = traducir("recuperar")
    panel.querySelector("#etiquetaVolumenFlotante").textContent = traducir("volumen")
    volumenFlotante.setAttribute("aria-label",traducir("volumen"))
    if(ventana){
      ventana.document.documentElement.lang = document.documentElement.lang
      ventana.document.title = "ERINWAVE · " + traducir("titulo")
    }
    mostrarAviso(claveAviso)
    actualizarControles()
  }

  function ajustarLienzo(lienzo,ancho,alto,escala){
    const nuevoAncho = Math.max(1,Math.round(ancho * escala))
    const nuevoAlto = Math.max(1,Math.round(alto * escala))
    if(lienzo.width !== nuevoAncho || lienzo.height !== nuevoAlto){
      lienzo.width = nuevoAncho
      lienzo.height = nuevoAlto
    }
  }

  function ajustarTamano(){
    const caja = escenario.getBoundingClientRect()
    if(!minimizado && caja.width > 0 && caja.height > 0){
      const escala = Math.min(reloj.devicePixelRatio || 1,1.5,1280 / caja.width,720 / caja.height)
      // El buffer del canvas y el viewport de Butterchurn deben tener exactamente el mismo tamaño.
      ajustarLienzo(milkdrop,caja.width,caja.height,escala)
      if(motor && (anchoMotor !== milkdrop.width || altoMotor !== milkdrop.height)){
        anchoMotor = milkdrop.width
        altoMotor = milkdrop.height
        try{ motor.setRendererSize(anchoMotor,altoMotor) }catch(error){ mostrarErrorEfecto(error) }
      }
    }
    const cajaOnda = onda.getBoundingClientRect()
    ajustarLienzo(onda,cajaOnda.width,cajaOnda.height,Math.min(window.devicePixelRatio || 1,1.5))
    dibujarOndaProgreso()
  }

  function dibujarOndaProgreso(){
    const ancho = onda.width
    const alto = onda.height
    const posicion = Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.max(0,Math.min(1,audio.currentTime / audio.duration)) : 0
    contextoOnda.clearRect(0,0,ancho,alto)
    if(!alturasCancion){
      contextoOnda.fillStyle = "#285666"
      contextoOnda.fillRect(0,alto / 2 - 1,ancho,2)
      contextoOnda.fillStyle = "#7be6ed"
      contextoOnda.fillRect(0,alto / 2 - 1,ancho * posicion,2)
      return
    }
    const numeroBarras = Math.max(1,Math.min(96,Math.floor(onda.clientWidth / 4)))
    const paso = ancho / numeroBarras
    for(let indice = 0; indice < numeroBarras; indice++){
      const desde = Math.floor(indice * alturasCancion.length / numeroBarras)
      const hasta = Math.max(desde + 1,Math.floor((indice + 1) * alturasCancion.length / numeroBarras))
      let altura = 0
      for(let muestra = desde; muestra < hasta; muestra++){ altura = Math.max(altura,alturasCancion[muestra]) }
      const altoBarra = Math.max(2,altura * alto * 0.85)
      contextoOnda.fillStyle = (indice + 0.5) / numeroBarras <= posicion ? "#7be6ed" : "#345d6e"
      contextoOnda.beginPath()
      contextoOnda.roundRect(indice * paso,(alto - altoBarra) / 2,Math.max(1,paso * 0.55),altoBarra,paso * 0.25)
      contextoOnda.fill()
    }
    contextoOnda.fillStyle = "#d4ffff"
    contextoOnda.fillRect(Math.min(ancho - 1,ancho * posicion),1,1,alto - 2)
  }

  function calcularAlturas(buffer){
    const alturas = new Float32Array(192)
    for(let canal = 0; canal < buffer.numberOfChannels; canal++){
      const muestras = buffer.getChannelData(canal)
      for(let barra = 0; barra < alturas.length; barra++){
        const desde = Math.floor(barra * muestras.length / alturas.length)
        const hasta = Math.floor((barra + 1) * muestras.length / alturas.length)
        const salto = Math.max(1,Math.floor((hasta - desde) / 100))
        for(let muestra = desde; muestra < hasta; muestra += salto){
          alturas[barra] = Math.max(alturas[barra],Math.min(1,Math.abs(muestras[muestra])))
        }
      }
    }
    return alturas
  }

  function limpiarForma(){
    turnoForma++
    peticionForma?.abort()
    alturasCancion = null
    dibujarOndaProgreso()
  }

  function cargarFormaCancion(){
    limpiarForma()
    const turno = turnoForma
    const ruta = audio.getAttribute("src")
    if(!ruta){ return }
    const url = new URL(ruta,basePagina).href
    if(formasGuardadas.has(url)){
      alturasCancion = formasGuardadas.get(url)
      dibujarOndaProgreso()
      return
    }
    const peticion = new AbortController()
    peticionForma = peticion
    // Serializar la decodificación evita acumular buffers grandes al cambiar rápido de pista.
    colaFormas = colaFormas.catch(function(){}).then(async function(){
      if(turno !== turnoForma){ return }
      try{
        const ClaseContexto = window.OfflineAudioContext || window.webkitOfflineAudioContext
        if(!ClaseContexto){ return }
        const respuesta = await fetch(url,{signal:peticion.signal})
        if(!respuesta.ok){ throw new Error("No se pudo leer el audio de la barra") }
        const datos = await respuesta.arrayBuffer()
        if(turno !== turnoForma){ return }
        const contexto = new ClaseContexto(1,1,22050)
        const buffer = await contexto.decodeAudioData(datos)
        const alturas = calcularAlturas(buffer)
        formasGuardadas.set(url,alturas)
        if(turno !== turnoForma){ return }
        alturasCancion = alturas
        dibujarOndaProgreso()
      }catch(error){
        if(error.name !== "AbortError"){ console.warn("No se pudo preparar la forma de la canción",error) }
      }
    })
  }

  function cambiarPlegado(plegar){
    minimizado = plegar
    panel.classList.toggle("minimizado",minimizado)
    contenido.inert = minimizado
    contenido.setAttribute("aria-hidden",String(minimizado))
    botonPlegar.setAttribute("aria-expanded",String(!minimizado))
    etiquetar(botonPlegar,minimizado ? "desplegar" : "minimizar")
    if(minimizado){ detenerDibujo() }
    else{
      ajustarTamano()
      prepararEfecto()
      dibujar()
      reanudarDibujo()
    }
  }

  function mostrarErrorEfecto(error){
    errorMotor = true
    detenerDibujo()
    milkdrop.hidden = true
    selector.disabled = true
    botonEscena.disabled = true
    mostrarAviso("errorEfecto")
    console.warn("No se pudo dibujar el efecto",error)
  }

  function prepararEfecto(){
    selector.title = selector.value.startsWith("milkdrop:") ? selector.value.slice(9) : ""
    if(!selector.value.startsWith("milkdrop:") || minimizado){ return }
    if(!window.audioErin.contexto || !window.audioErin.analizador || errorMotor){ return }
    try{
      if(!motor){
        motor = window.butterchurn.createVisualizer(window.audioErin.contexto,milkdrop,{
          width:milkdrop.width,height:milkdrop.height,pixelRatio:1,textureRatio:1
        })
        motor.connectAudio(window.audioErin.analizador)
        anchoMotor = milkdrop.width
        altoMotor = milkdrop.height
      }
      if(ultimaEscena !== selector.value){
        motor.loadPreset(presets[selector.value.slice(9)],ultimaEscena ? 2.4 : 0)
        ultimaEscena = selector.value
      }
      milkdrop.hidden = false
    }catch(error){
      mostrarErrorEfecto(error)
    }
  }

  function dibujar(){
    if(motor && !milkdrop.hidden && !minimizado && !errorMotor){
      try{ motor.render() }catch(error){ mostrarErrorEfecto(error) }
    }
  }

  function detenerDibujo(){
    if(fotograma !== null){ reloj.cancelAnimationFrame(fotograma) }
    fotograma = null
  }

  function animar(instante){
    fotograma = null
    if(audio.paused || audio.ended || panel.ownerDocument.hidden || minimizado || errorMotor){ return }
    if(instante - ultimoDibujo >= 1000 / 30){
      dibujar()
      ultimoDibujo = instante
    }
    fotograma = reloj.requestAnimationFrame(animar)
  }

  function reanudarDibujo(){
    detenerDibujo()
    reloj = panel.ownerDocument.defaultView || window
    ultimoDibujo = 0
    if(!audio.paused && !panel.ownerDocument.hidden && !minimizado && !errorMotor){
      fotograma = reloj.requestAnimationFrame(animar)
    }
  }

  async function cargarScript(ruta){
    // Rutas locales: la aplicación no depende de un CDN al reproducir.
    const url = new URL(ruta,basePagina).href
    const respuesta = await fetch(url,{method:"HEAD"})
    if(!respuesta.ok){ throw new Error("Dependencia local pendiente: " + ruta) }
    return new Promise(function(resolve,reject){
      const script = document.createElement("script")
      script.src = url
      script.onload = resolve
      script.onerror = reject
      document.head.append(script)
    })
  }

  function abreviarNombreEfecto(nombre){
    const nombresCortos = {
      "Aderrasi + Geiss - Airhandler (Kali Mix) - Canvas Mix":"Airhandler",
      "An AdamFX n Martin Infusion 2 flexi - Why The Sky Looks Diffrent Today - AdamFx n Martin Infusion - Tack Tile Disfunction B":"Why The Sky",
      "Flexi + Martin - astral projection":"Astral Projection",
      "Flexi + Martin - cascading decay swing":"Cascading Decay",
      "Flexi + amandio c - piercing 05 - Kopie (2) - Kopie":"Piercing 05",
      "Flexi + stahlregen - jelly showoff parade":"Jelly Showoff"
    }
    const titulo = nombresCortos[nombre] || nombre.split(" - ")[1] || nombre
    return titulo.length > 20 ? titulo.slice(0,19).trimEnd() + "…" : titulo
  }

  async function cargarEfectos(){
    try{
      await cargarScript("node_modules/butterchurn/lib/butterchurn.min.js")
      await cargarScript("node_modules/butterchurn-presets/lib/butterchurnPresets.min.js")
      const biblioteca = window.butterchurn?.default || window.butterchurn
      window.butterchurn = biblioteca
      const paquete = window.butterchurnPresets?.default || window.butterchurnPresets
      if(!biblioteca || !paquete){ throw new Error("No se encontraron las librerías del visualizador") }
      const prueba = document.createElement("canvas").getContext("webgl2")
      if(!prueba){ dependencia = "sin-webgl2"; mostrarAviso("sinEfectos"); return }
      prueba.getExtension("WEBGL_lose_context")?.loseContext()
      presets = paquete.getPresets()
      const nombres = Object.keys(presets).sort()
      const preferidos = nombres.filter(function(nombre){ return /flexi|geiss|martin/i.test(nombre) })
      const elegidos = (preferidos.length ? preferidos : nombres).slice(0,6)
      selector.replaceChildren()
      elegidos.forEach(function(nombre){
        const opcion = document.createElement("option")
        opcion.value = "milkdrop:" + nombre
        opcion.textContent = abreviarNombreEfecto(nombre)
        opcion.title = nombre
        selector.append(opcion)
      })
      dependencia = "lista"
      selector.disabled = elegidos.length === 0
      botonEscena.disabled = elegidos.length === 0
      // No cambiar un efecto que el usuario ya haya elegido mientras se cargaban las librerías.
      if(!selector.dataset.elegido && elegidos.length){
        selector.value = "milkdrop:" + elegidos[0]
        prepararEfecto()
        dibujar()
      }
    }catch(error){
      dependencia = "no-instalada"
      mostrarAviso("sinEfectos")
      console.info("ERINWAVE: efectos MilkDrop pendientes.",error)
    }
  }

  function restaurarVisualizador(){
    if(!ventana){ return }
    const anteriorVentana = ventana
    detenerDibujo()
    alojamiento.prepend(panel)
    ventana = null
    tipoVentana = ""
    recuperar.hidden = true
    botonCompleta.hidden = false
    mostrarAviso("")
    aplicarIdioma()
    reanudarDibujo()
    ajustarTamano()
    dibujar()
    if(!anteriorVentana.closed){ anteriorVentana.close() }
    botonVentana.focus()
  }

  async function abrirVentana(){
    if(ventana){ restaurarVisualizador(); return }
    if(abriendoVentana){ return }
    abriendoVentana = true
    mostrarAviso("")
    try{
      if(window.documentPictureInPicture?.requestWindow){
        ventana = await window.documentPictureInPicture.requestWindow({width:600,height:420})
        tipoVentana = "pip"
      }else{
        ventana = window.open("","erinwave-visualizador","popup=yes,width=600,height=420")
        tipoVentana = "normal"
        if(!ventana){
          tipoVentana = ""
          mostrarAviso("bloqueada")
          return
        }
      }
      const documento = ventana.document
      documento.head.replaceChildren()
      documento.body.replaceChildren()
      const estilo = documento.createElement("link")
      estilo.rel = "stylesheet"
      estilo.href = new URL("visualizador.css?v=4.3",basePagina).href
      documento.head.append(estilo)
      documento.body.className = "ventana-visualizador"
      detenerDibujo()
      documento.body.append(panel)
      recuperar.hidden = false
      botonCompleta.hidden = tipoVentana === "pip"
      ventana.addEventListener("pagehide",restaurarVisualizador,{once:true})
      ventana.addEventListener("resize",function(){ ajustarTamano(); dibujar() })
      documento.addEventListener("visibilitychange",reanudarDibujo)
      documento.addEventListener("fullscreenchange",function(){ aplicarIdioma(); ajustarTamano(); dibujar() })
      estilo.addEventListener("load",function(){ ajustarTamano(); dibujar() })
      aplicarIdioma()
      mostrarAviso(tipoVentana === "normal" ? "ventanaNormal" : "")
      reanudarDibujo()
      ajustarTamano()
      dibujar()
    }catch(error){
      restaurarVisualizador()
      mostrarAviso("errorVentana")
      console.warn("No se pudo abrir la ventana del visualizador",error)
    }finally{
      abriendoVentana = false
    }
  }

  selector.addEventListener("change",function(){
    selector.dataset.elegido = "si"
    mostrarAviso(tipoVentana === "normal" ? "ventanaNormal" : "")
    prepararEfecto()
    ajustarTamano()
    dibujar()
  })

  botonEscena.addEventListener("click",function(){
    const opciones = Array.from(selector.options).filter(function(opcion){ return !opcion.disabled })
    if(!opciones.length){ return }
    const indice = opciones.findIndex(function(opcion){ return opcion.value === selector.value })
    selector.value = opciones[(indice + 1) % opciones.length].value
    selector.dispatchEvent(new Event("change"))
  })
  botonVentana.addEventListener("click",abrirVentana)
  botonPlegar.addEventListener("click",function(){ cambiarPlegado(!minimizado) })
  contenido.addEventListener("transitionend",function(){
    if(!minimizado){ ajustarTamano(); dibujar() }
  })
  recuperar.addEventListener("click",restaurarVisualizador)
  botonCompleta.addEventListener("click",async function(){
    try{
      if(panel.ownerDocument.fullscreenElement){ await panel.ownerDocument.exitFullscreen() }
      else{ cambiarPlegado(false); await panel.requestFullscreen() }
    }catch(error){ mostrarAviso("errorCompleta") }
  })

  anteriorFlotante.addEventListener("click",function(){ document.querySelector("#anterior").click() })
  siguienteFlotante.addEventListener("click",function(){ document.querySelector("#siguiente").click() })
  reproducirFlotante.addEventListener("click",function(){ document.querySelector("#reproducir").click() })
  volumenFlotante.addEventListener("input",function(){
    volumenPrincipal.value = volumenFlotante.value
    volumenPrincipal.dispatchEvent(new Event("input"))
  })
  document.addEventListener("erinwave-volumen",actualizarControles)
  document.addEventListener("erinwave-idioma",aplicarIdioma)
  document.addEventListener("erinwave-audio",function(){ prepararEfecto(); ajustarTamano() })
  document.addEventListener("erinwave-audio-no-disponible",function(){ mostrarAviso("sinAnalisis") })
  document.addEventListener("visibilitychange",reanudarDibujo)
  document.addEventListener("fullscreenchange",function(){ aplicarIdioma(); ajustarTamano(); dibujar() })
  audio.addEventListener("play",function(){ prepararEfecto(); actualizarControles(); reanudarDibujo() })
  audio.addEventListener("pause",function(){ detenerDibujo(); actualizarControles() })
  audio.addEventListener("ended",actualizarControles)
  audio.addEventListener("emptied",function(){
    limpiarForma()
    actualizarControles()
    dibujar()
  })
  audio.addEventListener("loadedmetadata",function(){ actualizarControles(); cargarFormaCancion() })
  audio.addEventListener("timeupdate",dibujarOndaProgreso)
  audio.addEventListener("seeked",dibujarOndaProgreso)
  document.querySelector("#progreso").addEventListener("input",dibujarOndaProgreso)
  milkdrop.addEventListener("webglcontextlost",function(evento){
    evento.preventDefault()
    mostrarErrorEfecto(new Error("Contexto WebGL perdido"))
    dibujar()
  })
  window.addEventListener("pagehide",function(){ if(ventana){ restaurarVisualizador() } })
  window.addEventListener("resize",function(){ ajustarTamano(); dibujar() })
  const observarPista = new MutationObserver(actualizarControles)
  observarPista.observe(tituloPrincipal,{childList:true,characterData:true,subtree:true})
  observarPista.observe(artistaPrincipal,{childList:true,characterData:true,subtree:true})
  const observarTamano = new ResizeObserver(function(){ ajustarTamano(); dibujar() })
  observarTamano.observe(escenario)
  observarTamano.observe(onda)

  window.visualizadorErin = {
    get diagnostico(){
      return {dependencia,efecto:selector.value,ventana:tipoVentana,animando:fotograma !== null,minimizado,ancho:milkdrop.width,alto:milkdrop.height,anchoMotor,altoMotor,barras:alturasCancion?.length || 0}
    }
  }
  aplicarIdioma()
  ajustarTamano()
  dibujar()
  cargarEfectos()
  if(audio.readyState >= 1){ cargarFormaCancion() }
})()
