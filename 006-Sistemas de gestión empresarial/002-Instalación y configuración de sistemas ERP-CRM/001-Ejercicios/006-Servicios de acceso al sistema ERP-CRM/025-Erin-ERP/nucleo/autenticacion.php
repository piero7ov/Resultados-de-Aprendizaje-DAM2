<?php
function versionActualErin(){ return '0.19'; }

function versionInstaladaErin($db){
  $existe = $db->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'erin_version'")->fetchColumn();
  if(!$existe){ return null; }
  $version = $db->query('SELECT version FROM erin_version WHERE id = 1')->fetchColumn();
  return $version === false ? null : $version;
}

function registrarVersionErin($db){
  $db->exec('CREATE TABLE IF NOT EXISTS erin_version (id INTEGER PRIMARY KEY CHECK (id = 1), version TEXT NOT NULL, fecha TEXT NOT NULL)');
  $consulta = $db->prepare('INSERT OR REPLACE INTO erin_version (id, version, fecha) VALUES (1, ?, datetime(\'now\'))');
  $consulta->execute([versionActualErin()]);
}

function iniciarSesionErin(){
  if(session_status() !== PHP_SESSION_ACTIVE){ session_start(); }
}

function crearTablasAcceso($db){
  $db->exec('CREATE TABLE IF NOT EXISTS erin_usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    usuario TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    clave TEXT NOT NULL,
    administrador INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1
  )');
  $db->exec('CREATE TABLE IF NOT EXISTS erin_permisos (
    usuario_id INTEGER NOT NULL,
    modulo TEXT NOT NULL,
    ver INTEGER NOT NULL DEFAULT 0,
    insertar INTEGER NOT NULL DEFAULT 0,
    actualizar INTEGER NOT NULL DEFAULT 0,
    eliminar INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (usuario_id, modulo),
    FOREIGN KEY (usuario_id) REFERENCES erin_usuarios(id) ON DELETE CASCADE
  )');
}

function usuarioActual($db){
  iniciarSesionErin();
  $id = $_SESSION['usuario_erin'] ?? 0;
  if(!$id){ return null; }
  $consulta = $db->prepare('SELECT id, nombre, usuario, email, administrador, activo FROM erin_usuarios WHERE id = ?');
  $consulta->execute([$id]);
  $usuario = $consulta->fetch(PDO::FETCH_ASSOC);
  return $usuario && $usuario['activo'] ? $usuario : null;
}

function exigirUsuario($db){
  $usuario = usuarioActual($db);
  if(!$usuario){ http_response_code(401); throw new Exception('Inicia sesión para acceder a ERIN'); }
  return $usuario;
}

function exigirAdministrador($db){
  $usuario = exigirUsuario($db);
  if(!$usuario['administrador']){ http_response_code(403); throw new Exception('Acceso reservado al administrador'); }
  return $usuario;
}

function permisosModulo($db, $usuario, $modulo){
  if($usuario['administrador']){
    return ['ver'=>1, 'insertar'=>1, 'actualizar'=>1, 'eliminar'=>1];
  }
  $consulta = $db->prepare('SELECT ver, insertar, actualizar, eliminar FROM erin_permisos WHERE usuario_id = ? AND modulo = ?');
  $consulta->execute([$usuario['id'], $modulo]);
  return $consulta->fetch(PDO::FETCH_ASSOC) ?: ['ver'=>0, 'insertar'=>0, 'actualizar'=>0, 'eliminar'=>0];
}

function permisoTabla($db, $usuario, $tabla, $operacion, $funcionTablasModulo){
  foreach(scandir(dirname(__DIR__) . '/modulos') as $modulo){
    if($modulo === '.' || $modulo === '..' || !is_dir(dirname(__DIR__) . '/modulos/' . $modulo)){ continue; }
    $permisos = permisosModulo($db, $usuario, $modulo);
    if(in_array($tabla, $funcionTablasModulo($db, $modulo), true) && $permisos['ver'] && $permisos[$operacion]){
      return true;
    }
  }
  return false;
}
