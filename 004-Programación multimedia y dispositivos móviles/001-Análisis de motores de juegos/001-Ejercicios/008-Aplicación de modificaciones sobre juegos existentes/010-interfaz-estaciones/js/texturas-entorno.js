function crearAzar(semilla) {
  return function () {
    semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0;
    return semilla / 4294967296;
  };
}

function dibujarPavimento(tipo, color, semilla) {
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 512;
  const contexto = lienzo.getContext("2d");
  const imagen = contexto.createImageData(512, 512);
  const azar = crearAzar(semilla);
  const grano = tipo === "asfalto" ? 24 : tipo === "cesped" ? 32 : 16;
  for (let y = 0; y < 512; y++) {
    for (let x = 0; x < 512; x++) {
      const indice = (y * 512 + x) * 4;
      // Variación periódica para que las teselas no dibujen juntas en los bordes.
      const variacion = Math.sin(x * Math.PI / 128) * Math.cos(y * Math.PI / 256) * 5
        + Math.sin((x + y) * Math.PI / 256) * 4 + (azar() - .5) * grano;
      for (let canal = 0; canal < 3; canal++) {
        imagen.data[indice + canal] = color[canal] + variacion;
      }
      imagen.data[indice + 3] = 255;
    }
  }
  contexto.putImageData(imagen, 0, 0);
  if (tipo === "hormigon" || tipo === "acera") {
    contexto.strokeStyle = tipo === "acera" ? "#817e7060" : "#67645745";
    contexto.lineWidth = tipo === "acera" ? 2 : 1.5;
    const paso = tipo === "acera" ? 128 : 512;
    for (let punto = 0; punto < 512; punto += paso) {
      contexto.beginPath();
      contexto.moveTo(punto, 0); contexto.lineTo(punto, 512);
      contexto.moveTo(0, punto); contexto.lineTo(512, punto);
      contexto.stroke();
    }
  }
  if (tipo === "asfalto") {
    for (let indice = 0; indice < 850; indice++) {
      contexto.fillStyle = indice % 2 ? "#c9c6b328" : "#141a1d30";
      contexto.fillRect(azar() * 512, azar() * 512, 1.5, 1.5);
    }
  }
  return lienzo;
}

export function crearMaterialesEntorno(THREE) {
  const materiales = {};
  const definiciones = [
    ["asfalto", [58, 63, 65], 31, .018],
    ["hormigon", [163, 157, 140], 72, .012],
    ["acera", [188, 181, 158], 19, .012],
    ["cesped", [87, 113, 53], 54, .035],
    ["tierra", [118, 91, 61], 87, .025]
  ];
  for (const [tipo, color, semilla, relieve] of definiciones) {
    const mapa = new THREE.CanvasTexture(dibujarPavimento(tipo, color, semilla));
    mapa.wrapS = mapa.wrapT = THREE.RepeatWrapping;
    mapa.colorSpace = THREE.SRGBColorSpace;
    mapa.anisotropy = 4;
    const rugosidad = mapa.clone();
    rugosidad.colorSpace = THREE.NoColorSpace;
    materiales[tipo] = new THREE.MeshStandardMaterial({
      map: mapa, bumpMap: rugosidad, bumpScale: relieve,
      roughness: tipo === "asfalto" ? .96 : .9, metalness: 0
    });
  }
  return materiales;
}
