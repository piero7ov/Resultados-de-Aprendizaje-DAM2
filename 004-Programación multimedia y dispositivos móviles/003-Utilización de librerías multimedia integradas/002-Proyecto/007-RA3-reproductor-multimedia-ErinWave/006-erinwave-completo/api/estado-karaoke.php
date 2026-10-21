<?php

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

require_once __DIR__ . "/bbdd.php";

function responderEstado(int $estado,array $datos): never{
  http_response_code($estado);
  echo json_encode($datos,JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$archivo = isset($_GET["archivo"]) ? trim((string)$_GET["archivo"]) : "";

if(
  $archivo === ""
  || basename($archivo) !== $archivo
  || str_contains($archivo,"/")
  || str_contains($archivo,"\\")
){
  responderEstado(400,["ok" => false, "codigo" => "archivo_no_valido"]);
}

try{
  $carpetaAudio = realpath(__DIR__ . "/../audio");

  if($carpetaAudio === false || !is_file($carpetaAudio . DIRECTORY_SEPARATOR . $archivo)){
    responderEstado(404,["ok" => false, "codigo" => "cancion_no_encontrada"]);
  }

  $conexion = erinwaveAbrirBaseDatos();
  erinwaveSincronizarCanciones($conexion,$carpetaAudio);
  $trabajo = erinwaveObtenerTrabajoKaraoke($conexion,$archivo);

  if(
    $trabajo !== null
    && $trabajo["estado"] === "en_curso"
    && $trabajo["segundosSinActualizar"] > 15
  ){
    erinwaveActualizarTrabajoKaraoke($conexion,$archivo,[
      "estado" => "interrumpido",
      "fase" => "error",
      "codigoError" => "generacion_interrumpida"
    ]);
    $trabajo = erinwaveObtenerTrabajoKaraoke($conexion,$archivo);
  }

  responderEstado(200,[
    "ok" => true,
    "trabajo" => $trabajo
  ]);
}catch(Throwable $error){
  responderEstado(500,["ok" => false, "codigo" => "estado_no_disponible"]);
}
