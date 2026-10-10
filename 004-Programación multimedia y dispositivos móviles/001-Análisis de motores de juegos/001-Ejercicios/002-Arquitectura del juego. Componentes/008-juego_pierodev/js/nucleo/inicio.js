// Funcion de inicio
function inicio(){
  //console.log("Soy el inicio");
  contexto.clearRect(0, 0, anchura, altura);
  jugador = new Coche(200, 200, 0, 0);

  for (let i = 0; i < numeroobstaculos; i++) {
    obstaculos.push(new Obstaculo(
      Math.random() * anchura,
      Math.random() * altura,
      0, // El desplazamiento es vertical y no utiliza el ángulo.
      2  // Velocidad de descenso en píxeles por actualización.
    ));
  }

  // Esperamos a que las dos imágenes estén disponibles antes de empezar a dibujar.
  function comenzarBucle(){
    if (imagen_coche.complete && imagen_coche.naturalWidth > 0 &&
        imagen_obstaculo.complete && imagen_obstaculo.naturalWidth > 0 &&
        temporizador === null) {
      temporizador = setTimeout(bucle, 1000);
    }
  }

  imagen_coche.addEventListener("load", comenzarBucle, { once: true });
  imagen_obstaculo.addEventListener("load", comenzarBucle, { once: true });
  comenzarBucle();
}
