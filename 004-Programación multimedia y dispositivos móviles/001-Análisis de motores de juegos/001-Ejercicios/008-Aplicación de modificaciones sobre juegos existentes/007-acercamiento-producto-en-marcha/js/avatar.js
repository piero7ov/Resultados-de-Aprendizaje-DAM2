import { estaciones } from "./datos-estaciones.js";

const ubicaciones = {
  recepcion: { desplazamiento: -.2, z: 2.35 },
  calidad: { desplazamiento: -.65, z: 2.25 },
  embalaje: { desplazamiento: -.6, z: 2.25 },
  expedicion: { desplazamiento: -.25, z: 2.25 }
};

function prepararAvatar(entidad, estacion) {
  const THREE = window.AFRAME.THREE;
  const modelo = entidad.getObject3D("mesh");
  const personaje = modelo?.getObjectByName("Armature");
  if (!personaje) throw new Error("No se encontró el personaje articulado en avatar.glb.");

  // El archivo también incluye un plano, una cámara y luces de la escena de origen.
  for (const elemento of [...modelo.children]) {
    if (elemento !== personaje) modelo.remove(elemento);
  }

  // El GLB contiene media malla: la otra mitad usa los huesos opuestos del mismo esqueleto.
  const mitades = [];
  personaje.traverse(function (elemento) {
    if (elemento.isSkinnedMesh) mitades.push(elemento);
  });
  for (const mitad of mitades) {
    const reflejo = mitad.clone();
    reflejo.name = `${mitad.name}-reflejo`;
    const geometria = mitad.geometry.clone();
    geometria.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1));
    const indices = geometria.getIndex();
    for (let indice = 0; indice < indices.count; indice += 3) {
      const segundo = indices.getX(indice + 1);
      indices.setX(indice + 1, indices.getX(indice + 2));
      indices.setX(indice + 2, segundo);
    }
    indices.needsUpdate = true;
    const articulaciones = geometria.getAttribute("skinIndex");
    const opuestas = { 4: 8, 5: 9, 6: 10, 7: 11, 8: 4, 9: 5, 10: 6, 11: 7 };
    for (let indice = 0; indice < articulaciones.array.length; indice++) {
      articulaciones.array[indice] = opuestas[articulaciones.array[indice]] ?? articulaciones.array[indice];
    }
    articulaciones.needsUpdate = true;
    reflejo.geometry = geometria;
    mitad.parent.add(reflejo);
  }

  const caja = new THREE.Box3().setFromObject(personaje);
  const altura = caja.max.y - caja.min.y;
  if (!Number.isFinite(altura) || altura <= 0) throw new Error("No se pudo medir el avatar.");

  modelo.scale.setScalar(2.2 / altura);
  modelo.updateMatrixWorld(true);
  caja.setFromObject(personaje);
  const centro = caja.getCenter(new THREE.Vector3());
  modelo.position.set(-centro.x, -caja.min.y, -centro.z);

  const lugar = ubicaciones[estacion.id];
  entidad.setAttribute("position", `${estacion.x + lugar.desplazamiento} 0 ${lugar.z}`);
  entidad.setAttribute("rotation", "0 0 0");
  entidad.setAttribute("visible", "true");
}

export function iniciarAvatares() {
  const contenedor = document.querySelector("#avatares");
  estaciones.forEach(function (estacion) {
    const entidad = document.createElement("a-entity");
    entidad.setAttribute("visible", "false");
    entidad.addEventListener("model-loaded", function () {
      try {
        prepararAvatar(entidad, estacion);
      } catch (error) {
        console.error(error);
      }
    }, { once: true });
    entidad.addEventListener("model-error", function (evento) {
      console.error(`No se pudo cargar el avatar de ${estacion.nombre}.`, evento.detail);
    }, { once: true });
    contenedor.appendChild(entidad);
    entidad.setAttribute("gltf-model", "#avatar");
  });
}
