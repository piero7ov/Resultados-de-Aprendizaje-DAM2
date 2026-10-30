<?php
function escapar($texto){
  return htmlspecialchars((string)$texto, ENT_QUOTES, "UTF-8");
}

function identificador($texto){
  return '"' . str_replace('"', '""', $texto) . '"';
}

require_once __DIR__ . "/modelo.php";

function importarDatos($db, $archivoDatos){
  if(!file_exists($archivoDatos)){
    throw new Exception("No existe datos-demostracion.sql");
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
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
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
$archivoDatos = __DIR__ . "/datos-demostracion.sql";
$carpetaDatos = dirname(__DIR__) . "/data";
$baseDatos = $carpetaDatos . "/erin.sqlite";
$solicitudPost = ($_SERVER["REQUEST_METHOD"] ?? "GET") == "POST";
$instalado = file_exists($baseDatos);
$instalacionCompletada = false;
$datosImportados = false;
$baseDatosCreada = false;
$baseNueva = null;
$baseNuevaCreada = false;
$error = null;
$tablas = [];
$mensajes = [];

if($solicitudPost){
  $accion = $_POST["accion"] ?? "";

  try{
    if(!extension_loaded("pdo_sqlite")){
      throw new Exception("PHP no tiene habilitada la extensión pdo_sqlite");
    }

    if($accion == "nueva_base" && $instalado){
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
    <div class="editor">
      <h2>Modelo de datos</h2>
      <p>Diseña las entidades y relaciones antes de instalar. El instalador ejecutará el SQL guardado por el diseñador.</p>
      <p><a href="disenador.php">Abrir el diseñador visual</a> · <a href="esquema.sql" download>Descargar SQL</a></p>
      <form method="post">
        <input type="hidden" name="accion" value="instalar">
        <p>
          <label>
            <input type="checkbox" name="importar_datos" value="1">
            Importar datos de demostración después de crear el esquema
          </label>
        </p>
        <button type="submit">Instalar ERIN desde SQL</button>
      </form>
    </div>
  <?php } ?>
</body>
</html>
