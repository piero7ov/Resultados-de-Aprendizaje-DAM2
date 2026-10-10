import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fijarPiernas } from "../js/ajuste-piernas.js";

const archivo = readFileSync(new URL("../modelos/operario.glb", import.meta.url));
const longitud = archivo.readUInt32LE(12);
const modelo = JSON.parse(archivo.toString("utf8", 20, 20 + longitud));
const inicioDatos = 28 + longitud;

function atributo(indice) {
  const acceso = modelo.accessors[indice];
  const vista = modelo.bufferViews[acceso.bufferView];
  const componentes = { SCALAR: 1, VEC3: 3, VEC4: 4 }[acceso.type];
  const bytes = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[acceso.componentType];
  const datos = Array.from({ length: acceso.count }, (_, i) =>
    Array.from({ length: componentes }, (_, j) => {
      const posicion = inicioDatos + (vista.byteOffset || 0) + (acceso.byteOffset || 0)
        + i * (vista.byteStride || componentes * bytes) + j * bytes;
      const leer = { 5121: "readUInt8", 5123: "readUInt16LE", 5125: "readUInt32LE", 5126: "readFloatLE" }[acceso.componentType];
      return archivo[leer](posicion);
    }));
  return {
    count: acceso.count, datos,
    getX: i => datos[i][0], getY: i => datos[i][1], getZ: i => datos[i][2],
    setXYZW: (i, ...valores) => { datos[i] = valores; }
  };
}

test("el GLB mantiene piernas y pies fijos sin alterar brazos ni cara", () => {
  const mallas = [];
  for (const nodo of modelo.nodes.filter(n => n.skin !== undefined)) {
    for (const primitiva of modelo.meshes[nodo.mesh].primitives) {
      const geometria = {
        attributes: {
          position: atributo(primitiva.attributes.POSITION),
          skinIndex: atributo(primitiva.attributes.JOINTS_0),
          skinWeight: atributo(primitiva.attributes.WEIGHTS_0)
        },
        index: atributo(primitiva.indices),
        clone() { return this; }
      };
      mallas.push({
        isSkinnedMesh: true, geometry: geometria,
        skeleton: { bones: modelo.skins[nodo.skin].joints.map(i => ({ name: modelo.nodes[i].name })) }
      });
    }
  }
  const originales = mallas.map(m => structuredClone(m.geometry.attributes.skinWeight.datos));
  fijarPiernas({ traverse: funcion => mallas.forEach(funcion) });
  let corregidos = 0;
  let brazosComprobados = 0;
  let caraComprobada = 0;
  mallas.forEach((malla, numero) => {
    const { position, skinIndex, skinWeight } = malla.geometry.attributes;
    const raiz = malla.skeleton.bones.findIndex(h => h.name === "Bone");
    for (let i = 0; i < position.count; i++) {
      const x = Math.abs(position.getX(i));
      const y = position.getY(i);
      if (y < 1.6 || (y < 2.5 && x < .37)) {
        assert.deepEqual(skinWeight.datos[i], [1, 0, 0, 0]);
        assert.equal(skinIndex.getX(i), raiz);
        if (originales[numero][i].some((peso, j) => peso !== skinWeight.datos[i][j])) corregidos++;
      }
      if ((x > .45 && y > 1.65) || y > 3.4) {
        assert.deepEqual(skinWeight.datos[i], originales[numero][i]);
        if (y > 3.4) caraComprobada++;
        else brazosComprobados++;
      }
    }
  });
  assert.ok(corregidos > 100, "La prueba debe cubrir los pesos incorrectos del GLB real.");
  assert.ok(brazosComprobados > 100);
  assert.ok(caraComprobada > 100);
});
