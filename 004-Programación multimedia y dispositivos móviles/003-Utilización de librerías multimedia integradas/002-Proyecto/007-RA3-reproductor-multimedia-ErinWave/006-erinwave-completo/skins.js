const selectorAspecto = document.querySelector("#aspecto")
const etiquetaAspecto = document.querySelector("#etiquetaAspecto")
const aspectosDisponibles = ["aero","metalica-azul","winamp-classic","fallout-pip-boy","mmd3"]
const botonColaMetalica = document.querySelector("#abrirColaMetalica")
const botonBibliotecaMetalica = document.querySelector("#abrirBibliotecaMetalica")
const panelColaMetalica = document.querySelector("#panelCola")
const panelBibliotecaMetalica = document.querySelector("#panelBiblioteca")
const grupoPanelesMetalicos = document.querySelector(".accesos-skin-metalica")
const botonPausaMetalica = document.querySelector("#pausarMetalica")
const botonDetenerMetalica = document.querySelector("#detenerMetalica")
const audioMetalico = document.querySelector("#audio")
const alojamientoVisualizador = document.querySelector("#alojamientoVisualizador")
const pantallaReproductor = document.querySelector(".pantalla")
const controlesReproductor = document.querySelector("#panelControles")
const panelAbiertoPorAspecto = {"metalica-azul":"","winamp-classic":"cola","fallout-pip-boy":"cola","mmd3":"cola"}
let ecualizadorAbiertoPorSkin = false

function actualizarIdiomaAspecto(){
  const ingles = document.documentElement.lang === "en"
  etiquetaAspecto.textContent = ingles ? "Skin" : "Aspecto"
  selectorAspecto.setAttribute("aria-label",ingles ? "Player skin" : "Aspecto del reproductor")
  selectorAspecto.options[1].textContent = "Winamp Retro Chrome"
  selectorAspecto.options[2].textContent = "Winamp Classic"
  selectorAspecto.options[3].textContent = "Fallout Pip-Boy"
  selectorAspecto.options[4].textContent = "MMD3"
  grupoPanelesMetalicos.setAttribute("aria-label",ingles ? "Player panels" : "Paneles del reproductor")
  botonColaMetalica.title = ingles ? "Playlist" : "Cola de reproducción"
  botonBibliotecaMetalica.title = ingles ? "Media library" : "Biblioteca musical"
  botonColaMetalica.setAttribute("aria-label",botonColaMetalica.title)
  botonBibliotecaMetalica.setAttribute("aria-label",botonBibliotecaMetalica.title)
  botonPausaMetalica.title = ingles ? "Pause" : "Pausar"
  botonDetenerMetalica.title = ingles ? "Stop" : "Detener"
  botonPausaMetalica.setAttribute("aria-label",botonPausaMetalica.title)
  botonDetenerMetalica.setAttribute("aria-label",botonDetenerMetalica.title)
}

function actualizarPanelesMetalicos(){
  const aspecto = document.body.dataset.skin
  const esCompacta = Object.hasOwn(panelAbiertoPorAspecto,aspecto)

  for(const [nombre,panel,boton] of [
    ["cola",panelColaMetalica,botonColaMetalica],
    ["biblioteca",panelBibliotecaMetalica,botonBibliotecaMetalica]
  ]){
    const abierto = esCompacta && panelAbiertoPorAspecto[aspecto] === nombre
    panel.classList.toggle("abierta-skin",abierto)
    panel.inert = esCompacta && !abierto
    if(esCompacta){
      panel.setAttribute("aria-hidden",String(!abierto))
    }else{
      panel.removeAttribute("aria-hidden")
    }
    boton.setAttribute("aria-expanded",String(abierto))
  }
}

function sincronizarEcualizadorMetalico(){
  const boton = document.querySelector("#botonEcualizador")
  if(document.body.dataset.skin !== "mmd3" && Object.hasOwn(panelAbiertoPorAspecto,document.body.dataset.skin)){
    if(boton.getAttribute("aria-expanded") !== "true"){
      boton.click()
      ecualizadorAbiertoPorSkin = true
    }
  }else if(ecualizadorAbiertoPorSkin){
    if(boton.getAttribute("aria-expanded") === "true"){
      boton.click()
    }
    ecualizadorAbiertoPorSkin = false
  }
}

function aplicarAspecto(aspecto){
  const elegido = aspectosDisponibles.includes(aspecto) ? aspecto : "aero"
  document.body.dataset.skin = elegido
  selectorAspecto.value = elegido

  if(elegido === "fallout-pip-boy" && alojamientoVisualizador.parentElement !== controlesReproductor.parentElement){
    controlesReproductor.after(alojamientoVisualizador)
  }else if(elegido !== "fallout-pip-boy" && alojamientoVisualizador.parentElement !== pantallaReproductor){
    pantallaReproductor.append(alojamientoVisualizador)
  }

  actualizarPanelesMetalicos()

  if(document.readyState !== "loading"){
    sincronizarEcualizadorMetalico()
  }

  const visualizador = document.querySelector("#visualizador")
  if(visualizador && visualizador.ownerDocument !== document){
    visualizador.ownerDocument.body.dataset.skin = elegido
  }
  document.dispatchEvent(new Event("erinwave-aspecto"))
}

let aspectoGuardado = "aero"
try{
  aspectoGuardado = localStorage.getItem("erinwave-skin") || "aero"
}catch(error){
  console.warn("No se pudo leer la preferencia de aspecto",error)
}

aplicarAspecto(aspectoGuardado)
actualizarIdiomaAspecto()

selectorAspecto.addEventListener("change",function(){
  aplicarAspecto(selectorAspecto.value)

  try{
    localStorage.setItem("erinwave-skin",selectorAspecto.value)
  }catch(error){
    console.warn("No se pudo guardar la preferencia de aspecto",error)
  }
})

botonColaMetalica.addEventListener("click",function(){
  const aspecto = document.body.dataset.skin
  panelAbiertoPorAspecto[aspecto] = panelAbiertoPorAspecto[aspecto] === "cola" ? "" : "cola"
  actualizarPanelesMetalicos()
})

botonBibliotecaMetalica.addEventListener("click",function(){
  const aspecto = document.body.dataset.skin
  panelAbiertoPorAspecto[aspecto] = panelAbiertoPorAspecto[aspecto] === "biblioteca" ? "" : "biblioteca"
  actualizarPanelesMetalicos()
})

botonPausaMetalica.addEventListener("click",function(){
  audioMetalico.pause()
})

botonDetenerMetalica.addEventListener("click",function(){
  audioMetalico.pause()
  if(audioMetalico.currentSrc){
    audioMetalico.currentTime = 0
    audioMetalico.dispatchEvent(new Event("timeupdate"))
  }
})

document.addEventListener("DOMContentLoaded",sincronizarEcualizadorMetalico)
document.addEventListener("erinwave-idioma",actualizarIdiomaAspecto)
