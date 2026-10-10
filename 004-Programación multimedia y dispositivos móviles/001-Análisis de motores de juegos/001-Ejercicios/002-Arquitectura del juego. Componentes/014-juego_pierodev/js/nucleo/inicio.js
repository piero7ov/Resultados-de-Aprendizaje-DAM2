// Funcion de inicio
function inicio(){
  // Una partida nueva siempre comienza desde el primer nivel.
  nivel = 1;
  iniciarNivel();
}

function iniciarNivel(){
  //console.log("Soy el inicio");
  // Limpiamos el nivel anterior para no acumular entidades ni temporizadores.
  clearTimeout(temporizador);
  temporizador = null;
  partidaTerminada = false;
  reiniciarEntrada();
  obstaculos = [];
  enemigos = [];
  marcasviales = [];
  resultado.hidden = true;
  const configuracion = configuracionniveles[nivel - 1];
  numeroobstaculos = configuracion.obstaculos;
  numeroenemigos = configuracion.enemigos;
  contexto.clearRect(0, 0, anchura, altura);
  jugador = new Coche(salidajugador,
    Math.max(0, (altura - 80) / 2), 1, 0, energiaInicial, usosescudopornivel);

  const anchuracarretera = Math.max(0, iniciometa - iniciocarretera);

  for (let i = 0; i < numeroobstaculos; i++) {
    obstaculos.push(new Obstaculo(
      iniciocarretera + Math.random() * Math.max(0, anchuracarretera - 120),
      Math.random() * altura,
      0, // El desplazamiento es vertical y no utiliza el ángulo.
      configuracion.velocidadobstaculos
    ));
  }

  for (let i = 0; i < numeroenemigos; i++) {
    enemigos.push(new Enemigo(
      iniciocarretera + Math.random() * Math.max(0, anchuracarretera - 80),
      -80 - Math.random() * altura,
      0,
      configuracion.velocidadenemigos
    ));
  }

  // Dos filas de marcas separan visualmente tres carriles, sin limitar el movimiento.
  for (let fila = 1; fila <= 2; fila++) {
    for (let i = 0; i < numeromarcasporfila; i++) {
      marcasviales.push(new MarcaVial(iniciocarretera + anchuracarretera * fila / 3 - 3,
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
  actualizarInterfaz();
  comenzarBucle();
}
