<?php
  $datos = file_get_contents("php://input");
  $libros = json_decode($datos, true);

  if(!is_array($libros)){
    http_response_code(400);
    exit("Los datos recibidos no son una lista JSON válida.");
  }

  $db = new SQLite3(__DIR__ . "/libros.db");

  $db->exec("
    CREATE TABLE IF NOT EXISTS libros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      autor TEXT NOT NULL
    )
  ");

  $sentencia = $db->prepare("INSERT INTO libros (titulo, autor) VALUES (:titulo, :autor)");

  foreach($libros as $libro){
    if(!is_array($libro) || !isset($libro["titulo"]) || !isset($libro["autor"])){
      $db->close();
      http_response_code(400);
      exit("Cada libro debe tener título y autor.");
    }

    $sentencia->bindValue(":titulo", $libro["titulo"], SQLITE3_TEXT);
    $sentencia->bindValue(":autor", $libro["autor"], SQLITE3_TEXT);
    $sentencia->execute();
  }

  $db->close();
  echo "Libros guardados en SQLite.";
?>
