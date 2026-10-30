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
  if($preset === "vacio"){
    $diagrama = json_encode(["preset" => "vacio", "tablas" => []], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
    $sql = "";
  }else{
    $origen = __DIR__ . "/presets/" . $preset;
    $diagrama = file_get_contents($origen . "/diagrama.json");
    $sql = file_get_contents($origen . "/esquema.sql");
    if($diagrama === false || $sql === false){
      throw new Exception("No se puede leer el modelo predefinido");
    }
  }
  if(file_put_contents(__DIR__ . "/diagrama.json", $diagrama) === false ||
     file_put_contents(__DIR__ . "/esquema.sql", $sql) === false){
    throw new Exception("No se ha podido activar el modelo");
  }
}
