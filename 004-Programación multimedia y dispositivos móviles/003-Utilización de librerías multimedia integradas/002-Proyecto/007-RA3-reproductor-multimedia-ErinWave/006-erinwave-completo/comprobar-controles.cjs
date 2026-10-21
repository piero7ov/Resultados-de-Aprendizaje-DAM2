// Pruebas de interfaz simulada: no escriben en la biblioteca ni reproducen audio.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const path = require("node:path")
const elementos = new Map()
class Elemento{
  constructor(){
    this.eventos = {}
    this.children = []
    this.value = 0
    this.pulsaciones = 0
    this.classList = {toggle(){}}
  }
  setAttribute(clave,valor){ this[clave] = valor }
  addEventListener(clave,funcion){ (this.eventos[clave] ||= []).push(funcion) }
  dispatchEvent(evento){
    for(const funcion of this.eventos[evento.type] || []){ funcion(evento) }
  }
  append(...nuevos){
    this.children.push(...nuevos)
    nuevos.forEach(nuevo=>{ if(nuevo.id){ elementos.set(nuevo.id,nuevo) } })
  }
  querySelectorAll(){
    return this.children.flatMap(hijo=>hijo.children).filter(hijo=>hijo.type === "range")
  }
  click(){ this.pulsaciones++; this.dispatchEvent({type:"click"}) }
}
const documento = new Elemento()
documento.documentElement = {lang:"es"}
documento.createElement = ()=>new Elemento()
documento.querySelector = selector=>{
  const id = selector.slice(1)
  if(!elementos.has(id)){ elementos.set(id,new Elemento()) }
  return elementos.get(id)
}
const valores = [0,0,0,0,0]
const ventana = {
  audioErin:{
    bandas:valores,
    noDisponible:false,
    cambiarBanda(indice,valor){ valores[indice] = Number(valor) },
    restablecerBandas(){ valores.fill(0) }
  }
}
vm.runInNewContext(fs.readFileSync(path.join(__dirname,"erinwave.js"),"utf8"),{window:ventana,document:documento,Event})
const obtener = id=>documento.querySelector("#"+id)
const boton = obtener("botonEcualizador")
const panel = obtener("panelEcualizador")
boton.click()
assert.equal(panel.inert,false)
assert.equal(panel["aria-hidden"],"false")
assert.equal(boton.title,"Cerrar ecualizador")
const entradas = obtener("bandasEcualizador").querySelectorAll()
assert.equal(entradas.length,5)
entradas[0].value = "4"
entradas[0].dispatchEvent({type:"input"})
assert.equal(valores[0],4)
assert.equal(obtener("valorBanda0").textContent,"+4 dB")
obtener("restablecerEcualizador").click()
assert.deepEqual(valores,[0,0,0,0,0])
documento.documentElement.lang = "en"
documento.dispatchEvent({type:"erinwave-idioma"})
assert.equal(boton.title,"Close equalizer")
assert.equal(entradas[0]["aria-label"],"Adjust 100 Hz")
boton.click()
assert.equal(panel.inert,true)
assert.equal(boton.title,"Open equalizer")

function tecla(key,extras = {},destino = documento){
  const evento = {type:"keydown",key,currentTarget:destino,target:{closest(){return null}},preventDefault(){this.prevenida=true},...extras}
  destino.dispatchEvent(evento)
  return evento
}
assert.equal(tecla(" ").prevenida,true)
assert.equal(obtener("reproducir").pulsaciones,1)
tecla("k",{repeat:true})
assert.equal(obtener("reproducir").pulsaciones,1)
tecla("n"); tecla("p")
assert.equal(obtener("siguiente").pulsaciones,1)
assert.equal(obtener("anterior").pulsaciones,1)
for(const key of [" ","k","j","l","n","p","ArrowUp","ArrowDown","m","e"]){
  assert.equal(tecla(key,{target:{closest(){return {tagName:"INPUT"}}}}).prevenida,undefined)
  assert.equal(tecla(key,{target:{isContentEditable:true}}).prevenida,undefined)
  assert.equal(tecla(key,{ctrlKey:true}).prevenida,undefined)
  assert.equal(tecla(key,{isComposing:true}).prevenida,undefined)
}
const volumen = obtener("volumen")
volumen.value = 0.3
tecla("ArrowUp")
assert.equal(volumen.value,0.35)
tecla("m")
assert.equal(volumen.value,0)
tecla("m")
assert.equal(volumen.value,0.35)
volumen.value = 1
tecla("ArrowUp")
assert.equal(volumen.value,1)
volumen.value = 0
tecla("ArrowDown")
assert.equal(volumen.value,0)
const audio = obtener("audio")
audio.duration = 100
audio.currentTime = 95
tecla("l")
assert.equal(obtener("progreso").value,100)
audio.currentTime = 2
tecla("j")
assert.equal(obtener("progreso").value,0)
audio.duration = NaN
tecla("l")
assert.equal(obtener("progreso").value,0)

const pip = new Elemento()
ventana.controlesErin.conectarAtajos(pip)
ventana.controlesErin.conectarAtajos(pip)
assert.equal(pip.eventos.keydown.length,1)
tecla("k",{},pip)
assert.equal(obtener("reproducir").pulsaciones,2)
assert.equal(tecla("e",{},pip).prevenida,undefined)
ventana.audioErin.noDisponible = true
documento.dispatchEvent({type:"erinwave-audio-no-disponible"})
assert.equal(obtener("avisoEcualizador").hidden,false)
assert.ok(entradas.every(entrada=>entrada.disabled))

const reproductor = fs.readFileSync(path.join(__dirname,"reproductor.js"),"utf8")
const expresionDebug = reproductor.match(/const MOSTRAR_PANEL_PRUEBAS_KARAOKE = (.+)/)[1]
for(const [search,esperado] of [["",false],["?debug=0",false],["?debug=1",true]]){
  assert.equal(vm.runInNewContext(expresionDebug,{URLSearchParams,window:{location:{search}}}),esperado)
}
const html = fs.readFileSync(path.join(__dirname,"index.html"),"utf8")
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(resultado=>resultado[1])
assert.equal(ids.length,new Set(ids).size,"IDs únicos")
assert.match(html,/id="panelEcualizador"[^>]* inert aria-hidden="true"/)
assert.match(html,/id="botonEcualizador"[^>]*aria-expanded="false"/)
assert.ok(fs.statSync(path.join(__dirname,"fuentes/Audiowide-Regular.ttf")).size > 10000)
console.log("OK (simulado): cinco bandas, plegado accesible, ES/EN, atajos y límites, protección de formularios, PiP y debug optativo.")
