<?php
  $datos = file_get_contents("php://input");
  $libros = json_decode($datos, true);

  if(!is_array($libros)){
    http_response_code(400);
    exit("Los datos recibidos no son una lista JSON válida.");
  }

  $json = json_encode($libros, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

  if($json === false || file_put_contents(__DIR__ . "/libros.json", $json . PHP_EOL) === false){
    http_response_code(500);
    exit("No se pudieron guardar los libros.");
  }

  echo "Libros guardados en JSON.";
?>
