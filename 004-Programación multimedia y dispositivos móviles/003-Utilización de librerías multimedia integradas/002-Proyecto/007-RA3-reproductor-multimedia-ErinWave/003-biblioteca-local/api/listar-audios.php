<?php
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

$carpetaAudio = realpath(__DIR__ . "/../audio");
$carpetaSubtitulos = realpath(__DIR__ . "/../subtitulos");

if($carpetaAudio === false){
  http_response_code(500);
  echo json_encode([
    "error" => "No se encuentra la carpeta de audio"
  ],JSON_UNESCAPED_UNICODE);
  exit;
}

$archivos = scandir($carpetaAudio);
$canciones = [];

foreach($archivos as $archivo){
  $rutaCompleta = $carpetaAudio . DIRECTORY_SEPARATOR . $archivo;
  $extension = strtolower(pathinfo($archivo,PATHINFO_EXTENSION));

  if(!is_file($rutaCompleta) || $extension !== "mp3"){
    continue;
  }

  $nombreBase = pathinfo($archivo,PATHINFO_FILENAME);
  $artista = null;
  $titulo = $nombreBase;

  if(preg_match('/^\s*(.+?)\s+-\s+(.+?)\s*$/u',$nombreBase,$partes)){
    $artista = $partes[1];
    $titulo = $partes[2];
  }

  $rutaVtt = $carpetaSubtitulos === false
    ? false
    : $carpetaSubtitulos . DIRECTORY_SEPARATOR . $nombreBase . ".vtt";

  $canciones[] = [
    "archivo" => $archivo,
    "artista" => $artista,
    "titulo" => $titulo,
    "url" => "audio/" . rawurlencode($archivo),
    "tieneKaraoke" => $rutaVtt !== false && is_file($rutaVtt)
  ];
}

usort($canciones,function($primera,$segunda){
  return strnatcasecmp($primera["archivo"],$segunda["archivo"]);
});

echo json_encode([
  "total" => count($canciones),
  "canciones" => $canciones
],JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
