<?php
require_once dirname(__DIR__) . '/nucleo/datos/ErinDatos.php';

function presetActivo(){
  $datos = json_decode((string)file_get_contents(__DIR__ . '/diagrama.json'), true);
  return in_array($datos['preset'] ?? null, ['completo','pequena','vacio'], true) ? $datos['preset'] : 'vacio';
}

function archivoDatosPreset(){
  return match(presetActivo()){
    'completo' => __DIR__ . '/datos-demostracion.sql',
    'pequena' => __DIR__ . '/presets/pequena/datos-demostracion.sql',
    default => null
  };
}

function aplicarPreset($preset){
  if(!in_array($preset, ['completo','pequena','vacio'], true)){ throw new Exception('Modelo de instalación desconocido'); }
  $datos = new ErinDatos();
  if($datos->instalado()){ throw new Exception('No se puede cambiar el modelo de una instalación existente'); }
  if($preset === 'vacio'){
    $diagrama = json_encode(['preset'=>'vacio','tablas'=>[]], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
  }else{
    $diagrama = file_get_contents(__DIR__ . "/presets/$preset/diagrama.json");
    if($diagrama === false){ throw new Exception('No se puede leer el modelo predefinido'); }
  }
  if(file_put_contents(__DIR__ . '/diagrama.json', $diagrama, LOCK_EX) === false){
    throw new Exception('No se ha podido activar el modelo');
  }
}

