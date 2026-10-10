import { estaciones } from "./datos-estaciones.js";

const ubicaciones = {
  recepcion: { desplazamiento: -.2, z: 2.35 },
  calidad: { desplazamiento: -.65, z: 2.25 },
  embalaje: { desplazamiento: -.6, z: 2.25 },
  expedicion: { desplazamiento: -.25, z: 2.25 }
};

const texturasPorColor = new Map();

function colorearTela(textura, color) {
  if (texturasPorColor.has(color)) return texturasPorColor.get(color);
  const THREE = window.AFRAME.THREE;
  const lienzo = document.createElement("canvas");
  lienzo.width = 1024;
  lienzo.height = 1024;
  const contexto = lienzo.getContext("2d", { willReadFrequently: true });
  contexto.drawImage(textura.image, 0, 0, lienzo.width, lienzo.height);
  const imagen = contexto.getImageData(0, 0, lienzo.width, lienzo.height);
  const tono = new THREE.Color(color).convertLinearToSRGB();
  for (let indice = 0; indice < imagen.data.length; indice += 4) {
    const rojo = imagen.data[indice];
    const verde = imagen.data[indice + 1];
    const azul = imagen.data[indice + 2];
    // Cambiar únicamente la tela amarilla; conservar ribetes y reflectantes.
    const mezcla = Math.max(0, Math.min(1, (Math.min(rojo, verde) - azul) / 80));
    const intensidad = Math.max(rojo, verde) / 255;
    [tono.r, tono.g, tono.b].forEach(function (canal, desplazamiento) {
      const original = imagen.data[indice + desplazamiento];
      imagen.data[indice + desplazamiento] = original * (1 - mezcla)
        + canal * 255 * intensidad * mezcla;
    });
  }
  contexto.putImageData(imagen, 0, 0);
  const resultado = textura.clone();
  resultado.source = new THREE.Source(lienzo);
  resultado.needsUpdate = true;
  texturasPorColor.set(color, resultado);
  return resultado;
}

function prepararOperario(entidad, estacion) {
  const THREE = window.AFRAME.THREE;
  const modelo = entidad.getObject3D("mesh");
  if (!modelo) throw new Error("No se encontró operario.glb.");

  let telas = 0;
  modelo.traverse(function (elemento) {
    if (!elemento.isMesh) return;
    const materiales = Array.isArray(elemento.material)
      ? elemento.material : [elemento.material];
    const ajustados = materiales.map(function (material) {
      if (!material?.name?.startsWith("Tela del chaleco")) return material;
      const tela = material.clone();
      if (!tela.map) throw new Error("Falta la textura del chaleco.");
      tela.map = colorearTela(tela.map, estacion.color);
      tela.color.set("#ffffff");
      telas++;
      return tela;
    });
    elemento.material = Array.isArray(elemento.material) ? ajustados : ajustados[0];
  });
  if (!telas) throw new Error("No se encontró la tela del chaleco en operario.glb.");

  const caja = new THREE.Box3().setFromObject(modelo);
  const altura = caja.max.y - caja.min.y;
  if (!Number.isFinite(altura) || altura <= 0) throw new Error("No se pudo medir el operario.");
  modelo.scale.setScalar(2.2 / altura);
  modelo.updateMatrixWorld(true);
  caja.setFromObject(modelo);
  const centro = caja.getCenter(new THREE.Vector3());
  modelo.position.set(-centro.x, -caja.min.y, -centro.z);

  const lugar = ubicaciones[estacion.id];
  entidad.setAttribute("position", `${estacion.x + lugar.desplazamiento} 0 ${lugar.z}`);
  entidad.setAttribute("rotation", "0 180 0");
  entidad.setAttribute("visible", "true");
}

export function iniciarAvatares() {
  const contenedor = document.querySelector("#avatares");
  estaciones.forEach(function (estacion) {
    const entidad = document.createElement("a-entity");
    entidad.setAttribute("visible", "false");
    entidad.addEventListener("model-loaded", function () {
      try {
        prepararOperario(entidad, estacion);
      } catch (error) {
        console.error(error);
      }
    }, { once: true });
    entidad.addEventListener("model-error", function (evento) {
      console.error(`No se pudo cargar el operario de ${estacion.nombre}.`, evento.detail);
    }, { once: true });
    contenedor.appendChild(entidad);
    entidad.setAttribute("gltf-model", "#operario");
  });
}
