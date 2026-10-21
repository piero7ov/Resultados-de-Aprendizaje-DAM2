<?php

require_once __DIR__ . "/bbdd.php";

function erinwaveImportarLetras(PDO $conexion,string $carpetaLetras): array{
  if(!is_dir($carpetaLetras)){
    throw new RuntimeException("No se encuentra la carpeta de letras");
  }

  $resultado = [
    "importadas" => [],
    "sinCambios" => 0,
    "conflictos" => []
  ];

  foreach(erinwaveListarCancionesConLetras($conexion) as $cancion){
    $nombreBase = pathinfo($cancion["archivo"],PATHINFO_FILENAME);
    $candidatas = [];

    foreach(["es","en"] as $idioma){
      $nombreLetra = $nombreBase . "." . $idioma . ".txt";
      $rutaLetra = $carpetaLetras . DIRECTORY_SEPARATOR . $nombreLetra;

      if(is_file($rutaLetra)){
        $candidatas[] = [
          "idioma" => $idioma,
          "nombre" => $nombreLetra,
          "ruta" => $rutaLetra
        ];
      }
    }

    if(count($candidatas) === 0){
      continue;
    }

    if(count($candidatas) > 1){
      $resultado["conflictos"][] = [
        "archivo" => $cancion["archivo"],
        "motivo" => "hay_version_es_y_en"
      ];
      continue;
    }

    $candidata = $candidatas[0];
    $tamano = filesize($candidata["ruta"]);

    if($tamano === false || $tamano > 2 * 1024 * 1024){
      $resultado["conflictos"][] = [
        "archivo" => $cancion["archivo"],
        "motivo" => "archivo_txt_no_valido"
      ];
      continue;
    }

    $texto = file_get_contents($candidata["ruta"]);
    $texto = $texto === false ? "" : preg_replace('/^\xEF\xBB\xBF/','',$texto);

    if($texto === "" || !mb_check_encoding($texto,"UTF-8")){
      $resultado["conflictos"][] = [
        "archivo" => $cancion["archivo"],
        "motivo" => "texto_vacio_o_no_utf8"
      ];
      continue;
    }

    $lineas = array_values(array_filter(array_map(
      fn(string $linea): string => trim($linea),
      preg_split('/\R/u',trim($texto)) ?: []
    ),fn(string $linea): bool => $linea !== ""));

    if(count($lineas) === 0){
      $resultado["conflictos"][] = [
        "archivo" => $cancion["archivo"],
        "motivo" => "texto_vacio_o_no_utf8"
      ];
      continue;
    }

    $textoLimpio = implode("\n",$lineas);
    $hash = hash("sha256",$textoLimpio);

    if(
      $cancion["hash"] === $hash
      && $cancion["idioma"] === $candidata["idioma"]
    ){
      $resultado["sinCambios"]++;
      continue;
    }

    erinwaveGuardarLetra(
      $conexion,
      $cancion["archivo"],
      $candidata["idioma"],
      $textoLimpio,
      "Archivo local: " . $candidata["nombre"]
    );
    $resultado["importadas"][] = [
      "archivo" => $cancion["archivo"],
      "idioma" => $candidata["idioma"],
      "archivoLetra" => $candidata["nombre"],
      "lineas" => count($lineas)
    ];
  }

  return $resultado;
}
