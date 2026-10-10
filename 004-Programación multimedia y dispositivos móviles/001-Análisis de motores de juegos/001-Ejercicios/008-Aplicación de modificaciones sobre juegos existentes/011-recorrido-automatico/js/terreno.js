import { crearMaterialesEntorno } from "./texturas-entorno.js";

export const NIVEL_CALZADA = -.44;

export function crearTerreno(THREE, piezas) {
  const grupo = new THREE.Group();
  grupo.name = "Terreno y pavimentos";
  const materiales = crearMaterialesEntorno(THREE);

  function superficie(tipo, x, z, ancho, fondo, altura = NIVEL_CALZADA) {
    const geometria = new THREE.PlaneGeometry(ancho, fondo);
    geometria.rotateX(-Math.PI / 2);
    const posiciones = geometria.attributes.position;
    const coordenadas = geometria.attributes.uv;
    for (let indice = 0; indice < coordenadas.count; indice++) {
      coordenadas.setXY(indice, (posiciones.getX(indice) + x) / 4,
        (posiciones.getZ(indice) + z) / 4);
    }
    const malla = new THREE.Mesh(geometria, materiales[tipo]);
    malla.position.set(x, altura, z);
    malla.receiveShadow = true;
    malla.userData.esSuelo = true;
    grupo.add(malla);
    return malla;
  }

  function marca(x, z, ancho, fondo, color = "#e8e2c9", altura = -.428) {
    const malla = piezas.caja(grupo, x, altura, z, ancho, .008, fondo, color);
    malla.userData.esSuelo = true;
    return malla;
  }

  function bordillo(x, z, ancho, fondo) {
    piezas.caja(grupo, x, -.39, z, ancho, .22, fondo, "#c6bfa9");
  }

  // La base se prolonga fuera de la cámara; el pavimento descansa sobre ella.
  superficie("cesped", 0, -10, 600, 600, -.50);
  superficie("hormigon", 3.25, 0, 36.5, 10.8, -.448);
  for (const [x, z, ancho, fondo] of [
    [-23, -15.5, 16.8, 10], [-.5, -16.2, 20, 11.4], [23, -16.5, 16.8, 12]
  ]) superficie("hormigon", x, z, ancho, fondo, -.448);

  superficie("asfalto", 0, 10, 180, 7);
  superficie("asfalto", 0, -8, 180, 5);
  superficie("asfalto", 25, .5, 7, 12);
  superficie("hormigon", 16.65, 5.95, 9.7, 1.1, -.448);

  // Aceras sobre una base maciza: solo sobresale la altura del bordillo.
  piezas.caja(grupo, -1.6, -.43, 5.72, 26.8, .14, 1.55, "#b7af98");
  superficie("acera", -1.6, 5.72, 26.8, 1.55, -.355);
  bordillo(-1.6, 6.43, 26.8, .14);
  piezas.caja(grupo, 0, -.43, 14.3, 180, .14, 1.6, "#b7af98");
  superficie("acera", 0, 14.3, 180, 1.6, -.355);
  bordillo(0, 13.57, 180, .14);
  bordillo(28.55, .5, .14, 12);
  bordillo(-15.08, .7, .16, 11.4);

  // Líneas y paso peatonal interrumpidos en la intersección del acceso.
  for (let x = -85; x < 85; x += 5) {
    if (x < 20 || x > 30) {
      marca(x, 10, 2.7, .1);
      marca(x, -8, 2.7, .1);
    }
  }
  for (const z of [-3, 1.5, 5]) marca(25, z, .1, 1.8);
  for (const z of [7, 7.9, 8.8, 9.7, 10.6, 11.5, 12.4]) {
    marca(-8, z, 2.5, .42);
  }
  for (const z of [-2.25, 1.8]) {
    marca(17.15, z, 8.1, .075, "#d6b34b", -.434);
  }
  for (let x = 13.7; x < 21; x += 1.2) {
    const raya = marca(x, 2.7, .075, .72, "#d6b34b", -.434);
    raya.rotation.y = -.5;
  }

  // Desgaste leve y huellas de ruedas en la zona de maniobra.
  const lienzo = document.createElement("canvas");
  lienzo.width = lienzo.height = 256;
  const contexto = lienzo.getContext("2d");
  const gradiente = contexto.createRadialGradient(128, 128, 10, 128, 128, 125);
  gradiente.addColorStop(0, "#29292322");
  gradiente.addColorStop(1, "#29292300");
  contexto.fillStyle = gradiente;
  contexto.fillRect(0, 0, 256, 256);
  const manchas = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(lienzo), transparent: true, depthWrite: false
  });
  for (const z of [-1.6, .6]) {
    const huella = new THREE.Mesh(new THREE.PlaneGeometry(8, .38), manchas);
    huella.rotation.x = -Math.PI / 2;
    huella.position.set(17.2, -.433, z);
    huella.userData.esSuelo = true;
    grupo.add(huella);
  }

  for (const [x, z, radio] of [
    [-32, -25, 1.9], [-27, -26.7, 1.6], [-13.3, -15.7, 1.7],
    [11.8, -15.8, 1.8], [-19, -27.1, 1.8], [-12, -26.4, 1.6],
    [-5, -28, 2], [4, -27, 1.7], [12, -27.8, 1.8], [20, -27, 1.6],
    [28, -25.7, 2], [33, -23.5, 1.7]
  ]) {
    const geometria = new THREE.CircleGeometry(radio, 20);
    geometria.rotateX(-Math.PI / 2);
    const suelo = new THREE.Mesh(geometria, materiales.tierra);
    suelo.position.set(x, -.48, z);
    suelo.receiveShadow = true;
    suelo.userData.esSuelo = true;
    grupo.add(suelo);
  }
  // Desagües en los puntos bajos del patio, sin añadir modelos externos.
  for (const x of [-11, 4, 20]) {
    marca(x, 4.65, .65, .36, "#48504c", -.433);
    for (let ranura = -.24; ranura <= .24; ranura += .08) {
      marca(x + ranura, 4.65, .025, .3, "#a3a797", -.425);
    }
  }
  return grupo;
}
