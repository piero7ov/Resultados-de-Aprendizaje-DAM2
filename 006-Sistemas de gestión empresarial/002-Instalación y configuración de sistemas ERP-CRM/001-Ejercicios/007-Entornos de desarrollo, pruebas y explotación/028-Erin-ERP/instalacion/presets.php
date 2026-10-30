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

function sustituirModulosPreset($preset){
  $destino = realpath(dirname(__DIR__) . '/modulos');
  $raiz = realpath(dirname(__DIR__));
  if($destino === false || $raiz === false || !str_starts_with($destino, $raiz . DIRECTORY_SEPARATOR)){
    throw new Exception('La carpeta de módulos no pertenece a esta versión de ERIN');
  }
  foreach(scandir($destino) as $entrada){
    if($entrada === '.' || $entrada === '..'){ continue; }
    $ruta = $destino . DIRECTORY_SEPARATOR . $entrada;
    if(is_dir($ruta)){
      $archivos = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($ruta, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
      foreach($archivos as $archivo){ $archivo->isDir() ? rmdir($archivo->getPathname()) : unlink($archivo->getPathname()); }
      rmdir($ruta);
    }else{ unlink($ruta); }
  }
  $origen = __DIR__ . "/presets/$preset/modulos";
  if(!is_dir($origen)){ throw new Exception('El preset no contiene su configuración de módulos'); }
  foreach(scandir($origen) as $modulo){
    if($modulo === '.' || $modulo === '..' || !is_dir($origen . '/' . $modulo)){ continue; }
    $carpeta = $destino . DIRECTORY_SEPARATOR . $modulo;
    if(!mkdir($carpeta, 0775, true) && !is_dir($carpeta)){ throw new Exception("No se puede crear el módulo $modulo"); }
    if(!copy($origen . '/' . $modulo . '/carpetas.json', $carpeta . '/carpetas.json')){
      throw new Exception("No se puede activar el módulo $modulo");
    }
  }
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
  sustituirModulosPreset($preset);
}

