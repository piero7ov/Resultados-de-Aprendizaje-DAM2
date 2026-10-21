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
    createBiquadFilter(){
      const nodo = this.nodo("filtro")
      nodo.frequency = {value:0}
      nodo.Q = {value:0}
      nodo.gain = {value:0,setTargetAtTime(valor){ this.value = valor }}
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
const margen = prueba.nodos.filter(nodo=>nodo.tipo === "ganancia")[1]
const filtros = prueba.nodos.filter(nodo=>nodo.tipo === "filtro")
assert.equal(filtros.length,5)
assert.deepEqual(filtros.map(nodo=>nodo.frequency.value),[100,400,1000,4000,10000])
assert.deepEqual(fuente.conexiones,[margen])
assert.deepEqual(margen.conexiones,[filtros[0]])
filtros.forEach((filtro,indice)=>assert.deepEqual(filtro.conexiones,[filtros[indice+1] || analizador]))
assert.equal(margen.gain.value,1,"EQ plano no cambia la ganancia")
assert.deepEqual(analizador.conexiones,[ganancia])
assert.equal(ganancia.conexiones.length,1)
assert.equal(ganancia.conexiones[0].tipo,"salida")
prueba.api.cambiarVolumen(0.5)
assert.ok(Math.abs(ganancia.gain.value - 0.3) < 1e-12)
prueba.api.cambiarVolumen(0)
assert.equal(ganancia.gain.value,0)
assert.deepEqual(fuente.conexiones,[margen],"El volumen no altera las conexiones")
prueba.api.cambiarBanda(2,6)
assert.equal(filtros[2].gain.value,6)
assert.ok(margen.gain.value < 0.51,"Reservar margen para realces")
prueba.api.cambiarBanda(0,-20)
assert.equal(filtros[0].gain.value,-6)
prueba.api.cambiarBanda(4,20)
assert.equal(filtros[4].gain.value,6)
prueba.api.cambiarBanda(1,NaN)
assert.equal(filtros[1].gain.value,0)
prueba.api.cambiarBanda(8,3)
prueba.api.restablecerBandas()
assert.ok(filtros.every(filtro=>filtro.gain.value === 0))
assert.equal(margen.gain.value,1)
const anticipado = entorno()
anticipado.api.cambiarBanda(0,3)
anticipado.api.preparar()
assert.equal(anticipado.nodos.find(nodo=>nodo.tipo === "filtro").gain.value,3)
assert.equal(prueba.fuentes(),1,"El EQ no recrea la fuente")
const respaldo = entorno(false)
respaldo.api.cambiarVolumen(0.5)
respaldo.api.preparar()
assert.ok(Math.abs(respaldo.elemento.volume - 0.3) < 1e-12)
assert.ok(respaldo.eventos.includes("erinwave-audio-no-disponible"))
console.log("OK: volumen progresivo, fuente única, cinco filtros, margen, límites, reset y respaldo sin Web Audio.")
