<?php
require_once __DIR__ . '/datos/ErinDatos.php';

function versionActualErin(){ return '0.23'; }

function versionInstaladaErin(ErinDatos $datos){
  if(!$datos->existeTabla('erin_version')){ return null; }
  $versiones = $datos->listar('erin_version');
  return $versiones[0]['version'] ?? null;
}

function registrarVersionErin(ErinDatos $datos){
  if(!$datos->existeTabla('erin_version')){
    $datos->crearTabla('erin_version', ['version'=>'TEXT', 'fecha'=>'TEXT']);
  }
  $versiones = $datos->listar('erin_version');
  $fila = ['version'=>versionActualErin(), 'fecha'=>date('Y-m-d H:i:s')];
  if($versiones){ $datos->actualizar('erin_version', (int)$versiones[0]['Identificador'], $fila); }
  else{ $datos->insertar('erin_version', $fila); }
}

function iniciarSesionErin(){
  if(session_status() !== PHP_SESSION_ACTIVE){ session_start(); }
}

function crearTablasAcceso(ErinDatos $datos){
  if(!$datos->existeTabla('erin_usuarios')){
    $datos->crearTabla('erin_usuarios', [
      'nombre'=>'TEXT', 'usuario'=>'TEXT', 'email'=>'TEXT', 'clave'=>'TEXT',
      'administrador'=>'INTEGER', 'activo'=>'INTEGER'
    ]);
    $datos->hacerUnico('erin_usuarios', 'usuario');
  }
  if(!$datos->existeTabla('erin_permisos')){
    $datos->crearTabla('erin_permisos', [
      'usuario_id'=>'INTEGER', 'modulo'=>'TEXT', 'ver'=>'INTEGER',
      'insertar'=>'INTEGER', 'actualizar'=>'INTEGER', 'eliminar'=>'INTEGER'
    ]);
    $datos->anadirClaveForanea('erin_permisos', 'usuario_id', 'erin_usuarios');
  }
}

function usuarioActual(ErinDatos $datos){
  iniciarSesionErin();
  $id = (int)($_SESSION['usuario_erin'] ?? 0);
  if(!$id){ return null; }
  $usuario = $datos->obtener('erin_usuarios', $id);
  if(!$usuario || !(int)($usuario['activo'] ?? 0)){ return null; }
  unset($usuario['clave']);
  $usuario['id'] = (int)$usuario['Identificador'];
  return $usuario;
}

function exigirUsuario(ErinDatos $datos){
  $usuario = usuarioActual($datos);
  if(!$usuario){ http_response_code(401); throw new Exception('Inicia sesión para acceder a ERIN'); }
  return $usuario;
}

function exigirAdministrador(ErinDatos $datos){
  $usuario = exigirUsuario($datos);
  if(!(int)$usuario['administrador']){ http_response_code(403); throw new Exception('Acceso reservado al administrador'); }
  return $usuario;
}

function permisosModulo(ErinDatos $datos, $usuario, $modulo){
  if((int)$usuario['administrador']){
    return ['ver'=>1, 'insertar'=>1, 'actualizar'=>1, 'eliminar'=>1];
  }
  foreach($datos->buscar('erin_permisos', 'usuario_id', (string)$usuario['id']) as $permiso){
    if(($permiso['modulo'] ?? '') === $modulo){
      return [
        'ver'=>(int)$permiso['ver'], 'insertar'=>(int)$permiso['insertar'],
        'actualizar'=>(int)$permiso['actualizar'], 'eliminar'=>(int)$permiso['eliminar']
      ];
    }
  }
  return ['ver'=>0, 'insertar'=>0, 'actualizar'=>0, 'eliminar'=>0];
}

function permisoTabla(ErinDatos $datos, $usuario, $tabla, $operacion, $funcionTablasModulo){
  foreach(scandir(dirname(__DIR__) . '/modulos') as $modulo){
    if($modulo === '.' || $modulo === '..' || !is_dir(dirname(__DIR__) . '/modulos/' . $modulo)){ continue; }
    $permisos = permisosModulo($datos, $usuario, $modulo);
    if(in_array($tabla, $funcionTablasModulo($datos, $modulo), true) && $permisos['ver'] && $permisos[$operacion]){
      return true;
    }
  }
  return false;
}

