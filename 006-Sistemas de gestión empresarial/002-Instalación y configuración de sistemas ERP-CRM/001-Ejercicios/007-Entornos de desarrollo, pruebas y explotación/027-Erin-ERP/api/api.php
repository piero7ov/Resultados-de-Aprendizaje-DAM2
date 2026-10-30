<?php
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__) . '/nucleo/autenticacion.php';

function responder($datos, $codigo = 200){ http_response_code($codigo); echo json_encode($datos, JSON_UNESCAPED_UNICODE); }

function validarTabla(ErinDatos $datos, $tabla){
  if($tabla === '' || str_starts_with($tabla, 'erin_') || !$datos->existeTabla($tabla)){
    throw new Exception("La tabla '$tabla' no existe");
  }
}

function estructuraTabla(ErinDatos $datos, $tabla){ return $datos->estructura($tabla); }

function camposEditables($estructura){
  return array_values(array_filter($estructura, fn($campo) => $campo['name'] !== 'Identificador'));
}

function validarIdentificador($identificador){
  if(!ctype_digit((string)$identificador) || (int)$identificador < 1){ throw new Exception('El Identificador no es válido'); }
  return (int)$identificador;
}

function exigirPost(){
  if(($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST'){ throw new Exception('La operación debe enviarse mediante POST'); }
}

function obtenerRegistro(ErinDatos $datos, $tabla, $identificador){
  $registro = $datos->obtener($tabla, $identificador);
  if(!$registro){ throw new Exception('El registro solicitado no existe'); }
  return $registro;
}

function describirRegistro($registro){
  $id = $registro['Identificador'];
  $valores = [];
  foreach(['nombre','apellidos','email','numero','fecha','estado','descripcion','precio','puesto','ciudad'] as $preferido){
    foreach($registro as $campo => $valor){
      if(strtolower($campo) === $preferido && $valor !== null && $valor !== '' && !in_array((string)$valor, $valores, true)){
        $valores[] = (string)$valor; break;
      }
    }
    if(count($valores) === 3){ break; }
  }
  if(!$valores){
    foreach($registro as $campo => $valor){
      if($campo !== 'Identificador' && $valor !== null && $valor !== ''){ $valores[] = (string)$valor; }
      if(count($valores) === 3){ break; }
    }
  }
  return implode(' · ', $valores ?: ['Registro']) . ' · #' . $id;
}

function opcionesRelacion(ErinDatos $datos, $tabla){
  validarTabla($datos, $tabla);
  $registros = $datos->listar($tabla);
  usort($registros, fn($a, $b) => (int)$a['Identificador'] <=> (int)$b['Identificador']);
  return array_map(fn($fila) => [
    'identificador'=>(int)$fila['Identificador'],
    'descripcion'=>describirRegistro($fila)
  ], $registros);
}

function tablasModulo(ErinDatos $datos, $modulo){
  if(!preg_match('/^[a-z0-9_-]+$/', $modulo)){ throw new Exception('El módulo indicado no es válido'); }
  $ruta = dirname(__DIR__) . '/modulos/' . $modulo;
  if(!is_dir($ruta)){ throw new Exception("El módulo '$modulo' no existe"); }
  $archivo = $ruta . '/carpetas.json';
  if(!file_exists($archivo)){ return []; }
  $configuracion = json_decode(file_get_contents($archivo), true);
  if(!is_array($configuracion) || ($configuracion['modulo'] ?? null) !== $modulo || !is_array($configuracion['tablas'] ?? null)){
    throw new Exception("La configuración de '$modulo' no es válida");
  }
  if(($configuracion['activo'] ?? true) === false){ return []; }
  return array_values(array_unique(array_filter(
    $configuracion['tablas'],
    fn($tabla) => is_string($tabla) && in_array($tabla, $datos->tablas(false), true)
  )));
}

function moduloActivo($nombre){
  $archivo = dirname(__DIR__) . "/modulos/$nombre/carpetas.json";
  if(!file_exists($archivo)){ return true; }
  $configuracion = json_decode(file_get_contents($archivo), true);
  return ($configuracion['activo'] ?? true) !== false;
}

function permisosTabla(ErinDatos $datos, $usuario, $tabla){
  $resultado = ['ver'=>0, 'insertar'=>0, 'actualizar'=>0, 'eliminar'=>0];
  foreach(scandir(dirname(__DIR__) . '/modulos') as $modulo){
    if($modulo === '.' || $modulo === '..' || !is_dir(dirname(__DIR__) . "/modulos/$modulo")){ continue; }
    if(in_array($tabla, tablasModulo($datos, $modulo), true)){
      $permisos = permisosModulo($datos, $usuario, $modulo);
      foreach($resultado as $accion => $valor){ $resultado[$accion] = (int)($valor || ($permisos['ver'] && $permisos[$accion])); }
    }
  }
  return $resultado;
}

$bloque = $_GET['bloque'] ?? '';
try{
  $datos = new ErinDatos();
  $instalado = $datos->instalado();
  if($bloque === 'estado'){ responder(['instalado'=>$instalado]); exit; }
  if(!$instalado){ throw new Exception('UnicornBBDD no está instalado para ERIN'); }
  $usuario = exigirUsuario($datos);
  $tabla = $_GET['tabla'] ?? '';

  switch($bloque){
    case 'modulos':
      $modulos = [];
      foreach(scandir(dirname(__DIR__) . '/modulos') as $nombre){
        if($nombre !== '.' && $nombre !== '..' && is_dir(dirname(__DIR__) . "/modulos/$nombre") && moduloActivo($nombre) && permisosModulo($datos, $usuario, $nombre)['ver']){
          $modulos[] = $nombre;
        }
      }
      if($tabla !== ''){
        validarTabla($datos, $tabla);
        usort($modulos, fn($a, $b) => (int)!in_array($tabla, tablasModulo($datos, $a), true) <=> (int)!in_array($tabla, tablasModulo($datos, $b), true));
      }
      responder($modulos);
      break;

    case 'menu':
      $modulo = $_GET['modulo'] ?? '';
      if($modulo === ''){ responder([]); break; }
      if(!permisosModulo($datos, $usuario, $modulo)['ver']){ http_response_code(403); throw new Exception('No tienes acceso al módulo'); }
      responder(tablasModulo($datos, $modulo));
      break;

    case 'tabla':
      validarTabla($datos, $tabla);
      if(!permisoTabla($datos, $usuario, $tabla, 'ver', 'tablasModulo')){ http_response_code(403); throw new Exception('Sin permiso de lectura'); }
      $contenido = $datos->listar($tabla);
      usort($contenido, fn($a, $b) => (int)$b['Identificador'] <=> (int)$a['Identificador']);
      responder(['tabla'=>$tabla, 'estructura'=>$datos->estructura($tabla), 'contenido'=>$contenido, 'permisos'=>permisosTabla($datos, $usuario, $tabla)]);
      break;

    case 'registro':
      validarTabla($datos, $tabla);
      if(!permisoTabla($datos, $usuario, $tabla, 'actualizar', 'tablasModulo')){ http_response_code(403); throw new Exception('Sin permiso para actualizar'); }
      $id = validarIdentificador($_GET['identificador'] ?? '');
      responder(['tabla'=>$tabla, 'estructura'=>$datos->estructura($tabla), 'registro'=>obtenerRegistro($datos, $tabla, $id)]);
      break;

    case 'opciones':
      $origen = $_GET['origen'] ?? '';
      validarTabla($datos, $origen);
      if(!permisoTabla($datos, $usuario, $origen, 'ver', 'tablasModulo')){ http_response_code(403); throw new Exception('Sin permiso de lectura'); }
      $valida = false;
      foreach($datos->estructura($origen) as $campo){ if(($campo['fk']['tabla'] ?? null) === $tabla){ $valida = true; break; } }
      if(!$valida){ http_response_code(403); throw new Exception('La tabla no es una relación del módulo visible'); }
      responder(['tabla'=>$tabla, 'opciones'=>opcionesRelacion($datos, $tabla)]);
      break;

    case 'insertar':
      exigirPost(); validarTabla($datos, $tabla);
      if(!permisoTabla($datos, $usuario, $tabla, 'insertar', 'tablasModulo')){ http_response_code(403); throw new Exception('Sin permiso para insertar'); }
      $valores = [];
      foreach(camposEditables($datos->estructura($tabla)) as $campo){ $valores[$campo['name']] = ($_POST[$campo['name']] ?? '') === '' ? null : $_POST[$campo['name']]; }
      if(!$valores){ throw new Exception('La tabla no contiene campos editables'); }
      $id = $datos->insertar($tabla, $valores);
      responder(['correcto'=>true, 'mensaje'=>'Registro insertado correctamente', 'identificador'=>$id], 201);
      break;

    case 'actualizar':
      exigirPost(); validarTabla($datos, $tabla);
      if(!permisoTabla($datos, $usuario, $tabla, 'actualizar', 'tablasModulo')){ http_response_code(403); throw new Exception('Sin permiso para actualizar'); }
      $id = validarIdentificador($_GET['identificador'] ?? '');
      obtenerRegistro($datos, $tabla, $id);
      $valores = [];
      foreach(camposEditables($datos->estructura($tabla)) as $campo){ $valores[$campo['name']] = ($_POST[$campo['name']] ?? '') === '' ? null : $_POST[$campo['name']]; }
      $datos->actualizar($tabla, $id, $valores);
      responder(['correcto'=>true, 'mensaje'=>'Registro actualizado correctamente']);
      break;

    case 'eliminar':
      exigirPost(); validarTabla($datos, $tabla);
      if(!permisoTabla($datos, $usuario, $tabla, 'eliminar', 'tablasModulo')){ http_response_code(403); throw new Exception('Sin permiso para eliminar'); }
      $id = validarIdentificador($_GET['identificador'] ?? '');
      obtenerRegistro($datos, $tabla, $id);
      $datos->eliminar($tabla, $id);
      responder(['correcto'=>true, 'mensaje'=>'Registro eliminado correctamente']);
      break;

    default:
      responder(['error'=>'Bloque no válido'], 400);
  }
}catch(Throwable $error){
  responder(['error'=>'Se ha producido un error', 'debug'=>$error->getMessage()], http_response_code() >= 400 ? http_response_code() : 500);
}

