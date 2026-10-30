<?php
function presetActivo(){
  $archivo = __DIR__ . "/diagrama.json";
  $datos = json_decode((string)file_get_contents($archivo), true);
  return in_array($datos["preset"] ?? null, ["completo", "pequena", "vacio"], true)
    ? $datos["preset"] : "vacio";
}

function archivoDatosPreset(){
  $preset = presetActivo();
  if($preset === "completo"){
    return __DIR__ . "/datos-demostracion.sql";
  }
  if($preset === "pequena"){
    return __DIR__ . "/presets/pequena/datos-demostracion.sql";
  }
  return null;
}

function aplicarPreset($preset){
  if(!in_array($preset, ["completo", "pequena", "vacio"], true)){
    throw new Exception("Modelo de instalación desconocido");
  }
  if(file_exists(dirname(__DIR__) . "/data/erin.sqlite")){
    throw new Exception("No se puede cambiar el modelo de una instalación existente");
  }
  $carpetaModulos = dirname(__DIR__) . "/modulos";
  $configuracionesActuales = [];
  foreach(scandir($carpetaModulos) as $nombre){
    if($nombre === "." || $nombre === "..") continue;
    $ruta = $carpetaModulos . "/" . $nombre;
    if(!is_dir($ruta) || array_diff(scandir($ruta), [".", "..", "carpetas.json"])){
      throw new Exception("El módulo '$nombre' contiene archivos que no debe sustituir el preset");
    }
    $configuracionesActuales[$nombre] = file_get_contents($ruta . "/carpetas.json");
  }
  if($preset === "vacio"){
    $diagrama = json_encode(["preset" => "vacio", "tablas" => []], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    $sql = "";
    $modulosNuevos = [];
  }else{
    $origen = __DIR__ . "/presets/" . $preset;
    $diagrama = file_get_contents($origen . "/diagrama.json");
    $sql = file_get_contents($origen . "/esquema.sql");
    if($diagrama === false || $sql === false){
      throw new Exception("No se puede leer el modelo predefinido");
    }
    $modulosNuevos = [];
    foreach(glob($origen . "/modulos/*.json") as $archivo){
      $nombre = basename($archivo, ".json");
      if(!preg_match('/^[a-z0-9_-]+$/', $nombre)){
        throw new Exception("Nombre de módulo no válido en el preset");
      }
      $contenido = file_get_contents($archivo);
      if($contenido === false){
        throw new Exception("No se puede leer el módulo '$nombre'");
      }
      $modulosNuevos[$nombre] = $contenido;
    }
  }
  foreach($configuracionesActuales as $nombre => $contenido){
    unlink($carpetaModulos . "/" . $nombre . "/carpetas.json");
    rmdir($carpetaModulos . "/" . $nombre);
  }
  foreach($modulosNuevos as $nombre => $contenido){
    mkdir($carpetaModulos . "/" . $nombre);
    file_put_contents($carpetaModulos . "/" . $nombre . "/carpetas.json", $contenido);
  }
  if(file_put_contents(__DIR__ . "/diagrama.json", $diagrama) === false ||
     file_put_contents(__DIR__ . "/esquema.sql", $sql) === false){
    throw new Exception("No se ha podido activar el modelo");
  }
}
