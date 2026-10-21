<?php

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

require_once __DIR__ . "/bbdd.php";

function responderSubida(int $estado,array $datos): never{
  http_response_code($estado);
  echo json_encode($datos,JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

if(($_SERVER["REQUEST_METHOD"] ?? "GET") !== "POST"){
  responderSubida(405,["ok" => false, "codigo" => "metodo_no_permitido"]);
}

if(!isset($_FILES["audio"]) || !is_array($_FILES["audio"])){
  responderSubida(400,["ok" => false, "codigo" => "archivo_no_recibido"]);
}

$subida = $_FILES["audio"];
$error = (int)($subida["error"] ?? UPLOAD_ERR_NO_FILE);

if($error !== UPLOAD_ERR_OK){
  responderSubida(422,["ok" => false, "codigo" => "subida_fallida", "errorSubida" => $error]);
}

$nombre = trim((string)($subida["name"] ?? ""));
$rutaTemporal = (string)($subida["tmp_name"] ?? "");
$tamano = (int)($subida["size"] ?? 0);

if(
  $nombre === ""
  || basename($nombre) !== $nombre
  || str_contains($nombre,"/")
  || str_contains($nombre,"\\")
  || preg_match('/[\x00-\x1F\x7F]/u',$nombre)
  || strtolower(pathinfo($nombre,PATHINFO_EXTENSION)) !== "mp3"
){
  responderSubida(422,["ok" => false, "codigo" => "archivo_no_valido"]);
}

if($tamano <= 0 || $tamano > 100 * 1024 * 1024 || !is_uploaded_file($rutaTemporal)){
  responderSubida(422,["ok" => false, "codigo" => "tamano_no_valido"]);
}

$cabecera = file_get_contents($rutaTemporal,false,null,0,10);
$pareceMp3 = is_string($cabecera) && (
  str_starts_with($cabecera,"ID3")
  || (strlen($cabecera) >= 2 && ord($cabecera[0]) === 0xFF && (ord($cabecera[1]) & 0xE0) === 0xE0)
);

if(!$pareceMp3){
  responderSubida(422,["ok" => false, "codigo" => "contenido_no_mp3"]);
}

try{
  $carpetaAudio = realpath(__DIR__ . "/../audio");

  if($carpetaAudio === false){
    responderSubida(500,["ok" => false, "codigo" => "carpeta_audio_no_disponible"]);
  }

  $destino = $carpetaAudio . DIRECTORY_SEPARATOR . $nombre;

  if(is_file($destino)){
    responderSubida(409,["ok" => false, "codigo" => "archivo_duplicado"]);
  }

  if(!move_uploaded_file($rutaTemporal,$destino)){
    responderSubida(500,["ok" => false, "codigo" => "no_se_pudo_guardar_audio"]);
  }

  $conexion = erinwaveAbrirBaseDatos();
  erinwaveSincronizarCanciones($conexion,$carpetaAudio);
  responderSubida(201,[
    "ok" => true,
    "archivo" => $nombre
  ]);
}catch(Throwable $error){
  responderSubida(500,["ok" => false, "codigo" => "error_bbdd"]);
}
