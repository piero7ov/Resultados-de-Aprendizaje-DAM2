<?php
require_once __DIR__ . '/nucleo/autenticacion.php';
function escapar($texto){ return htmlspecialchars((string)$texto, ENT_QUOTES, 'UTF-8'); }
$datos = new ErinDatos();
if(!$datos->instalado()){ header('Location: instalacion/instalar.php'); exit; }
try{ $usuarioSesion = exigirUsuario($datos); }catch(Throwable $error){ header('Location: acceso.html'); exit; }
iniciarSesionErin();
if(!isset($_SESSION['token_usuarios'])){ $_SESSION['token_usuarios'] = bin2hex(random_bytes(24)); }
$error = null;
$mensaje = $_SESSION['mensaje_usuarios'] ?? null;
unset($_SESSION['mensaje_usuarios']);
$modulos = [];
foreach(scandir(__DIR__ . '/modulos') as $modulo){
  if($modulo !== '.' && $modulo !== '..' && is_dir(__DIR__ . '/modulos/' . $modulo)){ $modulos[] = $modulo; }
}
try{
  if(($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST'){
    if(!hash_equals($_SESSION['token_usuarios'], $_POST['token'] ?? '')){ throw new Exception('Sesión caducada'); }
    $accion = $_POST['accion'] ?? '';
    if($accion === 'guardar_perfil'){
      $nombre = trim($_POST['nombre'] ?? '');
      $usuario = trim($_POST['usuario'] ?? '');
      $email = trim($_POST['email'] ?? '');
      $claveNueva = $_POST['clave_nueva'] ?? '';
      if($nombre === '' || !preg_match('/^[a-zA-Z0-9_.-]{3,50}$/', $usuario) || !filter_var($email, FILTER_VALIDATE_EMAIL)){
        throw new Exception('Revisa el nombre, usuario y correo');
      }
      foreach($datos->buscar('erin_usuarios', 'usuario', $usuario) as $coincidencia){
        if((int)$coincidencia['Identificador'] !== (int)$usuarioSesion['id']){ throw new Exception('Ese nombre de usuario ya está en uso'); }
      }
      $cambios = ['nombre'=>$nombre, 'usuario'=>$usuario, 'email'=>$email];
      if($claveNueva !== ''){
        if(strlen($claveNueva) < 8){ throw new Exception('La contraseña nueva debe tener al menos 8 caracteres'); }
        $actual = $datos->obtener('erin_usuarios', (int)$usuarioSesion['id']);
        if(!$actual || !password_verify($_POST['clave_actual'] ?? '', $actual['clave'])){ throw new Exception('La contraseña actual no es correcta'); }
        $cambios['clave'] = password_hash($claveNueva, PASSWORD_DEFAULT);
      }
      $datos->actualizar('erin_usuarios', (int)$usuarioSesion['id'], $cambios);
      $_SESSION['mensaje_usuarios'] = 'Tus datos se han guardado';
      header('Location: usuarios.php'); exit;
    }elseif($accion === 'guardar_usuario'){
      if(!$usuarioSesion['administrador']){ throw new Exception('Acceso reservado al administrador'); }
      $id = (int)($_POST['id'] ?? 0);
      $nombre = trim($_POST['nombre'] ?? '');
      $usuario = trim($_POST['usuario'] ?? '');
      $email = trim($_POST['email'] ?? '');
      $clave = $_POST['clave'] ?? '';
      $activo = isset($_POST['activo']) ? 1 : 0;
      $administrador = ($_POST['rol'] ?? 'usuario') === 'administrador' ? 1 : 0;
      if($nombre === '' || !preg_match('/^[a-zA-Z0-9_.-]{3,50}$/', $usuario) || !filter_var($email, FILTER_VALIDATE_EMAIL)){ throw new Exception('Revisa el nombre, usuario y correo'); }
      if($id === (int)$usuarioSesion['id'] && (!$administrador || !$activo)){ throw new Exception('No puedes quitarte el rol administrador ni desactivar tu propia cuenta'); }
      foreach($datos->buscar('erin_usuarios', 'usuario', $usuario) as $coincidencia){
        if((int)$coincidencia['Identificador'] !== $id){ throw new Exception('Ese nombre de usuario ya está en uso'); }
      }
      $fila = ['nombre'=>$nombre, 'usuario'=>$usuario, 'email'=>$email, 'activo'=>$activo, 'administrador'=>$administrador];
      if($id){
        if(!$datos->obtener('erin_usuarios', $id)){ throw new Exception('El usuario no existe'); }
        if($clave !== ''){ if(strlen($clave) < 8){ throw new Exception('La contraseña debe tener al menos 8 caracteres'); } $fila['clave'] = password_hash($clave, PASSWORD_DEFAULT); }
        $datos->actualizar('erin_usuarios', $id, $fila);
      }else{
        if(strlen($clave) < 8){ throw new Exception('La contraseña debe tener al menos 8 caracteres'); }
        $fila['clave'] = password_hash($clave, PASSWORD_DEFAULT);
        $id = $datos->insertar('erin_usuarios', $fila);
      }
      $_SESSION['mensaje_usuarios'] = 'Datos y rol guardados';
      header('Location: usuarios.php?id=' . $id); exit;
    }elseif($accion === 'eliminar_usuario'){
      if(!$usuarioSesion['administrador']){ throw new Exception('Acceso reservado al administrador'); }
      $id = (int)($_POST['id'] ?? 0);
      if($id === (int)$usuarioSesion['id']){ throw new Exception('No puedes eliminar tu propia cuenta'); }
      foreach($datos->buscar('erin_permisos', 'usuario_id', (string)$id) as $permiso){ $datos->eliminar('erin_permisos', (int)$permiso['Identificador']); }
      $datos->eliminar('erin_usuarios', $id);
      $_SESSION['mensaje_usuarios'] = 'Usuario eliminado';
      header('Location: usuarios.php'); exit;
    }elseif($accion === 'guardar_permisos'){
      if(!$usuarioSesion['administrador']){ throw new Exception('Acceso reservado al administrador'); }
      $id = (int)($_POST['id'] ?? 0);
      $destino = $datos->obtener('erin_usuarios', $id);
      if(!$destino || (int)$destino['administrador']){ throw new Exception('Usuario no válido'); }
      $datos->iniciarTransaccion();
      try{
        foreach($datos->buscar('erin_permisos', 'usuario_id', (string)$id) as $permiso){ $datos->eliminar('erin_permisos', (int)$permiso['Identificador']); }
        foreach($modulos as $modulo){
          $checks = $_POST['permisos'][$modulo] ?? [];
          $ver = isset($checks['ver']) ? 1 : 0;
          $datos->insertar('erin_permisos', [
            'usuario_id'=>$id, 'modulo'=>$modulo, 'ver'=>$ver,
            'insertar'=>$ver && isset($checks['insertar']) ? 1 : 0,
            'actualizar'=>$ver && isset($checks['actualizar']) ? 1 : 0,
            'eliminar'=>$ver && isset($checks['eliminar']) ? 1 : 0
          ]);
        }
        $datos->confirmar();
      }catch(Throwable $fallo){ $datos->deshacer(); throw $fallo; }
      $_SESSION['mensaje_usuarios'] = 'Acceso a módulos guardado';
      header('Location: usuarios.php?id=' . $id); exit;
    }else{ throw new Exception('Acción no válida'); }
  }
}catch(Throwable $excepcion){ $error = $excepcion->getMessage(); }

$usuarios = $usuarioSesion['administrador'] ? $datos->listar('erin_usuarios') : [$usuarioSesion];
foreach($usuarios as &$fila){
  $fila['id'] = (int)($fila['Identificador'] ?? $fila['id']);
  unset($fila['clave']);
}
unset($fila);
usort($usuarios, fn($a,$b) => ((int)$b['administrador'] <=> (int)$a['administrador']) ?: strcasecmp($a['nombre'], $b['nombre']));
$idElegido = $usuarioSesion['administrador'] && isset($_GET['nuevo']) ? 0 : (int)($_GET['id'] ?? $usuarioSesion['id']);
if(!$usuarioSesion['administrador']){ $idElegido = (int)$usuarioSesion['id']; }
$elegido = null;
foreach($usuarios as $elemento){ if((int)$elemento['id'] === $idElegido){ $elegido = $elemento; } }
$permisos = [];
if($elegido){
  foreach($datos->buscar('erin_permisos', 'usuario_id', (string)$idElegido) as $fila){ $permisos[$fila['modulo']] = $fila; }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Usuarios · ERIN ERP</title>
  <link rel="stylesheet" href="nucleo/estilo/general.css">
  <link rel="stylesheet" href="nucleo/estilo/usuarios.css">
</head>
<body>
  <header>
    <div class="marca"><a class="logotipo" href="index.html">ER<span class="letra-i">I</span>N</a><small>Ecosistema de Recursos,<br>Información y Negocio</small></div>
    <h1><?= $usuarioSesion['administrador'] ? 'Usuarios' : 'Mi cuenta' ?></h1>
    <div class="usuario"><div class="avatar" aria-hidden="true"></div><div><p><?= escapar($usuarioSesion['nombre']) ?></p><?php if($usuarioSesion['administrador']){ ?><a href="configuracion.php">Opciones</a> <?php } ?><a href="index.html">Volver a ERIN</a></div></div>
  </header>
  <div class="estructura estructura-usuarios">
    <nav id="lista-usuarios" aria-label="Usuarios">
      <p class="titulo-menu"><?= $usuarioSesion['administrador'] ? 'USUARIOS · ' . count($usuarios) : 'MI CUENTA' ?></p>
      <?php if($usuarioSesion['administrador']){ ?><a class="<?= $idElegido === 0 ? 'activo' : '' ?>" href="usuarios.php?nuevo=1">+ Nuevo usuario</a><?php } ?>
      <?php foreach($usuarios as $fila){ ?>
        <a class="<?= $idElegido === (int)$fila['id'] ? 'activo' : '' ?>" href="usuarios.php?id=<?= (int)$fila['id'] ?>" <?= $idElegido === (int)$fila['id'] ? 'aria-current="page"' : '' ?>>
          <span><?= escapar($fila['nombre']) ?></span><small><?= escapar($fila['usuario']) ?> · <?= $fila['administrador'] ? 'Administrador' : 'Usuario' ?><?= $fila['activo'] ? '' : ' · Inactivo' ?></small>
        </a>
      <?php } ?>
    </nav>
    <main id="contenido-usuarios">
      <?php if($error){ ?><p class="aviso error" role="alert"><?= escapar($error) ?></p><?php } ?>
      <?php if($mensaje){ ?><p class="aviso" role="status"><?= escapar($mensaje) ?></p><?php } ?>
      <?php if($idElegido && !$elegido){ ?>
        <section class="panel"><h2>Usuario no encontrado</h2><p>Selecciona otro usuario en la barra lateral.</p></section>
      <?php }else{ ?>
        <div class="encabezado-usuarios"><div><p class="sobre-titulo"><?= $elegido && (int)$elegido['id'] === (int)$usuarioSesion['id'] ? 'MI CUENTA' : 'GESTIÓN DE ACCESO' ?></p><h2><?= $elegido ? escapar($elegido['nombre']) : 'Nuevo usuario' ?></h2><p><?= $elegido && (int)$elegido['id'] === (int)$usuarioSesion['id'] ? 'Actualiza tus datos de acceso.' : ($elegido ? 'Edita sus datos, rol y módulos disponibles.' : 'Crea una cuenta y después asigna sus módulos.') ?></p></div><?php if($elegido){ ?><span class="recuento"><?= $elegido['administrador'] ? 'Administrador' : 'Usuario' ?> · <?= $elegido['activo'] ? 'Activo' : 'Inactivo' ?></span><?php } ?></div>
        <section class="panel">
          <div class="titulo-panel"><span class="paso">1</span><div><h3><?= $elegido && (int)$elegido['id'] === (int)$usuarioSesion['id'] ? 'Mis datos' : 'Datos y rol' ?></h3><p><?= $elegido && (int)$elegido['id'] === (int)$usuarioSesion['id'] ? 'Para cambiar la contraseña, indica también la actual.' : 'El administrador tiene acceso completo. El usuario estándar usa los permisos por módulo.' ?></p></div></div>
          <?php if($elegido && (int)$elegido['id'] === (int)$usuarioSesion['id']){ ?>
          <form method="post" class="formulario-usuario">
            <input type="hidden" name="token" value="<?= escapar($_SESSION['token_usuarios']) ?>">
            <input type="hidden" name="accion" value="guardar_perfil">
            <label>Nombre<input name="nombre" required value="<?= escapar($elegido['nombre']) ?>"></label>
            <label>Usuario<input name="usuario" required pattern="[a-zA-Z0-9_.-]{3,50}" value="<?= escapar($elegido['usuario']) ?>"></label>
            <label>Correo<input name="email" type="email" required value="<?= escapar($elegido['email']) ?>"></label>
            <label>Contraseña actual<input name="clave_actual" type="password" autocomplete="current-password"></label>
            <label>Nueva contraseña <small>Déjala vacía para conservarla</small><input name="clave_nueva" type="password" minlength="8" autocomplete="new-password"></label>
            <div class="acciones-usuario"><button class="boton" type="submit">Guardar mis datos</button></div>
          </form>
          <?php }else{ ?>
          <form method="post" class="formulario-usuario">
            <input type="hidden" name="token" value="<?= escapar($_SESSION['token_usuarios']) ?>">
            <input type="hidden" name="accion" value="guardar_usuario">
            <input type="hidden" name="id" value="<?= $elegido ? (int)$elegido['id'] : 0 ?>">
            <label>Nombre<input name="nombre" required value="<?= escapar($elegido['nombre'] ?? '') ?>"></label>
            <label>Usuario<input name="usuario" required pattern="[a-zA-Z0-9_.-]{3,50}" value="<?= escapar($elegido['usuario'] ?? '') ?>"></label>
            <label>Correo<input name="email" type="email" required value="<?= escapar($elegido['email'] ?? '') ?>"></label>
            <label>Contraseña <small><?= $elegido ? 'Déjala vacía para conservarla' : 'Mínimo 8 caracteres' ?></small><input name="clave" type="password" minlength="8" <?= $elegido ? '' : 'required' ?>></label>
            <label>Rol<select name="rol"><option value="usuario" <?= !$elegido || !$elegido['administrador'] ? 'selected' : '' ?>>Usuario</option><option value="administrador" <?= $elegido && $elegido['administrador'] ? 'selected' : '' ?>>Administrador</option></select></label>
            <label class="estado-usuario"><input name="activo" type="checkbox" <?= !$elegido || $elegido['activo'] ? 'checked' : '' ?>> Cuenta activa</label>
            <div class="acciones-usuario"><button class="boton" type="submit">Guardar datos y rol</button></div>
          </form>
          <?php } ?>
        </section>
        <?php if($elegido && $usuarioSesion['administrador'] && (int)$elegido['id'] !== (int)$usuarioSesion['id']){ ?>
          <section class="panel">
            <div class="titulo-panel"><span class="paso">2</span><div><h3>Acceso a módulos</h3><p>«Ver» muestra el módulo. Las otras casillas permiten insertar, actualizar o eliminar.</p></div></div>
            <?php if($elegido['administrador']){ ?><p class="nota-permisos">Esta cuenta tiene acceso completo por su rol de administrador.</p><?php }else{ ?>
              <form method="post" id="formulario-permisos">
                <input type="hidden" name="token" value="<?= escapar($_SESSION['token_usuarios']) ?>">
                <input type="hidden" name="accion" value="guardar_permisos">
                <input type="hidden" name="id" value="<?= (int)$elegido['id'] ?>">
                <div class="tabla-contenedor"><table class="tabla-permisos"><thead><tr><th scope="col">Módulo</th><th scope="col">Ver</th><th scope="col">Insertar</th><th scope="col">Actualizar</th><th scope="col">Eliminar</th><th scope="col">Selección</th></tr></thead><tbody>
                  <?php foreach($modulos as $modulo){ ?><tr class="fila-permisos"><th scope="row"><?= escapar(ucfirst($modulo)) ?></th><?php foreach(['ver','insertar','actualizar','eliminar'] as $operacion){ ?><td><label class="check-permiso"><input type="checkbox" name="permisos[<?= escapar($modulo) ?>][<?= $operacion ?>]" data-operacion="<?= $operacion ?>" aria-label="<?= escapar(ucfirst($operacion) . ' en ' . $modulo) ?>" <?= ($permisos[$modulo][$operacion] ?? 0) ? 'checked' : '' ?>><span></span></label></td><?php } ?><td class="acciones-permisos"><button type="button" data-seleccion="todo">Seleccionar todo</button><button type="button" data-seleccion="nada">No seleccionar nada</button></td></tr><?php } ?>
                </tbody></table></div>
                <div class="acciones-usuario"><button class="boton" type="submit">Guardar acceso a módulos</button></div>
              </form>
            <?php } ?>
          </section>
          <form method="post" class="eliminar-usuario" onsubmit="return confirm('¿Eliminar este usuario?')"><input type="hidden" name="token" value="<?= escapar($_SESSION['token_usuarios']) ?>"><input type="hidden" name="accion" value="eliminar_usuario"><input type="hidden" name="id" value="<?= (int)$elegido['id'] ?>"><button type="submit">Eliminar usuario</button></form>
        <?php } ?>
      <?php } ?>
    </main>
  </div>
  <footer><div><strong>ERIN ERP</strong><span>Administración de usuarios</span></div><div></div><div><a class="enlace-pie" href="index.html">Volver a la aplicación</a></div></footer>
  <script>
    document.querySelectorAll('.fila-permisos').forEach(function(fila){
      let ver = fila.querySelector('[data-operacion="ver"]');
      let acciones = fila.querySelectorAll('[data-operacion]:not([data-operacion="ver"])');
      function actualizar(){ acciones.forEach(function(casilla){ if(!ver.checked){ casilla.checked = false; } casilla.disabled = !ver.checked; }); }
      ver.addEventListener('change', actualizar);
      fila.querySelector('[data-seleccion="todo"]').addEventListener('click', function(){
        fila.querySelectorAll('[data-operacion]').forEach(function(casilla){ casilla.checked = true; });
        actualizar();
      });
      fila.querySelector('[data-seleccion="nada"]').addEventListener('click', function(){
        fila.querySelectorAll('[data-operacion]').forEach(function(casilla){ casilla.checked = false; });
        actualizar();
      });
      actualizar();
    });
  </script>
</body>
</html>
