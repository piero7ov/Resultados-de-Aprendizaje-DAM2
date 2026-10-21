<?php

header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");

require_once __DIR__ . "/bbdd.php";
require_once __DIR__ . "/alineador-vtt.php";
require_once __DIR__ . "/importar-letras.php";

function responderLetras(int $estado,array $datos): never{
  http_response_code($estado);
  echo json_encode($datos,JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function estadoCancionLetras(array $cancion,string $carpetaSubtitulos,string $carpetaBrutos): array{
  $nombreBase = pathinfo($cancion["archivo"],PATHINFO_FILENAME);
  $cancion["tieneLetra"] = $cancion["texto"] !== null;
  $cancion["totalLineas"] = (int)($cancion["total_lineas"] ?? 0);
  $cancion["tieneVtt"] = is_file($carpetaSubtitulos . DIRECTORY_SEPARATOR . $nombreBase . ".vtt");
  $cancion["tieneVttBruto"] = is_file($carpetaBrutos . DIRECTORY_SEPARATOR . $nombreBase . ".vtt");
  $cancion["ultimasCoincidencias"] = (int)($cancion["ultimas_coincidencias"] ?? 0);
  $cancion["ultimasLineas"] = (int)($cancion["ultimas_lineas"] ?? 0);
  unset(
    $cancion["total_lineas"],
    $cancion["ultimas_coincidencias"],
    $cancion["ultimas_lineas"]
  );

  return $cancion;
}

try{
  $carpetaAudio = realpath(__DIR__ . "/../audio");
  $carpetaSubtitulos = realpath(__DIR__ . "/../subtitulos");
  $carpetaLetras = realpath(__DIR__ . "/../letras");
  $carpetaBrutos = __DIR__ . "/../subtitulos-brutos";

  if($carpetaAudio === false || $carpetaSubtitulos === false || $carpetaLetras === false){
    responderLetras(500,["ok" => false, "codigo" => "carpetas_no_disponibles"]);
  }

  if(!is_dir($carpetaBrutos) && !mkdir($carpetaBrutos,0775,true) && !is_dir($carpetaBrutos)){
    responderLetras(500,["ok" => false, "codigo" => "carpeta_brutos_no_disponible"]);
  }

  $conexion = erinwaveAbrirBaseDatos();
  erinwaveSincronizarCanciones($conexion,$carpetaAudio);
  $importacionLetras = erinwaveImportarLetras($conexion,$carpetaLetras);
  $metodo = $_SERVER["REQUEST_METHOD"] ?? "GET";

  if($metodo === "GET"){
    $canciones = array_map(
      fn(array $cancion): array => estadoCancionLetras($cancion,$carpetaSubtitulos,$carpetaBrutos),
      erinwaveListarCancionesConLetras($conexion)
    );
    responderLetras(200,[
      "ok" => true,
      "total" => count($canciones),
      "importacionLetras" => $importacionLetras,
      "canciones" => $canciones
    ]);
  }

  if($metodo !== "POST"){
    responderLetras(405,["ok" => false, "codigo" => "metodo_no_permitido"]);
  }

  $entrada = json_decode(file_get_contents("php://input"),true);
  $archivo = is_array($entrada) && isset($entrada["archivo"])
    ? trim((string)$entrada["archivo"])
    : "";
  $idioma = is_array($entrada) && isset($entrada["idioma"])
    ? trim((string)$entrada["idioma"])
    : "";
  $texto = is_array($entrada) && isset($entrada["texto"])
    ? trim((string)$entrada["texto"])
    : "";
  $fuente = is_array($entrada) && isset($entrada["fuente"])
    ? mb_substr(trim((string)$entrada["fuente"]),0,500)
    : null;

  if(
    $archivo === ""
    || basename($archivo) !== $archivo
    || str_contains($archivo,"/")
    || str_contains($archivo,"\\")
    || !is_file($carpetaAudio . DIRECTORY_SEPARATOR . $archivo)
  ){
    responderLetras(400,["ok" => false, "codigo" => "archivo_no_valido"]);
  }

  if($texto === ""){
    responderLetras(422,["ok" => false, "codigo" => "letra_vacia"]);
  }

  $letra = erinwaveGuardarLetra($conexion,$archivo,$idioma,$texto,$fuente);
  $nombreBase = pathinfo($archivo,PATHINFO_FILENAME);
  $rutaFinal = $carpetaSubtitulos . DIRECTORY_SEPARATOR . $nombreBase . ".vtt";
  $rutaBruta = $carpetaBrutos . DIRECTORY_SEPARATOR . $nombreBase . ".vtt";
  $alineacion = null;

  if(!is_file($rutaBruta) && is_file($rutaFinal)){
    copy($rutaFinal,$rutaBruta);
  }

  if(is_file($rutaBruta)){
    $alineacion = erinwaveAlinearVtt($conexion,$archivo,$rutaBruta);

    if($alineacion["aplicada"]){
      $rutaTemporal = $rutaFinal . ".tmp-" . bin2hex(random_bytes(5));
      $escrito = file_put_contents($rutaTemporal,$alineacion["contenido"],LOCK_EX);

      if($escrito === false){
        responderLetras(500,["ok" => false, "codigo" => "no_se_pudo_escribir_vtt"]);
      }

      if(is_file($rutaFinal)){
        unlink($rutaFinal);
      }

      if(!rename($rutaTemporal,$rutaFinal)){
        @unlink($rutaTemporal);
        responderLetras(500,["ok" => false, "codigo" => "no_se_pudo_guardar_vtt"]);
      }
    }

    erinwaveRegistrarGeneracion($conexion,$archivo,[
      "modelo" => "alineador",
      "estado" => $alineacion["aplicada"] ? "alineado" : "requiere_revision",
      "idiomaDetectado" => $letra["idioma"],
      "frasesWhisper" => $alineacion["frasesWhisper"] ?? 0,
      "lineasLetra" => $alineacion["lineasLetra"] ?? 0,
      "coincidencias" => $alineacion["coincidencias"] ?? 0,
      "similitudMedia" => $alineacion["similitudMedia"] ?? 0
    ]);
  }

  responderLetras(200,[
    "ok" => true,
    "estado" => $alineacion === null
      ? "letra_guardada"
      : ($alineacion["aplicada"] ? "vtt_corregido" : "requiere_revision"),
    "lineas" => count($letra["lineas"]),
    "alineacion" => $alineacion
  ]);
}catch(InvalidArgumentException $error){
  responderLetras(422,["ok" => false, "codigo" => "datos_no_validos", "mensaje" => $error->getMessage()]);
}catch(Throwable $error){
  responderLetras(500,["ok" => false, "codigo" => "error_bbdd", "mensaje" => $error->getMessage()]);
}
