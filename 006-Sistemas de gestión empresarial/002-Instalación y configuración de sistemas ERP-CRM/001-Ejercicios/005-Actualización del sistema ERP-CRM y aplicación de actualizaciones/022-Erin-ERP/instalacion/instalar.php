<?php
require_once __DIR__ . "/presets.php";
require_once dirname(__DIR__) . "/nucleo/autenticacion.php";
function escapar($texto){
  return htmlspecialchars((string)$texto, ENT_QUOTES, "UTF-8");
}

function identificador($texto){
  return '"' . str_replace('"', '""', $texto) . '"';
}

require_once __DIR__ . "/modelo.php";

function importarDatos($db, $archivoDatos){
  if($archivoDatos === null || !file_exists($archivoDatos)){
    throw new Exception("Este modelo no tiene datos de demostración compatibles");
  }

  $sql = file_get_contents($archivoDatos);
  if($sql === false || trim($sql) == ""){
    throw new Exception("No se han podido leer los datos de demostración");
  }

  $db->exec($sql);

  if($db->query("PRAGMA foreign_key_check")->fetch()){
    throw new Exception("Los datos de demostración contienen relaciones no válidas");
  }
}

function comprobarBaseVacia($db){
  $tablas = $db->query("
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'erin_%'
  ")->fetchAll(PDO::FETCH_COLUMN);

  if(count($tablas) == 0){
    throw new Exception("La base no contiene tablas. Instala primero el esquema.");
  }

  foreach($tablas as $tabla){
    $cantidad = $db->query(
      "SELECT COUNT(*) FROM " . identificador($tabla)
    )->fetchColumn();

    if($cantidad > 0){
      throw new Exception(
        "La importación solo se permite si todas las tablas están vacías."
      );
    }
  }
}

$archivoSqlEsquema = __DIR__ . "/esquema.sql";
$archivoDatos = archivoDatosPreset();
$carpetaDatos = dirname(__DIR__) . "/data";
$baseDatos = $carpetaDatos . "/erin.sqlite";
$solicitudPost = ($_SERVER["REQUEST_METHOD"] ?? "GET") == "POST";
$instalado = file_exists($baseDatos);
if($instalado){
  $dbAcceso = new PDO('sqlite:' . $baseDatos);
  try{ exigirAdministrador($dbAcceso); }catch(Throwable $error){ header('Location: ../acceso.html'); exit; }
}
$instalacionCompletada = false;
$datosImportados = false;
$baseDatosCreada = false;
$baseNueva = null;
$baseNuevaCreada = false;
$error = null;
$tablas = [];
$mensajes = [];
$modeloElegido = presetActivo();
$nombresModelos = ["vacio" => "Diseñar desde cero", "pequena" => "Empresa pequeña", "completo" => "ERP completo actual"];
$nombreModelo = $nombresModelos[$modeloElegido];
$diagramaActual = json_decode((string)file_get_contents(__DIR__ . "/diagrama.json"), true);
$cantidadEntidades = count($diagramaActual["tablas"] ?? []);
$seleccionReciente = ($_GET["seleccionado"] ?? "") === $modeloElegido;
$tieneModelo = file_exists($archivoSqlEsquema) && trim((string)file_get_contents($archivoSqlEsquema)) !== "";

if($solicitudPost){
  $accion = $_POST["accion"] ?? "";

  try{
    if(!extension_loaded("pdo_sqlite")){
      throw new Exception("PHP no tiene habilitada la extensión pdo_sqlite");
    }

    if($accion == "elegir_preset" && !$instalado){
      $preset = $_POST["preset"] ?? "";
      aplicarPreset($preset);
      header("Location: instalar.php?seleccionado=" . urlencode($preset));
      exit;
    }elseif($accion == "nueva_base" && $instalado){
      $nombreBase = trim($_POST["nombre_base"] ?? "");
      if(!preg_match('/^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/', $nombreBase) || strtolower($nombreBase) == "erin"){
        throw new Exception("El nombre debe empezar por una letra y usar letras, números, guiones o guion bajo. No puede ser erin.");
      }
      $baseNueva = $carpetaDatos . "/" . $nombreBase . ".sqlite";
      if(file_exists($baseNueva)){
        throw new Exception("Ya existe una base de datos con ese nombre");
      }
      $tablas = leerModeloSql($archivoSqlEsquema);
      $sqlEsquema = file_get_contents($archivoSqlEsquema);
      $nueva = new PDO("sqlite:" . $baseNueva);
      $baseNuevaCreada = true;
      $nueva->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      $nueva->exec("PRAGMA foreign_keys = ON");
      $nueva->beginTransaction();
      $nueva->exec($sqlEsquema);
      crearTablasAcceso($nueva);
      registrarVersionErin($nueva);
      if(isset($_POST["importar_datos"])){ importarDatos($nueva, $archivoDatos); }
      $nueva->commit();
      $mensajes[] = "Nueva base creada: " . $baseNueva;
    }elseif($accion == "importar" && $instalado){
      $db = new PDO("sqlite:" . $baseDatos);
      $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      $db->exec("PRAGMA foreign_keys = ON");
      comprobarBaseVacia($db);
      $db->beginTransaction();
      importarDatos($db, $archivoDatos);
      $db->commit();
      $datosImportados = true;
      $mensajes[] = "Datos de demostración importados";
    }elseif($accion == "instalar" && !$instalado){
      $nombreAdministrador = trim($_POST["nombre_administrador"] ?? "");
      $usuarioAdministrador = trim($_POST["usuario_administrador"] ?? "");
      $emailAdministrador = trim($_POST["email_administrador"] ?? "");
      $claveAdministrador = $_POST["clave_administrador"] ?? "";
      if($nombreAdministrador === "" || !preg_match('/^[a-zA-Z0-9_.-]{3,50}$/', $usuarioAdministrador) || !filter_var($emailAdministrador, FILTER_VALIDATE_EMAIL) || strlen($claveAdministrador) < 8){
        throw new Exception("Indica nombre, usuario válido, correo y una contraseña de al menos 8 caracteres para el administrador");
      }
      $tablas = leerModeloSql($archivoSqlEsquema);
      $sqlEsquema = file_get_contents($archivoSqlEsquema);
      if($sqlEsquema === false){
        throw new Exception("No se ha podido leer esquema.sql");
      }

      if(!is_dir($carpetaDatos)){
        if(!mkdir($carpetaDatos, 0775, true)){
          throw new Exception("No se ha podido crear la carpeta data");
        }

        $mensajes[] = "Se ha creado la carpeta data";
      }

      $db = new PDO("sqlite:" . $baseDatos);
      $baseDatosCreada = true;
      $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
      $db->exec("PRAGMA foreign_keys = ON");
      $db->beginTransaction();
      $db->exec($sqlEsquema);
      crearTablasAcceso($db);
      registrarVersionErin($db);
      $consultaAdministrador = $db->prepare('INSERT INTO erin_usuarios (nombre, usuario, email, clave, administrador) VALUES (?, ?, ?, ?, 1)');
      $consultaAdministrador->execute([$nombreAdministrador, $usuarioAdministrador, $emailAdministrador, password_hash($claveAdministrador, PASSWORD_DEFAULT)]);

      if(isset($_POST["importar_datos"])){
        importarDatos($db, $archivoDatos);
        $datosImportados = true;
      }

      $db->commit();
      $instalacionCompletada = true;
      $instalado = true;
      $mensajes[] = count($tablas) . " tablas creadas";

      if($datosImportados){
        $mensajes[] = "Datos de demostración importados";
      }
    }else{
      throw new Exception("La operación solicitada no es válida");
    }

  }catch(Throwable $errorCapturado){
    if(isset($db) && $db->inTransaction()){
      $db->rollBack();
    }

    if(isset($db)){
      $db = null;
    }

    if($baseDatosCreada && file_exists($baseDatos)){
      unlink($baseDatos);
    }

    if(isset($nueva) && $nueva->inTransaction()){
      $nueva->rollBack();
    }
    if($baseNuevaCreada && file_exists($baseNueva)){
      $nueva = null;
      unlink($baseNueva);
    }

    $error = $errorCapturado->getMessage();
  }
}elseif(!$instalado && !file_exists($archivoSqlEsquema)){
  $error = "No existe esquema.sql";
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Instalación · ERIN ERP</title>
  <style>
    @font-face{
      font-family:Coolvetica;
      src:url("../nucleo/fuentes/Coolvetica-Rg.otf") format("opentype");
    }
    :root{
      --papel:#fffaf2;
      --arena:#eee4d5;
      --salmon:#f5aa91;
      --salmon-suave:#f8dfd2;
      --terracota:#bd573e;
      --tinta:#382d29;
      --borde:#ddd0bf;
      --metal-salmon:linear-gradient(120deg,#f6baa1,#ed977e,#dc7d65);
    }
    *{box-sizing:border-box}
    body{
      max-width:1000px;
      margin:40px auto;
      padding:20px;
      color:var(--tinta);
      background:var(--papel);
      font-family:Arial,sans-serif;
    }
    h1,h2{font-family:Coolvetica,Arial,sans-serif;font-weight:400}
    h1{color:var(--terracota)}
    h2{margin-top:30px}
    table{width:100%;border-collapse:collapse;margin:12px 0 24px}
    th,td{padding:10px;border-bottom:1px solid var(--borde);text-align:left}
    th{background:var(--arena)}
    textarea{
      width:100%;
      min-height:430px;
      padding:16px;
      border:1px solid var(--borde);
      border-radius:12px 0 12px 0;
      background:white;
      color:var(--tinta);
      font:14px/1.5 Consolas,monospace;
      resize:vertical;
    }
    textarea:focus{
      outline:none;
      border-color:var(--terracota);
      box-shadow:0 0 0 3px var(--salmon-suave);
    }
    button{
      margin-top:16px;
      padding:10px 16px;
      border:1px solid #a54c37;
      border-radius:9px 0 9px 0;
      background:var(--metal-salmon);
      color:#4b291f;
      font:15px Coolvetica,Arial,sans-serif;
      letter-spacing:.07em;
      text-transform:uppercase;
      cursor:pointer;
    }
    .editor{padding:20px;border:1px solid var(--borde);background:white}
    .presets{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0 24px}
    .preset{padding:18px;border:1px solid var(--borde);background:white}
    .preset.actual{border:2px solid var(--terracota);background:#fff5ef;box-shadow:0 0 0 2px #bd573e22}
    .preset h3{margin:0 0 8px;color:var(--terracota)}
    .preset p{min-height:58px;font-size:14px;line-height:1.4}
    .preset small{display:block;color:#675952}
    .preset button{width:100%}
    .preset button:disabled{border-color:var(--terracota);background:var(--papel);color:var(--terracota);cursor:default}
    .etiqueta-elegido{display:inline-block;margin-bottom:8px;padding:5px 8px;background:var(--terracota);color:white;font-size:12px;font-weight:bold}
    .paso{display:flex;align-items:center;gap:9px}
    .paso span{display:inline-grid;place-items:center;flex:none;width:28px;height:28px;border-radius:50%;background:var(--terracota);color:white;font:bold 15px Arial,sans-serif}
    .opcional{font:13px Arial,sans-serif;color:#675952}
    .resumen-modelo{padding:12px 15px;border-left:4px solid var(--terracota);background:#fff5ef;line-height:1.5}
    .enlace-accion{display:inline-block;margin:5px 0 16px;padding:10px 14px;border:1px solid var(--borde);border-radius:9px 0 9px 0;background:var(--arena);color:var(--tinta);text-decoration:none}
    .accion-final{min-width:min(270px,100%)}
    @media(max-width:700px){.presets{grid-template-columns:1fr}.preset p{min-height:0}}
    .resultado{padding:16px 20px;margin:20px 0;background:white}
    .correcto{border-left:5px solid var(--terracota)}
    .aviso{border-left:5px solid darkorange}
    .error{border-left:5px solid crimson}
    code{padding:2px 5px;background:var(--arena)}
    a{color:var(--terracota)}
  </style>
</head>
<body>
  <h1>Instalación de ERIN ERP</h1>

  <?php if($error !== null){ ?>
    <div class="resultado error">
      <strong>No se ha podido completar la instalación:</strong>
      <p><?= escapar($error) ?></p>
    </div>
  <?php } ?>

  <?php if($instalacionCompletada){ ?>
    <div class="resultado correcto">
      <strong>Instalación completada correctamente</strong>
      <p>Base de datos: <code><?= escapar($baseDatos) ?></code></p>
      <p>Tablas creadas: <?= count($tablas) ?></p>
    </div>

    <?php foreach($tablas as $tabla => $campos){ ?>
      <h2><?= escapar($tabla) ?></h2>
      <table>
        <tr>
          <th>Campo</th>
          <th>Tipo</th>
          <th>Clave</th>
          <th>Referencia</th>
        </tr>
        <tr>
          <td>Identificador</td>
          <td>INTEGER</td>
          <td>PRIMARY KEY · AUTOINCREMENT</td>
          <td>-</td>
        </tr>

        <?php foreach($campos as $campo => $datos){ ?>
          <tr>
            <td><?= escapar($campo) ?></td>
            <td><?= escapar($datos["tipo"]) ?></td>
            <td><?= $datos["fk"] !== null ? "FOREIGN KEY" : "-" ?></td>
            <td>
              <?= $datos["fk"] !== null
                ? escapar($datos["fk"] . ".Identificador")
                : "-" ?>
            </td>
          </tr>
        <?php } ?>
      </table>
    <?php } ?>

    <div class="resultado correcto">
      <?php foreach($mensajes as $mensaje){ ?>
        <p><?= escapar($mensaje) ?></p>
      <?php } ?>
    </div>

    <p><a href="../index.html">Abrir ERIN ERP</a></p>

  <?php }elseif($instalado){ ?>
    <?php foreach($mensajes as $mensaje){ ?>
      <div class="resultado correcto"><?= escapar($mensaje) ?></div>
    <?php } ?>
    <?php if($datosImportados){ ?>
      <div class="resultado correcto">
        <strong>Datos de demostración importados correctamente</strong>
      </div>
    <?php } ?>
    <div class="resultado aviso">
      <strong>ERIN ERP ya está instalado</strong>
      <p>Utiliza <a href="disenador.php">Modelo de datos</a> para editar el diagrama y revisar la migración.</p>
    </div>
    <div class="editor">
      <h2>Importar datos de demostración</h2>
      <p>Esta opción solo funciona cuando todas las tablas están vacías.</p>
      <form method="post">
        <input type="hidden" name="accion" value="importar">
        <button type="submit">Importar datos de muestra</button>
      </form>
    </div>
    <div class="editor">
      <h2>Crear otra base de datos</h2>
      <p>Se crea un archivo SQLite independiente a partir de esquema.sql. ERIN seguirá usando erin.sqlite.</p>
      <form method="post">
        <input type="hidden" name="accion" value="nueva_base">
        <label for="nombre_base">Nombre del archivo</label>
        <input id="nombre_base" name="nombre_base" type="text" required pattern="[a-zA-Z][a-zA-Z0-9_-]{0,49}">
        <label><input type="checkbox" name="importar_datos" value="1"> Importar datos de demostración</label>
        <button type="submit">Crear base</button>
      </form>
    </div>
    <p><a href="../index.html">Volver a ERIN ERP</a></p>

  <?php }else{ ?>
    <h2 class="paso"><span>1</span> Elige un modelo</h2>
    <p>Selecciona un punto de partida. Permanecerás aquí para decidir si quieres editarlo o instalarlo.</p>
    <?php if($seleccionReciente){ ?><div class="resultado correcto"><strong>Modelo seleccionado: <?= escapar($nombreModelo) ?></strong><p>Ya puedes revisar el diagrama o crear la base de datos.</p></div><?php } ?>
    <div class="presets">
      <form class="preset <?= $modeloElegido === "vacio" ? "actual" : "" ?>" method="post">
        <?php if($modeloElegido === "vacio"){ ?><span class="etiqueta-elegido">MODELO SELECCIONADO</span><?php } ?>
        <h3>Diseñar desde cero</h3>
        <p>Empieza sin entidades y crea tu propio modelo.</p>
        <small>0 entidades · 0 relaciones</small>
        <input type="hidden" name="accion" value="elegir_preset">
        <input type="hidden" name="preset" value="vacio">
        <button type="submit" <?= $modeloElegido === "vacio" ? "disabled" : "" ?>><?= $modeloElegido === "vacio" ? "Seleccionado" : "Seleccionar modelo" ?></button>
      </form>
      <form class="preset <?= $modeloElegido === "pequena" ? "actual" : "" ?>" method="post">
        <?php if($modeloElegido === "pequena"){ ?><span class="etiqueta-elegido">MODELO SELECCIONADO</span><?php } ?>
        <h3>Empresa pequeña</h3>
        <p>Clientes, productos, pedidos, compras, facturas y empleados de una empresa ficticia.</p>
        <small>12 entidades · 18 relaciones FK</small>
        <input type="hidden" name="accion" value="elegir_preset">
        <input type="hidden" name="preset" value="pequena">
        <button type="submit" <?= $modeloElegido === "pequena" ? "disabled" : "" ?>><?= $modeloElegido === "pequena" ? "Seleccionado" : "Seleccionar modelo" ?></button>
      </form>
      <form class="preset <?= $modeloElegido === "completo" ? "actual" : "" ?>" method="post">
        <?php if($modeloElegido === "completo"){ ?><span class="etiqueta-elegido">MODELO SELECCIONADO</span><?php } ?>
        <h3>ERP completo actual</h3>
        <p>Todos los dominios y relaciones del modelo de Erin.</p>
        <small>80 entidades · 98 relaciones FK</small>
        <input type="hidden" name="accion" value="elegir_preset">
        <input type="hidden" name="preset" value="completo">
        <button type="submit" <?= $modeloElegido === "completo" ? "disabled" : "" ?>><?= $modeloElegido === "completo" ? "Seleccionado" : "Seleccionar modelo" ?></button>
      </form>
    </div>
    <p class="opcional">Si cambias de modelo, se sustituirá el borrador del diagrama. La base de datos todavía no se ha creado.</p>
    <div class="editor">
      <h2 class="paso"><span>2</span> Revisa el modelo <small class="opcional">(opcional)</small></h2>
      <p class="resumen-modelo"><strong><?= escapar($nombreModelo) ?></strong> · <?= $cantidadEntidades ?> entidades. Puedes modificar campos y relaciones antes de instalar.</p>
      <a class="enlace-accion" href="disenador.php">Abrir diseñador visual</a>
      <?php if($tieneModelo){ ?> <a href="esquema.sql" download>Descargar SQL</a><?php } ?>
      <h2 class="paso"><span>3</span> Crea la base de datos</h2>
      <form method="post">
        <input type="hidden" name="accion" value="instalar">
        <h3>Cuenta administradora</h3>
        <p><label>Nombre <input name="nombre_administrador" required></label></p>
        <p><label>Usuario <input name="usuario_administrador" required minlength="3" maxlength="50" pattern="[a-zA-Z0-9_.-]+"></label></p>
        <p><label>Correo <input name="email_administrador" type="email" required></label></p>
        <p><label>Contraseña <input name="clave_administrador" type="password" required minlength="8"></label></p>
        <?php if($archivoDatos !== null){ ?><p>
          <label>
            <input type="checkbox" name="importar_datos" value="1">
            Añadir <?= $modeloElegido === "pequena" ? "77" : "2.351" ?> registros ficticios de ejemplo
          </label>
        </p><?php } ?>
        <?php if($tieneModelo){ ?><button class="accion-final" type="submit">Crear base con <?= escapar($nombreModelo) ?></button><?php }else{ ?><p>Añade al menos una entidad en el diseñador y guárdala para poder instalar.</p><?php } ?>
      </form>
    </div>
  <?php } ?>
</body>
</html>
