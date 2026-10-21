// Una sola fuente: el análisis queda antes del volumen para conservar el movimiento.
window.audioErin = (function(){
  const elemento = document.querySelector("#audio")
  const exponente = Math.log(0.3) / Math.log(0.5)
  let contexto = null
  let fuente = null
  let analizador = null
  let ganancia = null
  let nivel = 0.3
  let noDisponible = false

  function curva(valor){
    const numero = Number(valor)
    return Math.pow(Number.isFinite(numero) ? Math.max(0,Math.min(1,numero)) : 0,exponente)
  }

  function cambiarVolumen(valor){
    nivel = Number.isFinite(Number(valor)) ? Math.max(0,Math.min(1,Number(valor))) : 0
    if(ganancia){
      ganancia.gain.setTargetAtTime(curva(nivel),contexto.currentTime,0.015)
    }else{
      elemento.volume = curva(nivel)
    }
    document.dispatchEvent(new Event("erinwave-volumen"))
  }

  function preparar(){
    if(noDisponible){
      return
    }
    if(!contexto){
      const ClaseContexto = window.AudioContext || window.webkitAudioContext
      if(!ClaseContexto){
        noDisponible = true
        document.dispatchEvent(new Event("erinwave-audio-no-disponible"))
        return
      }
      try{
        contexto = new ClaseContexto()
        analizador = contexto.createAnalyser()
        analizador.fftSize = 2048
        analizador.smoothingTimeConstant = 0.8
        ganancia = contexto.createGain()
        ganancia.gain.value = curva(nivel)
        analizador.connect(ganancia)
        ganancia.connect(contexto.destination)
        fuente = contexto.createMediaElementSource(elemento)
        fuente.connect(analizador)
        elemento.volume = 1
        document.dispatchEvent(new Event("erinwave-audio"))
      }catch(error){
        // Si ya se creó la fuente, mantener una salida audible incluso sin analizador.
        if(fuente){
          fuente.disconnect()
          fuente.connect(contexto.destination)
        }
        ganancia = null
        analizador = null
        elemento.volume = curva(nivel)
        noDisponible = true
        document.dispatchEvent(new Event("erinwave-audio-no-disponible"))
        console.warn("No se pudo activar el análisis de audio",error)
      }
    }
    if(contexto && contexto.state === "suspended"){
      contexto.resume().catch(function(error){
        console.warn("El navegador requiere pulsar de nuevo reproducir",error)
      })
    }
  }

  // Crear/reanudar el contexto durante el gesto, antes de cargar los metadatos del MP3.
  document.addEventListener("click",function(evento){
    if(evento.target.closest("#reproducir, #anterior, #siguiente, .datos-cancion, .datos-cola")){
      preparar()
    }
  },true)

  return {
    curva,
    cambiarVolumen,
    preparar,
    get contexto(){ return contexto },
    get analizador(){ return analizador },
    get nivel(){ return nivel }
  }
})()
