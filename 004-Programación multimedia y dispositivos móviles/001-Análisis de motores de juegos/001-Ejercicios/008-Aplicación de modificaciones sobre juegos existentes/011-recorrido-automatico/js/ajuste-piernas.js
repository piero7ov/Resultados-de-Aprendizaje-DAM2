// Separa las piernas de los brazos por continuidad de la malla bajo la cadera.
export function localizarPiernas(posiciones, indices, { minimo, maximo }) {
  const limite = minimo + (maximo - minimo) * .65;
  const tobillos = minimo + (maximo - minimo) * .08;
  const padres = Array.from({ length: posiciones.count }, (_, i) => i);
  function raiz(i) {
    while (padres[i] !== i) { padres[i] = padres[padres[i]]; i = padres[i]; }
    return i;
  }
  function unir(a, b) {
    if (posiciones.getY(a) <= limite && posiciones.getY(b) <= limite) padres[raiz(a)] = raiz(b);
  }
  const coincidentes = new Map();
  for (let i = 0; i < posiciones.count; i++) {
    if (posiciones.getY(i) > limite) continue;
    const clave = [posiciones.getX(i), posiciones.getY(i), posiciones.getZ(i)].map(n => n.toFixed(5)).join("/");
    if (coincidentes.has(clave)) unir(i, coincidentes.get(clave));
    else coincidentes.set(clave, i);
  }
  const total = indices ? indices.count : posiciones.count;
  for (let i = 0; i < total; i += 3) {
    const a = indices ? indices.getX(i) : i;
    const b = indices ? indices.getX(i + 1) : i + 1;
    const c = indices ? indices.getX(i + 2) : i + 2;
    unir(a, b); unir(b, c); unir(c, a);
  }
  const bases = new Set();
  for (let i = 0; i < posiciones.count; i++) {
    if (posiciones.getY(i) <= tobillos) bases.add(raiz(i));
  }
  const piernas = [];
  for (let i = 0; i < posiciones.count; i++) {
    if (bases.has(raiz(i))) piernas.push(i);
  }
  return piernas;
}

export function fijarPiernas(modelo) {
  const limites = { minimo: Infinity, maximo: -Infinity };
  modelo.traverse(function (malla) {
    if (!malla.isSkinnedMesh) return;
    const posiciones = malla.geometry.attributes.position;
    for (let i = 0; i < posiciones.count; i++) {
      limites.minimo = Math.min(limites.minimo, posiciones.getY(i));
      limites.maximo = Math.max(limites.maximo, posiciones.getY(i));
    }
  });
  modelo.traverse(function (malla) {
    if (!malla.isSkinnedMesh) return;
    const raiz = malla.skeleton.bones.findIndex(hueso => hueso.name === "Bone");
    if (raiz < 0) return;
    const geometria = malla.geometry.clone();
    const piernas = localizarPiernas(geometria.attributes.position, geometria.index, limites);
    piernas.forEach(function (indice) {
      geometria.attributes.skinIndex.setXYZW(indice, raiz, 0, 0, 0);
      geometria.attributes.skinWeight.setXYZW(indice, 1, 0, 0, 0);
    });
    geometria.attributes.skinIndex.needsUpdate = true;
    geometria.attributes.skinWeight.needsUpdate = true;
    malla.geometry = geometria;
  });
}
