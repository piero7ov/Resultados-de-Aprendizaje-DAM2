(function(){
  const boton = document.querySelector("#botonEcualizador")
  const panel = document.querySelector("#panelEcualizador")
  const contenedor = document.querySelector("#bandasEcualizador")
  const restablecer = document.querySelector("#restablecerEcualizador")
  const aviso = document.querySelector("#avisoEcualizador")
  const audio = document.querySelector("#audio")
  const volumen = document.querySelector("#volumen")
  const frecuencias = ["100 Hz","400 Hz","1 kHz","4 kHz","10 kHz"]
  const textos = {
    es:{titulo:"Ecualizador",abrir:"Abrir ecualizador",cerrar:"Cerrar ecualizador",restablecer:"Restablecer ecualizador",banda:"Ajustar",error:"El ecualizador no está disponible en este navegador. Puedes seguir escuchando música."},
    en:{titulo:"Equalizer",abrir:"Open equalizer",cerrar:"Close equalizer",restablecer:"Reset equalizer",banda:"Adjust",error:"The equalizer is unavailable in this browser. You can still listen to music."}
  }
  let abierto = false
  let ultimoVolumen = 0.3
  const documentos = new WeakSet()

  function texto(){ return textos[document.documentElement.lang] || textos.es }

  function actualizarBandas(){
    const valores = window.audioErin.bandas
    contenedor.querySelectorAll("input").forEach(function(entrada,indice){
      entrada.value = valores[indice]
      const valor = (valores[indice] > 0 ? "+" : "") + valores[indice] + " dB"
      entrada.setAttribute("aria-valuetext",valor)
      document.querySelector("#valorBanda" + indice).textContent = valor
    })
  }

  frecuencias.forEach(function(frecuencia,indice){
    const banda = document.createElement("div")
    banda.className = "banda-ecualizador"
    const etiqueta = document.createElement("label")
    etiqueta.htmlFor = "banda" + indice
    etiqueta.textContent = frecuencia
    const entrada = document.createElement("input")
    entrada.id = "banda" + indice
    entrada.type = "range"
    entrada.min = "-6"
    entrada.max = "6"
    entrada.step = "1"
    entrada.value = "0"
    entrada.setAttribute("aria-orientation","vertical")
    entrada.addEventListener("input",function(){
      window.audioErin.cambiarBanda(indice,entrada.value)
      actualizarBandas()
    })
    const valor = document.createElement("output")
    valor.id = "valorBanda" + indice
    valor.setAttribute("for",entrada.id)
    banda.append(etiqueta,entrada,valor)
    contenedor.append(banda)
  })

  function aplicarIdioma(){
    const idioma = texto()
    document.querySelector("#tituloEcualizador").textContent = idioma.titulo
    boton.title = abierto ? idioma.cerrar : idioma.abrir
    boton.setAttribute("aria-label",boton.title)
    restablecer.title = idioma.restablecer
    restablecer.setAttribute("aria-label",idioma.restablecer)
    contenedor.querySelectorAll("input").forEach(function(entrada,indice){
      entrada.setAttribute("aria-label",idioma.banda + " " + frecuencias[indice])
    })
    aviso.textContent = idioma.error
    aviso.hidden = !window.audioErin.noDisponible
  }

  function cambiarPanel(){
    abierto = !abierto
    boton.setAttribute("aria-expanded",String(abierto))
    panel.classList.toggle("abierto",abierto)
    panel.inert = !abierto
    panel.setAttribute("aria-hidden",String(!abierto))
    aplicarIdioma()
  }

  boton.addEventListener("click",cambiarPanel)
  restablecer.addEventListener("click",function(){
    window.audioErin.restablecerBandas()
    actualizarBandas()
  })
  document.addEventListener("erinwave-idioma",aplicarIdioma)
  document.addEventListener("erinwave-audio-no-disponible",function(){
    contenedor.querySelectorAll("input").forEach(function(entrada){ entrada.disabled = true })
    restablecer.disabled = true
    aplicarIdioma()
  })

  function cambiarVolumen(valor){
    volumen.value = Math.max(0,Math.min(1,valor))
    volumen.dispatchEvent(new Event("input",{bubbles:true}))
  }

  function manejarTecla(evento){
    if(evento.defaultPrevented || evento.isComposing || evento.ctrlKey || evento.altKey || evento.metaKey || evento.shiftKey){ return }
    const destino = evento.target
    if(destino?.isContentEditable || destino?.closest?.("input,textarea,select,button,a,[role='slider'],[role='textbox']")){ return }
    const tecla = evento.key.toLowerCase()
    if(![" ","k","j","l","n","p","arrowup","arrowdown","m","e"].includes(tecla)){ return }
    // El ecualizador permanece en la página principal, nunca ocupa el PiP.
    if(tecla === "e" && evento.currentTarget !== document){ return }
    evento.preventDefault()
    if(evento.repeat && [" ","k","n","p","m","e"].includes(tecla)){ return }
    if(tecla === " " || tecla === "k"){ document.querySelector("#reproducir").click() }
    if(tecla === "n"){ document.querySelector("#siguiente").click() }
    if(tecla === "p"){ document.querySelector("#anterior").click() }
    if(tecla === "e"){ boton.click() }
    if((tecla === "j" || tecla === "l") && Number.isFinite(audio.duration) && audio.duration > 0){
      const progreso = document.querySelector("#progreso")
      progreso.value = Math.max(0,Math.min(audio.duration,audio.currentTime + (tecla === "j" ? -10 : 10)))
      progreso.dispatchEvent(new Event("input",{bubbles:true}))
    }
    if(tecla === "arrowup"){ cambiarVolumen(Number(volumen.value) + 0.05) }
    if(tecla === "arrowdown"){ cambiarVolumen(Number(volumen.value) - 0.05) }
    if(tecla === "m"){
      if(Number(volumen.value) > 0){ ultimoVolumen = Number(volumen.value); cambiarVolumen(0) }
      else{ cambiarVolumen(ultimoVolumen) }
    }
  }

  function conectarAtajos(documento){
    if(documentos.has(documento)){ return }
    documentos.add(documento)
    documento.addEventListener("keydown",manejarTecla)
  }

  window.controlesErin = {conectarAtajos}
  conectarAtajos(document)
  actualizarBandas()
  aplicarIdioma()
})()
