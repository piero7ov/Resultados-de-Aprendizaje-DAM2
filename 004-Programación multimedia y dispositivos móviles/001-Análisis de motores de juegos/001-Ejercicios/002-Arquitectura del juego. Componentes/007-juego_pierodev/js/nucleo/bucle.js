// Función de bucle
function bucle(){
  //console.log("Yo soy el bucle");
  contexto.clearRect(0, 0, anchura, altura);
  jugador.pintar();
  obstaculos.forEach(function(obstaculo) {
    obstaculo.pintar();
  });
  clearTimeout(temporizador);
  temporizador = setTimeout(bucle, 1000 / fps);
}
