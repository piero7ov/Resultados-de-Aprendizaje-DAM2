// Pruebas locales sin reproducir música, tocar la BBDD ni instalar dependencias.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const path = require("node:path")
const codigo = fs.readFileSync(path.join(__dirname,"audio-visual.js"),"utf8")

function entorno(compatible = true){
  const eventos = []
  const elemento = {volume:1}
  const nodos = []
  let fuentes = 0
  let reanudaciones = 0
  class Contexto{
    constructor(){
      this.currentTime = 0
      this.state = "suspended"
      this.destination = {tipo:"salida"}
    }
    nodo(tipo){
      const nodo = {
        tipo,conexiones:[],
        connect(destino){ this.conexiones.push(destino) },
        disconnect(){ this.conexiones = [] }
      }
      nodos.push(nodo)
      return nodo
    }
    createAnalyser(){ return this.nodo("analizador") }
    createGain(){
      const nodo = this.nodo("ganancia")
      nodo.gain = {value:1,setTargetAtTime(valor){ this.value = valor }}
      return nodo
    }
    createMediaElementSource(audio){
      assert.equal(audio,elemento)
      fuentes++
      return this.nodo("fuente")
    }
    resume(){
      this.state = "running"
      reanudaciones++
      return Promise.resolve()
    }
  }
  const ventana = compatible ? {AudioContext:Contexto} : {}
  const contexto = {
    window:ventana,console,Event,
    document:{
      querySelector(){ return elemento },
      dispatchEvent(evento){ eventos.push(evento.type) },
      addEventListener(){}
    }
  }
  vm.runInNewContext(codigo,contexto)
  return {api:ventana.audioErin,elemento,nodos,eventos,fuentes:()=>fuentes,reanudaciones:()=>reanudaciones}
}

const prueba = entorno()
assert.equal(prueba.api.curva(0),0)
assert.equal(prueba.api.curva(1),1)
assert.ok(Math.abs(prueba.api.curva(0.5) - 0.3) < 1e-12)
assert.ok(prueba.api.curva(0.3) < 0.13)
assert.equal(prueba.api.curva(-2),0)
assert.equal(prueba.api.curva(4),1)
assert.equal(prueba.api.curva(NaN),0)
for(let paso = 1; paso <= 100; paso++){
  assert.ok(prueba.api.curva(paso / 100) > prueba.api.curva((paso - 1) / 100))
}
prueba.api.cambiarVolumen(0.3)
assert.equal(prueba.elemento.volume,prueba.api.curva(0.3))
prueba.api.preparar()
prueba.api.preparar()
assert.equal(prueba.fuentes(),1,"No duplicar la fuente del audio")
assert.equal(prueba.reanudaciones(),1,"Reanudar el contexto suspendido")
assert.equal(prueba.elemento.volume,1)
const fuente = prueba.nodos.find(nodo=>nodo.tipo === "fuente")
const analizador = prueba.nodos.find(nodo=>nodo.tipo === "analizador")
const ganancia = prueba.nodos.find(nodo=>nodo.tipo === "ganancia")
assert.deepEqual(fuente.conexiones,[analizador])
assert.deepEqual(analizador.conexiones,[ganancia])
assert.equal(ganancia.conexiones.length,1)
assert.equal(ganancia.conexiones[0].tipo,"salida")
prueba.api.cambiarVolumen(0.5)
assert.ok(Math.abs(ganancia.gain.value - 0.3) < 1e-12)
prueba.api.cambiarVolumen(0)
assert.equal(ganancia.gain.value,0)
assert.deepEqual(fuente.conexiones,[analizador],"El volumen no altera el análisis")
const respaldo = entorno(false)
respaldo.api.cambiarVolumen(0.5)
respaldo.api.preparar()
assert.ok(Math.abs(respaldo.elemento.volume - 0.3) < 1e-12)
assert.ok(respaldo.eventos.includes("erinwave-audio-no-disponible"))
console.log("OK: curva progresiva, 50% = ganancia 0.30, silencio, fuente única y respaldo sin Web Audio.")
