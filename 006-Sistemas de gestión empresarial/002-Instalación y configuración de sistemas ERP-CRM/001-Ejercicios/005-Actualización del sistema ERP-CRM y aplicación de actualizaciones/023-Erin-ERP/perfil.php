<?php
require_once __DIR__ . '/nucleo/autenticacion.php';
function escapar($texto){ return htmlspecialchars((string)$texto, ENT_QUOTES, 'UTF-8'); }
$archivo = __DIR__ . '/data/erin.sqlite';
if(!file_exists($archivo)){ header('Location: instalacion/instalar.php'); exit; }
$db = new PDO('sqlite:' . $archivo);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
try{ $usuarioActual = exigirUsuario($db); }
catch(Throwable $error){ header('Location: acceso.html'); exit; }
iniciarSesionErin();
if(!isset($_SESSION['token_perfil'])){ $_SESSION['token_perfil'] = bin2hex(random_bytes(24)); }
$error = null;
$mensaje = $_SESSION['mensaje_perfil'] ?? null;
unset($_SESSION['mensaje_perfil']);
if(($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST'){
  try{
    if(!hash_equals($_SESSION['token_perfil'], $_POST['token'] ?? '')){ throw new Exception('Sesión caducada. Recarga la página.'); }
    $nombre = trim($_POST['nombre'] ?? '');
    $usuario = trim($_POST['usuario'] ?? '');
    $email = trim($_POST['email'] ?? '');
    $claveNueva = $_POST['clave_nueva'] ?? '';
    if($nombre === '' || !preg_match('/^[a-zA-Z0-9_.-]{3,50}$/', $usuario) || !filter_var($email, FILTER_VALIDATE_EMAIL)){
      throw new Exception('Revisa el nombre, el usuario y el correo.');
    }
    $sql = 'UPDATE erin_usuarios SET nombre=?, usuario=?, email=?';
    $valores = [$nombre, $usuario, $email];
    if($claveNueva !== ''){
      if(strlen($claveNueva) < 8){ throw new Exception('La contraseña nueva debe tener al menos 8 caracteres.'); }
      $consulta = $db->prepare('SELECT clave FROM erin_usuarios WHERE id = ?');
      $consulta->execute([$usuarioActual['id']]);
      if(!password_verify($_POST['clave_actual'] ?? '', $consulta->fetchColumn())){
        throw new Exception('La contraseña actual no es correcta.');
      }
      $sql .= ', clave=?';
      $valores[] = password_hash($claveNueva, PASSWORD_DEFAULT);
    }
    $sql .= ' WHERE id=?';
    $valores[] = $usuarioActual['id'];
    $db->prepare($sql)->execute($valores);
    $_SESSION['mensaje_perfil'] = 'Tus datos se han guardado.';
    header('Location: perfil.php');
    exit;
  }catch(Throwable $excepcion){
    $error = $excepcion instanceof PDOException && str_contains($excepcion->getMessage(), 'UNIQUE') ? 'Ese nombre de usuario ya está en uso.' : $excepcion->getMessage();
  }
}
?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Mi perfil · ERIN ERP</title><link rel="stylesheet" href="nucleo/estilo/general.css"><link rel="stylesheet" href="nucleo/estilo/usuarios.css"></head><body>
<header><div class="marca"><a class="logotipo" href="index.html">ER<span class="letra-i">I</span>N</a><small>Ecosistema de Recursos,<br>Información y Negocio</small></div><h1>Mi perfil</h1><div class="usuario"><div class="avatar" aria-hidden="true"></div><div><p><?= escapar($usuarioActual['nombre']) ?></p><a href="index.html">Volver a ERIN</a></div></div></header>
<div class="estructura estructura-usuarios"><nav id="lista-usuarios" aria-label="Perfil"><p class="titulo-menu">MI CUENTA</p><a class="activo" href="perfil.php">Datos personales</a><?php if($usuarioActual['administrador']){ ?><a href="usuarios.php">Administrar usuarios</a><?php } ?></nav><main id="contenido-usuarios">
<?php if($error){ ?><p class="aviso error" role="alert"><?= escapar($error) ?></p><?php } if($mensaje){ ?><p class="aviso" role="status"><?= escapar($mensaje) ?></p><?php } ?>
<div class="encabezado-usuarios"><div><p class="sobre-titulo">MI CUENTA</p><h2><?= escapar($usuarioActual['nombre']) ?></h2><p>Actualiza tus datos de acceso.</p></div><span class="recuento"><?= $usuarioActual['administrador'] ? 'Administrador' : 'Usuario' ?></span></div>
<section class="panel"><div class="titulo-panel"><span class="paso">1</span><div><h3>Datos personales</h3><p>La contraseña solo cambia si completas los dos campos correspondientes.</p></div></div>
<form method="post" class="formulario-usuario"><input type="hidden" name="token" value="<?= escapar($_SESSION['token_perfil']) ?>"><label>Nombre<input name="nombre" required value="<?= escapar($usuarioActual['nombre']) ?>"></label><label>Usuario<input name="usuario" required pattern="[a-zA-Z0-9_.-]{3,50}" value="<?= escapar($usuarioActual['usuario']) ?>"></label><label>Correo<input name="email" type="email" required value="<?= escapar($usuarioActual['email']) ?>"></label><label>Contraseña actual<input name="clave_actual" type="password" autocomplete="current-password"></label><label>Nueva contraseña<input name="clave_nueva" type="password" minlength="8" autocomplete="new-password"></label><div class="acciones-usuario"><button class="boton" type="submit">Guardar mis datos</button></div></form></section>
</main></div><footer><div><strong>ERIN ERP</strong><span>Mi perfil</span></div><div></div><div><a class="enlace-pie" href="index.html">Volver a la aplicación</a></div></footer></body></html>
