// Funcion de inicio
function inicio(){
  //console.log("Soy el inicio");
  contexto.clearRect(0, 0, anchura, altura);
  jugador = new Coche(200, 200, 0, 0);
  // Esperamos a que la imagen esté disponible antes de empezar a dibujar.
  if (imagen_coche.complete && imagen_coche.naturalWidth > 0) {
    temporizador = setTimeout(bucle, 1000);
  } else {
    imagen_coche.addEventListener("load", function() {
      temporizador = setTimeout(bucle, 1000);
    }, { once: true });
  }
}
