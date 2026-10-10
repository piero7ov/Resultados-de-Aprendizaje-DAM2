function crearBanda(THREE, y, material) {
  const puntos = [];
  const indices = [];
  const segmentos = 40;
  for (let indice = 0; indice <= segmentos; indice++) {
    const angulo = indice / segmentos * Math.PI * 2;
    const x = Math.cos(angulo) * .355;
    const z = Math.sin(angulo) * .284;
    puntos.push(x, y - .027, z, x, y + .027, z);
    if (indice < segmentos) {
      const primero = indice * 2;
      indices.push(primero, primero + 1, primero + 2,
        primero + 1, primero + 3, primero + 2);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.Float32BufferAttribute(puntos, 3));
  geometria.setIndex(indices);
  geometria.computeVertexNormals();
  return new THREE.Mesh(geometria, material);
}

function crearBorde(THREE, inicio, fin, material) {
  const principio = new THREE.Vector3(...inicio);
  const final = new THREE.Vector3(...fin);
  const direccion = new THREE.Vector3().subVectors(final, principio);
  const borde = new THREE.Mesh(
    new THREE.CylinderGeometry(.012, .012, direccion.length(), 6), material
  );
  borde.position.copy(principio).add(final).multiplyScalar(.5);
  borde.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direccion.normalize());
  return borde;
}

function crearChalecoModelo(THREE, color, modelo) {
  const grupo = new THREE.Group();
  const chaleco = modelo.clone(true);
  const tela = new THREE.MeshStandardMaterial({ color, roughness: .8, side: THREE.DoubleSide });
  chaleco.traverse(function (elemento) {
    if (elemento.isMesh) elemento.material = tela;
  });
  grupo.add(chaleco);

  const caja = new THREE.Box3().setFromObject(chaleco);
  const medidas = caja.getSize(new THREE.Vector3());
  const centro = caja.getCenter(new THREE.Vector3());
  chaleco.scale.set(.72 / medidas.x, .83 / medidas.y, .56 / medidas.z);
  chaleco.position.set(-centro.x * chaleco.scale.x,
    -centro.y * chaleco.scale.y, -centro.z * chaleco.scale.z);

  const reflectante = new THREE.MeshStandardMaterial({
    color: "#dce3df", roughness: .48, metalness: .2, side: THREE.DoubleSide
  });
  for (const y of [-.26, -.08]) grupo.add(crearBanda(THREE, y, reflectante));

  const ribete = new THREE.MeshStandardMaterial({ color: "#344347", roughness: .85 });
  const cremallera = new THREE.Mesh(new THREE.BoxGeometry(.018, .57, .018), ribete);
  cremallera.position.set(0, -.1, .295);
  grupo.add(cremallera);
  for (const lado of [-1, 1]) {
    grupo.add(crearBorde(THREE,
      [lado * .19, .39, .21], [lado * .012, .14, .295], ribete));
  }
  return grupo;
}

export function crearChaleco(THREE, color, modelo = null) {
  if (modelo) return crearChalecoModelo(THREE, color, modelo);
  const grupo = new THREE.Group();
  grupo.scale.setScalar(.9);
  const tela = new THREE.MeshStandardMaterial({ color, roughness: .9, side: THREE.DoubleSide });
  const reflectante = new THREE.MeshStandardMaterial({
    color: "#f2f3df", emissive: "#b6ba9e", emissiveIntensity: .25, roughness: .75
  });
  const cierre = new THREE.MeshStandardMaterial({ color: "#40515a", roughness: .9 });

  function tira(x, y, z, ancho, alto, fondo, material) {
    const malla = new THREE.Mesh(new THREE.BoxGeometry(ancho, alto, fondo), material);
    malla.position.set(x, y, z);
    grupo.add(malla);
  }

  function panel(puntos, z) {
    const forma = new THREE.Shape();
    forma.moveTo(...puntos[0]);
    for (const punto of puntos.slice(1)) forma.lineTo(...punto);
    forma.closePath();
    const malla = new THREE.Mesh(new THREE.ShapeGeometry(forma), tela);
    malla.position.z = z;
    grupo.add(malla);
  }

  // El escote y las sisas dejan libre la articulación de hombros y brazos.
  panel([[-.28, -.32], [.28, -.32], [.26, .23], [.12, .32],
    [.06, .16], [-.06, .16], [-.12, .32], [-.26, .23]], -.225);
  for (const lado of [-1, 1]) {
    panel([
      [lado * .055, -.32], [lado * .28, -.32],
      [lado * .26, .23], [lado * .13, .32], [lado * .055, .12]
    ], .225);
    tira(lado * .195, .29, 0, .115, .12, .45, tela);
    tira(lado * .28, -.08, 0, .04, .44, .45, tela);
    for (const y of [-.16, .07]) {
      tira(lado * .17, y, .242, .2, .045, .012, reflectante);
    }
  }
  for (const y of [-.16, .07]) {
    tira(0, y, -.242, .54, .045, .012, reflectante);
  }
  tira(0, -.09, .244, .012, .44, .012, cierre);
  return grupo;
}
