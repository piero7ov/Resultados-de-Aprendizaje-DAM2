// Prueba del ciclo PiP con ventanas simuladas: no reemplaza la prueba real del navegador.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const path = require("node:path")
const codigo = fs.readFileSync(path.join(__dirname,"visualizador.js"),"utf8")
const elementos = new Map()

class Eventos{
  constructor(){ this.eventos = new Map() }
  addEventListener(nombre,accion){ this.eventos.set(nombre,accion) }
  dispatchEvent(evento){ return this.eventos.get(evento.type)?.(evento) }
}

let barrasDibujadas = 0
const dibujo = new Proxy({},{
  get(objeto,clave){
    if(clave === "roundRect"){ return ()=>{ barrasDibujadas++ } }
    if(clave === "createLinearGradient"){ return ()=>({addColorStop(){}}) }
    return ()=>{}
  },
  set(){ return true }
})

class Elemento extends Eventos{
  constructor(id,documento){
    super()
    this.id = id
    this.ownerDocument = documento
    this.hidden = false
    this.value = ""
    this.options = []
    this.dataset = {}
    this.children = []
    this.width = 600
    this.height = 190
    this.textContent = ""
    this.innerHTML = "<svg></svg>"
    this.clientWidth = 600
    this.caja = {width:600,height:190}
    this.classList = {toggle(){}}
  }
  getContext(){ return dibujo }
  setAttribute(nombre,valor){ this[nombre] = valor }
  getAttribute(nombre){ return this[nombre] || null }
  getBoundingClientRect(){ return this.caja }
  querySelector(selector){ return elementos.get(selector.slice(1)) }
  append(elemento){
    elemento.parentNode = this
    elemento.ownerDocument = this.ownerDocument
    this.children.push(elemento)
    if(this.id === "escenaVisualizador"){ this.options.push(elemento) }
    if(elemento.id === "script"){ queueMicrotask(()=>elemento.onload()) }
  }
  prepend(elemento){ this.append(elemento) }
  replaceChildren(){ this.children = []; this.options = [] }
  focus(){}
  click(){ return this.dispatchEvent({type:"click"}) }
}

function crearVentana(){
  const ventana = new Eventos()
  const documento = new Eventos()
  documento.defaultView = ventana
  documento.documentElement = {lang:"es"}
  documento.hidden = false
  documento.baseURI = "http://localhost/prueba/"
  documento.querySelector = selector=>elementos.get(selector.slice(1))
  documento.createElement = nombre=>new Elemento(nombre,documento)
  documento.head = new Elemento("head",documento)
  documento.body = new Elemento("body",documento)
  ventana.document = documento
  ventana.closed = false
  ventana.devicePixelRatio = 1
  ventana.frames = new Map()
  let identificador = 0
  ventana.requestAnimationFrame = accion=>{
    ventana.frames.set(++identificador,accion)
    return identificador
  }
  ventana.cancelAnimationFrame = id=>ventana.frames.delete(id)
  ventana.close = ()=>{
    ventana.closed = true
    ventana.dispatchEvent({type:"pagehide"})
  }
  return ventana
}

async function comprobar(){
  const principal = crearVentana()
  const ids = [
    "audio","visualizador","alojamientoVisualizador","escenarioVisualizador","ondaProgreso",
    "plegarVisualizador","contenidoVisualizador","progreso","lienzoMilkdrop","escenaVisualizador","ventanaVisualizador",
    "pantallaCompletaVisualizador","siguienteEscena","recuperarVisualizador","avisoVisualizador",
    "volumen","volumenFlotante","tituloPista","artistaPista","tituloFlotante","artistaFlotante",
    "reproducirFlotante","anteriorFlotante","siguienteFlotante","reproducir","anterior","siguiente",
    "valorVolumenFlotante","nombreVisualizador","etiquetaVolumenFlotante"
  ]
  ids.forEach(id=>elementos.set(id,new Elemento(id,principal.document)))
  const obtener = id=>elementos.get(id)
  const audio = obtener("audio")
  audio.paused = true
  audio.readyState = 4
  audio.currentTime = 40
  audio.src = "audio/ejemplo.mp3"
  obtener("volumen").value = "0.3"
  obtener("escenaVisualizador").value = ""
  obtener("escenaVisualizador").options = []
  obtener("alojamientoVisualizador").append(obtener("visualizador"))
  principal.audioErin = {contexto:{},analizador:{}}
  let dibujos = 0
  let decodificaciones = 0
  let cambiosTamano = 0
  principal.butterchurnPresets = {getPresets:()=>({"Geiss prueba":{}})}
  principal.butterchurn = {createVisualizer:()=>({
    connectAudio(){},loadPreset(){},
    render(){ dibujos++ },
    setRendererSize(ancho,alto){
      assert.equal(ancho,obtener("lienzoMilkdrop").width,"Viewport y buffer deben coincidir")
      assert.equal(alto,obtener("lienzoMilkdrop").height,"Viewport y buffer deben coincidir")
      cambiosTamano++
    }
  })}
  principal.OfflineAudioContext = class{
    async decodeAudioData(){
      decodificaciones++
      return {numberOfChannels:2,getChannelData:()=>new Float32Array(384).fill(0.5)}
    }
  }
  const observadores = []
  principal.open = ()=>null
  const contexto = {
    window:principal,document:principal.document,console:{info(){},warn(){}},URL,Event,AbortController,
    MutationObserver:class{ observe(){} },
    ResizeObserver:class{ constructor(accion){ observadores.push(accion) } observe(){} },
    fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)})
  }
  vm.runInNewContext(codigo,contexto)
  await new Promise(setImmediate)
  assert.equal(principal.visualizadorErin.diagnostico.dependencia,"lista")
  assert.equal(obtener("escenaVisualizador").options.length,1)
  assert.ok(obtener("escenaVisualizador").options.every(opcion=>opcion.value.startsWith("milkdrop:")))
  assert.equal(principal.visualizadorErin.diagnostico.barras,192)
  audio.dispatchEvent({type:"loadedmetadata"})
  await new Promise(setImmediate)
  assert.equal(decodificaciones,1,"Reutilizar la forma de la canción durante la sesión")
  obtener("escenarioVisualizador").caja = {width:1234,height:900}
  observadores.forEach(accion=>accion())
  assert.ok(cambiosTamano > 0)
  assert.ok(obtener("lienzoMilkdrop").height <= 720)
  audio.paused = false
  audio.dispatchEvent({type:"play"})
  assert.equal(principal.frames.size,1)
  const dibujarFotograma = Array.from(principal.frames.values())[0]
  principal.frames.clear()
  dibujarFotograma(200)
  assert.equal(principal.frames.size,1)
  await obtener("plegarVisualizador").click()
  assert.equal(obtener("plegarVisualizador")["aria-expanded"],"false")
  assert.equal(obtener("contenidoVisualizador").inert,true)
  assert.equal(principal.frames.size,0,"Plegar detiene el visualizador")
  const dibujosAntes = dibujos
  observadores.forEach(accion=>accion())
  assert.equal(dibujos,dibujosAntes,"No dibujar al redimensionar mientras está plegado")
  const barrasAntes = barrasDibujadas
  audio.dispatchEvent({type:"timeupdate"})
  assert.ok(barrasDibujadas > barrasAntes,"La barra de progreso sigue dibujando con el visor plegado")
  assert.equal(audio.currentTime,40)
  assert.equal(audio.paused,false)
  await obtener("plegarVisualizador").click()
  assert.equal(principal.frames.size,1)
  assert.equal(obtener("contenidoVisualizador").inert,false)

  let flotante = crearVentana()
  principal.documentPictureInPicture = {requestWindow:async()=>flotante}
  await obtener("ventanaVisualizador").click()
  assert.equal(obtener("visualizador").ownerDocument,flotante.document)
  assert.equal(principal.frames.size,0)
  assert.equal(flotante.frames.size,1,"El bucle de dibujo pertenece a PiP")
  assert.equal(principal.visualizadorErin.diagnostico.ventana,"pip")
  assert.equal(obtener("pantallaCompletaVisualizador").hidden,true)
  assert.equal(audio.currentTime,40,"PiP no cambia la sincronización")
  obtener("escenarioVisualizador").caja = {width:440,height:210}
  flotante.dispatchEvent({type:"resize"})
  assert.equal(obtener("lienzoMilkdrop").width,440)
  assert.equal(principal.visualizadorErin.diagnostico.anchoMotor,440)
  flotante.devicePixelRatio = 2
  flotante.dispatchEvent({type:"resize"})
  assert.equal(obtener("lienzoMilkdrop").width,660)
  assert.equal(principal.visualizadorErin.diagnostico.anchoMotor,660)
  flotante.close()
  assert.equal(obtener("visualizador").ownerDocument,principal.document)
  assert.equal(obtener("recuperarVisualizador").hidden,true)
  assert.equal(flotante.frames.size,0)
  assert.equal(principal.frames.size,1)

  flotante = crearVentana()
  await obtener("ventanaVisualizador").click()
  await obtener("recuperarVisualizador").click()
  assert.equal(flotante.closed,true)
  assert.equal(obtener("visualizador").ownerDocument,principal.document)
  assert.equal(principal.frames.size,1,"No duplicar bucles al volver")

  principal.documentPictureInPicture.requestWindow = async()=>{ throw new Error("Denegado") }
  await obtener("ventanaVisualizador").click()
  assert.equal(obtener("visualizador").ownerDocument,principal.document)
  assert.equal(obtener("avisoVisualizador").hidden,false)

  delete principal.documentPictureInPicture
  await obtener("ventanaVisualizador").click()
  assert.match(obtener("avisoVisualizador").textContent,/emergentes/)
  flotante = crearVentana()
  principal.open = ()=>flotante
  await obtener("ventanaVisualizador").click()
  assert.equal(principal.visualizadorErin.diagnostico.ventana,"normal")
  assert.equal(obtener("pantallaCompletaVisualizador").hidden,false)
  await obtener("ventanaVisualizador").click()
  assert.equal(obtener("visualizador").ownerDocument,principal.document)
  audio.paused = true
  audio.dispatchEvent({type:"pause"})
  assert.equal(principal.frames.size,0)
  assert.equal(audio.currentTime,40)
  console.log("OK (simulado): solo MilkDrop, forma/caché, plegado, canvas/viewport, PiP, retorno, errores y reloj único.")
}

comprobar().catch(error=>{ console.error(error); process.exitCode = 1 })
