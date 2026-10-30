<?php
header('Content-Type: application/json; charset=utf-8');
require_once dirname(__DIR__) . '/nucleo/autenticacion.php';
function responderAcceso($datos, $codigo = 200){ http_response_code($codigo); echo json_encode($datos, JSON_UNESCAPED_UNICODE); }
try{
  $archivo = dirname(__DIR__) . '/data/erin.sqlite';
  if(!file_exists($archivo)){ responderAcceso(['instalado'=>false]); exit; }
  $db = new PDO('sqlite:' . $archivo);
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $accion = $_POST['accion'] ?? $_GET['accion'] ?? 'estado';
  if($accion === 'entrar'){
    if(($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST'){ throw new Exception('Método no válido'); }
    $consulta = $db->prepare('SELECT * FROM erin_usuarios WHERE usuario = ? AND activo = 1');
    $consulta->execute([trim($_POST['usuario'] ?? '')]);
    $usuario = $consulta->fetch(PDO::FETCH_ASSOC);
    if(!$usuario || !password_verify($_POST['clave'] ?? '', $usuario['clave'])){
      responderAcceso(['error'=>'Usuario o contraseña incorrectos'], 401); exit;
    }
    iniciarSesionErin();
    session_regenerate_id(true);
    $_SESSION['usuario_erin'] = $usuario['id'];
    responderAcceso(['correcto'=>true]); exit;
  }
  if($accion === 'salir'){
    iniciarSesionErin();
    $_SESSION = [];
    session_destroy();
    responderAcceso(['correcto'=>true]); exit;
  }
  $usuario = usuarioActual($db);
  responderAcceso(['instalado'=>true, 'usuario'=>$usuario]);
}catch(Throwable $error){
  responderAcceso(['error'=>$error->getMessage()], 500);
}
