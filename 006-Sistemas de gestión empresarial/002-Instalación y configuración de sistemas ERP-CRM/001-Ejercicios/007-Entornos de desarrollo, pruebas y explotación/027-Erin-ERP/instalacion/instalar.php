<?php
require_once __DIR__ . '/presets.php';
require_once __DIR__ . '/modelo.php';
require_once dirname(__DIR__) . '/nucleo/autenticacion.php';

function escapar($texto){ return htmlspecialchars((string)$texto, ENT_QUOTES, 'UTF-8'); }

function comprobarTablasVacias(ErinDatos $datos){
  foreach($datos->tablas(false) as $tabla){
    if(count($datos->listar($tabla)) > 0){ throw new Exception('La importación solo se permite si todas las tablas de negocio están vacías.'); }
  }
}

$datos = new ErinDatos();
$instalado = $datos->instalado();
if($instalado){
  try{ exigirAdministrador($datos); }catch(Throwable $error){ header('Location: ../acceso.html'); exit; }
}
$error = null;
$mensajes = [];
$instalacionCompletada = false;
$datosImportados = false;
$modeloElegido = presetActivo();
$nombres = ['vacio'=>'Diseñar desde cero', 'pequena'=>'Empresa pequeña', 'completo'=>'ERP completo actual'];
$nombreModelo = $nombres[$modeloElegido];
$diagrama = leerDiagrama();
$tablasModelo = validarDiagrama($diagrama);
$cantidadEntidades = count($tablasModelo);
$seleccionReciente = ($_GET['seleccionado'] ?? '') === $modeloElegido;
$archivoDatos = archivoDatosPreset();

if(($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST'){
  $accion = $_POST['accion'] ?? '';
  try{
    if(!extension_loaded('FFI')){ throw new Exception('PHP necesita la extensión FFI para cargar UnicornBBDD'); }
    if($accion === 'elegir_preset' && !$instalado){
      aplicarPreset($_POST['preset'] ?? '');
      header('Location: instalar.php?seleccionado=' . urlencode($_POST['preset'] ?? '')); exit;
    }
    if($accion === 'instalar' && !$instalado){
      $nombre = trim($_POST['nombre_administrador'] ?? '');
      $usuario = trim($_POST['usuario_administrador'] ?? '');
      $email = trim($_POST['email_administrador'] ?? '');
      $clave = $_POST['clave_administrador'] ?? '';
      if($nombre === '' || !preg_match('/^[a-zA-Z0-9_.-]{3,50}$/', $usuario) || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($clave) < 8){
        throw new Exception('Indica nombre, usuario válido, correo y una contraseña de al menos 8 caracteres');
      }
      $datos->crearBase();
      try{
        crearModeloUnicorn($datos, $diagrama);
        crearTablasAcceso($datos);
        registrarVersionErin($datos);
        $datos->insertar('erin_usuarios', [
          'nombre'=>$nombre, 'usuario'=>$usuario, 'email'=>$email,
          'clave'=>password_hash($clave, PASSWORD_DEFAULT), 'administrador'=>1, 'activo'=>1
        ]);
        if(isset($_POST['importar_datos'])){
          if($archivoDatos === null){ throw new Exception('Este modelo no incluye datos de demostración'); }
          $cantidad = importarDatosDemostracion($datos, $archivoDatos, $diagrama);
          $datosImportados = true;
          $mensajes[] = "$cantidad registros de demostración importados";
        }
      }catch(Throwable $fallo){
        $datos->eliminarBase();
        throw $fallo;
      }
      $instalado = true;
      $instalacionCompletada = true;
      $mensajes[] = count($tablasModelo) . ' tablas de negocio creadas con UnicornBBDD';
    }elseif($accion === 'importar' && $instalado){
      if($archivoDatos === null){ throw new Exception('Este modelo no incluye datos de demostración'); }
      comprobarTablasVacias($datos);
      $datos->iniciarTransaccion();
      try{
        $cantidad = importarDatosDemostracion($datos, $archivoDatos, $diagrama);
        $datosImportados = true;
        $datos->confirmar();
      }catch(Throwable $fallo){ $datos->deshacer(); throw $fallo; }
      $mensajes[] = "$cantidad registros de demostración importados";
    }elseif($accion === 'nueva_base' && $instalado){
      $nombreBase = trim($_POST['nombre_base'] ?? '');
      if(strtolower($nombreBase) === ErinDatos::BASE){ throw new Exception('La base principal ya existe'); }
      $nueva = new ErinDatos($nombreBase);
      if($nueva->instalado()){ throw new Exception('Ya existe una base con ese nombre'); }
      $nueva->crearBase();
      try{
        crearModeloUnicorn($nueva, $diagrama);
        crearTablasAcceso($nueva);
        registrarVersionErin($nueva);
        if(isset($_POST['importar_datos']) && $archivoDatos !== null){ importarDatosDemostracion($nueva, $archivoDatos, $diagrama); }
      }catch(Throwable $fallo){ $nueva->eliminarBase(); throw $fallo; }
      $mensajes[] = "Base UnicornBBDD creada: $nombreBase";
    }elseif(!($accion === 'instalar' && !$instalado)){
      throw new Exception('La operación solicitada no es válida');
    }
  }catch(Throwable $fallo){ $error = $fallo->getMessage(); }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Instalación · ERIN ERP</title>
  <style>
    @font-face{font-family:Coolvetica;src:url("../nucleo/fuentes/Coolvetica-Rg.otf") format("opentype")}
    :root{--papel:#fffaf2;--arena:#eee4d5;--salmon:#f5aa91;--salmon-suave:#f8dfd2;--terracota:#bd573e;--tinta:#382d29;--borde:#ddd0bf;--metal-salmon:linear-gradient(120deg,#f6baa1,#ed977e,#dc7d65)}
    *{box-sizing:border-box}
    body{max-width:1000px;margin:40px auto;padding:20px;color:var(--tinta);background:var(--papel);font-family:Arial,sans-serif}
    h1,h2,h3{font-family:Coolvetica,Arial,sans-serif;font-weight:400}
    h1{color:var(--terracota)} h2{margin-top:30px}
    button,.boton{display:inline-block;margin-top:16px;padding:10px 16px;border:1px solid #a54c37;border-radius:9px 0 9px 0;background:var(--metal-salmon);color:#4b291f;font:15px Coolvetica,Arial,sans-serif;letter-spacing:.07em;text-transform:uppercase;text-decoration:none;cursor:pointer}
    button:disabled{border-color:var(--terracota);background:var(--papel);color:var(--terracota);cursor:default}
    input,select{font:15px Arial,sans-serif}
    .resultado{padding:16px 20px;margin:20px 0;background:white}.correcto{border-left:5px solid var(--terracota)}.aviso{border-left:5px solid darkorange}.error{border-left:5px solid crimson}
    .editor{padding:20px;border:1px solid var(--borde);background:white}
    .presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0 24px}
    .preset{padding:18px;border:1px solid var(--borde);background:white}.preset.actual{border:2px solid var(--terracota);background:#fff5ef;box-shadow:0 0 0 2px #bd573e22}
    .preset h3{margin:0 0 8px;color:var(--terracota)}.preset p{min-height:58px;font-size:14px;line-height:1.4}.preset small{display:block;color:#675952}.preset button{width:100%}
    .etiqueta-elegido{display:inline-block;margin-bottom:8px;padding:5px 8px;background:var(--terracota);color:white;font-size:12px;font-weight:bold}
    .paso{display:flex;align-items:center;gap:9px}.paso span{display:inline-grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;background:var(--terracota);color:white;font:bold 15px Arial,sans-serif}
    .opcional{font:13px Arial,sans-serif;color:#675952}.resumen-modelo{padding:12px 15px;border-left:4px solid var(--terracota);background:#fff5ef;line-height:1.5}
    .enlace-accion{display:inline-block;margin:5px 0 16px;padding:10px 14px;border:1px solid var(--borde);border-radius:9px 0 9px 0;background:var(--arena);color:var(--tinta);text-decoration:none}
    .formulario-instalacion{margin-top:18px;padding:26px;border:1px solid var(--borde);border-radius:16px 0 16px 0;background:linear-gradient(145deg,#fffaf2,#fff);box-shadow:0 8px 24px #382d2910}
    .cabecera-formulario{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding-bottom:18px;border-bottom:1px solid var(--borde)}
    .cabecera-formulario h3{margin:0;color:var(--terracota);font-size:24px}.cabecera-formulario p{margin:6px 0 0;color:#675952;font-size:14px;line-height:1.45}
    .modelo-formulario{flex:none;padding:9px 12px;border-radius:9px 0 9px 0;background:var(--salmon-suave);font-size:12px;font-weight:bold}
    .campos-administrador{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 20px;margin-top:22px}
    .campo-instalacion{display:flex;flex-direction:column;gap:8px;font-size:14px;font-weight:bold}.campo-instalacion input,.campo-instalacion select{width:100%;min-height:44px;padding:10px 12px;border:1px solid var(--borde);border-radius:9px 0 9px 0;background:white}
    .campo-instalacion input:focus,.campo-instalacion select:focus{outline:none;border-color:var(--terracota);box-shadow:0 0 0 3px var(--salmon-suave)}
    .campo-instalacion small{font-size:12px;font-weight:normal;color:#675952}
    .datos-ejemplo{display:flex;align-items:flex-start;gap:11px;margin-top:22px;padding:16px;border:1px solid var(--borde);border-left:4px solid var(--terracota);background:#fff5ef;line-height:1.45;cursor:pointer}
    .datos-ejemplo input{width:18px;height:18px;margin:2px 0 0;accent-color:var(--terracota)}.datos-ejemplo strong,.datos-ejemplo small{display:block}.datos-ejemplo small{margin-top:3px;color:#675952}
    .pie-instalacion{display:flex;justify-content:flex-end;margin-top:20px;padding-top:18px;border-top:1px solid var(--borde)}.pie-instalacion button{margin-top:0}.accion-final{min-width:min(270px,100%)}
    .base-adicional{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end}.base-adicional button{margin:0}.acciones{display:flex;gap:12px;flex-wrap:wrap}
    code{padding:2px 5px;background:var(--arena)}a{color:var(--terracota)}
    @media(max-width:700px){.presets{grid-template-columns:1fr}.preset p{min-height:0}.formulario-instalacion{padding:18px}.cabecera-formulario{flex-direction:column}.campos-administrador,.base-adicional{grid-template-columns:1fr}.pie-instalacion button{width:100%}}
  </style>
</head>
<body>
  <h1>Instalación de ERIN ERP</h1>
  <p>Persistencia proporcionada por <strong>UnicornBBDD</strong> desde el modelo declarativo <code>diagrama.json</code>.</p>

  <?php if($error !== null){ ?><div class="resultado error"><strong>No se ha podido completar la instalación:</strong><p><?= escapar($error) ?></p></div><?php } ?>
  <?php foreach($mensajes as $mensaje){ ?><div class="resultado correcto"><?= escapar($mensaje) ?></div><?php } ?>

  <?php if($instalacionCompletada){ ?>
    <div class="resultado correcto">
      <strong>Instalación completada correctamente</strong>
      <p>Base UnicornBBDD: <code><?= escapar(ErinDatos::BASE) ?></code></p>
      <p>Tablas de negocio creadas: <?= count($tablasModelo) ?></p>
    </div>
    <p><a class="boton" href="../index.html">Abrir ERIN ERP</a></p>

  <?php }elseif($instalado){ ?>
    <div class="resultado aviso">
      <strong>ERIN ERP ya está instalado</strong>
      <p>Utiliza <a href="disenador.php">Modelo de datos</a> para editar el diagrama y <a href="migrar.php">Actualizaciones</a> para aplicar los cambios.</p>
    </div>
    <?php if($archivoDatos !== null){ ?>
    <div class="editor">
      <h2>Importar datos de demostración</h2>
      <p>Esta opción solo funciona cuando todas las tablas de negocio están vacías.</p>
      <form method="post"><input type="hidden" name="accion" value="importar"><button type="submit">Importar datos de muestra</button></form>
    </div>
    <?php } ?>
    <div class="editor">
      <h2>Crear otra base de datos</h2>
      <p>Crea una base UnicornBBDD independiente a partir del modelo activo. ERIN continuará utilizando <code><?= escapar(ErinDatos::BASE) ?></code>.</p>
      <form method="post">
        <input type="hidden" name="accion" value="nueva_base">
        <div class="base-adicional">
          <label class="campo-instalacion" for="nombre_base">Nombre de la base<input id="nombre_base" name="nombre_base" required pattern="[a-zA-Z][a-zA-Z0-9_-]{0,49}"></label>
          <button type="submit">Crear base</button>
        </div>
        <?php if($archivoDatos !== null){ ?><label class="datos-ejemplo"><input type="checkbox" name="importar_datos" value="1"><span><strong>Importar datos de demostración</strong><small>Se cargarán en la base adicional.</small></span></label><?php } ?>
      </form>
    </div>
    <p><a href="../index.html">Volver a ERIN ERP</a></p>

  <?php }else{ ?>
    <h2 class="paso"><span>1</span> Elige un modelo</h2>
    <p>Selecciona un punto de partida. Permanecerás aquí para decidir si quieres editarlo o instalarlo.</p>
    <?php if($seleccionReciente){ ?><div class="resultado correcto"><strong>Modelo seleccionado: <?= escapar($nombreModelo) ?></strong><p>Ya puedes revisar el diagrama o crear la base de datos.</p></div><?php } ?>
    <div class="presets">
      <form class="preset <?= $modeloElegido === 'vacio' ? 'actual' : '' ?>" method="post">
        <?php if($modeloElegido === 'vacio'){ ?><span class="etiqueta-elegido">MODELO SELECCIONADO</span><?php } ?>
        <h3>Diseñar desde cero</h3><p>Empieza sin entidades y crea tu propio modelo.</p><small>0 entidades · 0 relaciones</small>
        <input type="hidden" name="accion" value="elegir_preset"><input type="hidden" name="preset" value="vacio">
        <button type="submit" <?= $modeloElegido === 'vacio' ? 'disabled' : '' ?>><?= $modeloElegido === 'vacio' ? 'Seleccionado' : 'Seleccionar modelo' ?></button>
      </form>
      <form class="preset <?= $modeloElegido === 'pequena' ? 'actual' : '' ?>" method="post">
        <?php if($modeloElegido === 'pequena'){ ?><span class="etiqueta-elegido">MODELO SELECCIONADO</span><?php } ?>
        <h3>Empresa pequeña</h3><p>Clientes, productos, pedidos, compras, facturas y empleados de una empresa ficticia.</p><small>12 entidades · 18 relaciones FK</small>
        <input type="hidden" name="accion" value="elegir_preset"><input type="hidden" name="preset" value="pequena">
        <button type="submit" <?= $modeloElegido === 'pequena' ? 'disabled' : '' ?>><?= $modeloElegido === 'pequena' ? 'Seleccionado' : 'Seleccionar modelo' ?></button>
      </form>
      <form class="preset <?= $modeloElegido === 'completo' ? 'actual' : '' ?>" method="post">
        <?php if($modeloElegido === 'completo'){ ?><span class="etiqueta-elegido">MODELO SELECCIONADO</span><?php } ?>
        <h3>ERP completo actual</h3><p>Todos los dominios y relaciones del modelo de ERIN.</p><small>80 entidades · 98 relaciones FK</small>
        <input type="hidden" name="accion" value="elegir_preset"><input type="hidden" name="preset" value="completo">
        <button type="submit" <?= $modeloElegido === 'completo' ? 'disabled' : '' ?>><?= $modeloElegido === 'completo' ? 'Seleccionado' : 'Seleccionar modelo' ?></button>
      </form>
    </div>
    <p class="opcional">Cambiar de modelo sustituye el borrador del diagrama. Los módulos se configuran después desde «Opciones».</p>

    <div class="editor">
      <h2 class="paso"><span>2</span> Revisa el modelo <small class="opcional">(opcional)</small></h2>
      <p class="resumen-modelo"><strong><?= escapar($nombreModelo) ?></strong> · <?= $cantidadEntidades ?> entidades. Puedes modificar campos y relaciones antes de instalar.</p>
      <a class="enlace-accion" href="disenador.php">Abrir diseñador visual</a>
      <a class="enlace-accion" href="diagrama.json" download>Descargar modelo JSON</a>

      <h2 class="paso"><span>3</span> Crea la base de datos</h2>
      <form method="post" class="formulario-instalacion">
        <input type="hidden" name="accion" value="instalar">
        <div class="cabecera-formulario">
          <div><h3>Cuenta administradora</h3><p>Será la primera cuenta con acceso a usuarios, módulos y configuración.</p></div>
          <span class="modelo-formulario"><?= escapar($nombreModelo) ?> · <?= $cantidadEntidades ?> entidades</span>
        </div>
        <div class="campos-administrador">
          <label class="campo-instalacion" for="nombre_administrador">Nombre<input id="nombre_administrador" name="nombre_administrador" autocomplete="name" required></label>
          <label class="campo-instalacion" for="usuario_administrador">Usuario<input id="usuario_administrador" name="usuario_administrador" autocomplete="username" required minlength="3" maxlength="50" pattern="[a-zA-Z0-9_.-]+"></label>
          <label class="campo-instalacion" for="email_administrador">Correo<input id="email_administrador" name="email_administrador" type="email" autocomplete="email" required></label>
          <label class="campo-instalacion" for="clave_administrador">Contraseña<input id="clave_administrador" name="clave_administrador" type="password" autocomplete="new-password" required minlength="8"><small>Mínimo 8 caracteres.</small></label>
        </div>
        <?php if($archivoDatos !== null){ ?>
          <label class="datos-ejemplo"><input type="checkbox" name="importar_datos" value="1"><span><strong>Añadir <?= $modeloElegido === 'pequena' ? '77' : '2.351' ?> registros ficticios</strong><small>Opcional. Puedes empezar con las tablas vacías.</small></span></label>
        <?php } ?>
        <div class="pie-instalacion"><button class="accion-final" type="submit">Crear base con <?= escapar($nombreModelo) ?></button></div>
      </form>
    </div>
  <?php } ?>
</body>
</html>
