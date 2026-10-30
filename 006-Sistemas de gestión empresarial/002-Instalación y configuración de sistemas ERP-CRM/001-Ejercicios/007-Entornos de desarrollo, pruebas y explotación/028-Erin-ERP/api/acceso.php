<?php
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__) . '/nucleo/autenticacion.php';
function responderAcceso($datos, $codigo = 200){ http_response_code($codigo); echo json_encode($datos, JSON_UNESCAPED_UNICODE); }
try{
  $datos = new ErinDatos();
  if(!$datos->instalado()){ responderAcceso(['instalado'=>false]); exit; }
  $accion = $_POST['accion'] ?? $_GET['accion'] ?? 'estado';
  if($accion === 'entrar'){
    if(($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'){ throw new Exception('Método no válido'); }
    $coincidencias = $datos->buscar('erin_usuarios', 'usuario', trim($_POST['usuario'] ?? ''));
    $usuario = $coincidencias[0] ?? null;
    if(!$usuario || !(int)$usuario['activo'] || !password_verify($_POST['clave'] ?? '', $usuario['clave'])){
      responderAcceso(['error'=>'Usuario o contraseña incorrectos'], 401); exit;
    }
    iniciarSesionErin();
    session_regenerate_id(true);
    $_SESSION['usuario_erin'] = (int)$usuario['Identificador'];
    responderAcceso(['correcto'=>true]); exit;
  }
  if($accion === 'salir'){
    iniciarSesionErin(); $_SESSION = []; session_destroy();
    responderAcceso(['correcto'=>true]); exit;
  }
  responderAcceso(['instalado'=>true, 'usuario'=>usuarioActual($datos)]);
}catch(Throwable $error){ responderAcceso(['error'=>$error->getMessage()], 500); }

