<?php
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

require_once __DIR__ . "/importar-letras.php";

$carpetaAudio = realpath(__DIR__ . "/../audio");
$carpetaSubtitulos = realpath(__DIR__ . "/../subtitulos");
$carpetaLetras = realpath(__DIR__ . "/../letras");

if($carpetaAudio === false || $carpetaLetras === false){
  http_response_code(500);
  echo json_encode([
    "error" => "No se encuentra la carpeta de audio"
  ],JSON_UNESCAPED_UNICODE);
  exit;
}

try{
  $conexion = erinwaveAbrirBaseDatos();
  erinwaveSincronizarCanciones($conexion,$carpetaAudio);
  $importacionLetras = erinwaveImportarLetras($conexion,$carpetaLetras);
}catch(Throwable $error){
  http_response_code(500);
  echo json_encode([
    "error" => "No se pudo actualizar la biblioteca local"
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
  $tieneKaraoke = false;
  $letra = erinwaveObtenerLetra($conexion,$archivo);

  if($rutaVtt !== false && is_file($rutaVtt)){
    $contenidoVtt = file_get_contents($rutaVtt,false,null,0,16);
    $contenidoVtt = preg_replace('/^\xEF\xBB\xBF/','',(string)$contenidoVtt);
    $tieneKaraoke = str_starts_with($contenidoVtt,"WEBVTT");
  }

  $canciones[] = [
    "archivo" => $archivo,
    "artista" => $artista,
    "titulo" => $titulo,
    "url" => "audio/" . rawurlencode($archivo),
    "tieneLetra" => $letra !== null,
    "idiomaLetra" => $letra["idioma"] ?? null,
    "tieneKaraoke" => $tieneKaraoke,
    "urlKaraoke" => $tieneKaraoke
      ? "subtitulos/" . rawurlencode($nombreBase . ".vtt")
      : null
  ];
}

usort($canciones,function($primera,$segunda){
  return strnatcasecmp($primera["archivo"],$segunda["archivo"]);
});

echo json_encode([
  "total" => count($canciones),
  "importacionLetras" => $importacionLetras,
  "canciones" => $canciones
],JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
