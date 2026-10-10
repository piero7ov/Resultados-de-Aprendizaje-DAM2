// Funcion de inicio
function inicio(){
  //console.log("Soy el inicio");
  contexto.clearRect(0, 0, anchura, altura);
  jugador = new Coche(Math.min(200, Math.max(0, anchura - 80)),
    Math.min(200, Math.max(0, altura - 80)), 0, 0);

  for (let i = 0; i < numeroobstaculos; i++) {
    obstaculos.push(new Obstaculo(
      Math.random() * anchura,
      Math.random() * altura,
      0, // El desplazamiento es vertical y no utiliza el ángulo.
      2  // Velocidad de descenso en píxeles por actualización.
    ));
  }

  for (let i = 0; i < numeroenemigos; i++) {
    enemigos.push(new Enemigo(
      Math.random() * Math.max(0, anchura - 80),
      -80 - Math.random() * altura,
      0,
      3
    ));
  }

  // Dos filas de marcas separan visualmente tres carriles, sin limitar el movimiento.
  for (let fila = 1; fila <= 2; fila++) {
    for (let i = 0; i < numeromarcasporfila; i++) {
      marcasviales.push(new MarcaVial(anchura * fila / 3 - 3,
        i * separacionmarcas - separacionmarcas, 2));
    }
  }

  // Evitamos empezar con un árbol dentro del coche del jugador.
  obstaculos.forEach(function(obstaculo) {
    if (hayColision(jugador.rectangulo(), obstaculo.rectangulo())) {
      obstaculo.y = -60;
    }
  });

  // Esperamos a que las tres imágenes estén disponibles antes de empezar a dibujar.
  function comenzarBucle(){
    if (imagen_coche.complete && imagen_coche.naturalWidth > 0 &&
        imagen_obstaculo.complete && imagen_obstaculo.naturalWidth > 0 &&
        imagen_enemigo.complete && imagen_enemigo.naturalWidth > 0 &&
        temporizador === null) {
      temporizador = setTimeout(bucle, 1000);
    }
  }

  imagen_coche.addEventListener("load", comenzarBucle, { once: true });
  imagen_obstaculo.addEventListener("load", comenzarBucle, { once: true });
  imagen_enemigo.addEventListener("load", comenzarBucle, { once: true });
  comenzarBucle();
}
