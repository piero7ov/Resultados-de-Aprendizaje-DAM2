(function(raiz,fabrica){
  const api = fabrica()

  if(typeof module === "object" && module.exports){
    module.exports = api
  }

  if(raiz){
    raiz.conversorWav = api
  }
})(typeof window !== "undefined" ? window : globalThis,function(){
  function escribirTexto(vista,desplazamiento,texto){
    for(let indice = 0; indice < texto.length; indice += 1){
      vista.setUint8(desplazamiento + indice,texto.charCodeAt(indice))
    }
  }

  function crearWav(audioBuffer,segundosMaximos){
    if(!audioBuffer || !Number.isFinite(audioBuffer.sampleRate) || audioBuffer.sampleRate <= 0
      || !Number.isInteger(audioBuffer.numberOfChannels) || audioBuffer.numberOfChannels < 1
      || !Number.isInteger(audioBuffer.length) || audioBuffer.length < 1){
      throw new Error("El audio decodificado no es válido")
    }

    let duracion = Number(segundosMaximos)

    if(!Number.isFinite(duracion) || duracion <= 0){
      throw new Error("La duración de conversión no es válida")
    }

    let muestras = Math.min(audioBuffer.length,Math.floor(audioBuffer.sampleRate * duracion))
    let canales = audioBuffer.numberOfChannels
    let bytesPorMuestra = 2
    let bytesAudio = muestras * canales * bytesPorMuestra

    if(muestras < 1 || bytesAudio > 0xffffffff - 36){
      throw new Error("El fragmento es demasiado grande para WAV")
    }

    let salida = new ArrayBuffer(44 + bytesAudio)
    let vista = new DataView(salida)
    let bloque = canales * bytesPorMuestra

    escribirTexto(vista,0,"RIFF")
    vista.setUint32(4,36 + bytesAudio,true)
    escribirTexto(vista,8,"WAVE")
    escribirTexto(vista,12,"fmt ")
    vista.setUint32(16,16,true)
    vista.setUint16(20,1,true)
    vista.setUint16(22,canales,true)
    vista.setUint32(24,audioBuffer.sampleRate,true)
    vista.setUint32(28,audioBuffer.sampleRate * bloque,true)
    vista.setUint16(32,bloque,true)
    vista.setUint16(34,bytesPorMuestra * 8,true)
    escribirTexto(vista,36,"data")
    vista.setUint32(40,bytesAudio,true)

    let canalesAudio = []

    for(let canal = 0; canal < canales; canal += 1){
      canalesAudio.push(audioBuffer.getChannelData(canal))
    }

    let desplazamiento = 44

    for(let indice = 0; indice < muestras; indice += 1){
      for(let canal = 0; canal < canales; canal += 1){
        let muestra = Math.max(-1,Math.min(1,canalesAudio[canal][indice]))
        let pcm = muestra < 0 ? muestra * 32768 : muestra * 32767
        vista.setInt16(desplazamiento,Math.round(pcm),true)
        desplazamiento += bytesPorMuestra
      }
    }

    return new Blob([salida],{type:"audio/wav"})
  }

  async function convertirArchivo(url,segundosMaximos){
    let ClaseContexto = window.AudioContext || window.webkitAudioContext

    if(!ClaseContexto){
      throw new Error("Web Audio API no está disponible")
    }

    let contexto = new ClaseContexto()

    try{
      let respuesta = await fetch(url)

      if(!respuesta.ok){
        throw new Error("No se pudo leer el MP3 seleccionado")
      }

      let datos = await respuesta.arrayBuffer()
      let audioBuffer = await contexto.decodeAudioData(datos)
      return crearWav(audioBuffer,segundosMaximos)
    }finally{
      if(contexto.state !== "closed"){
        await contexto.close().catch(function(){})
      }
    }
  }

  return {crearWav,convertirArchivo}
})
