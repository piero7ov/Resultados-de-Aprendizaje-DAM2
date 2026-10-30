<?php
function escapar($texto){
  return htmlspecialchars((string)$texto, ENT_QUOTES, "UTF-8");
}

function identificador($texto){
  return '"' . str_replace('"', '""', $texto) . '"';
}

function interpretarEsquema($contenido){
  $lineas = preg_split('/\R/', $contenido);
  $tablas = [];
  $tablaActual = null;
  $tiposPermitidos = ["TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC"];

  foreach($lineas as $numero => $linea){
    $linea = trim($linea);

    if($linea == "" || str_starts_with($linea, "#")){
      continue;
    }

    if(!str_starts_with($linea, "-")){
      $tablaActual = $linea;

      if(isset($tablas[$tablaActual])){
        throw new Exception("Tabla duplicada '$tablaActual'");
      }

      $tablas[$tablaActual] = [];
      continue;
    }

    if($tablaActual === null){
      throw new Exception("Campo sin tabla en la línea " . ($numero + 1));
    }

    $campo = trim(substr($linea, 1));
    $fk = null;

    if(preg_match('/^(.*?)\s+FK\s+([^\s]+)$/i', $campo, $coincidencias)){
      $campo = trim($coincidencias[1]);
      $fk = trim($coincidencias[2]);
    }

    $partes = explode(":", $campo, 2);
    $nombre = trim($partes[0]);
    $tipo = isset($partes[1]) ? strtoupper(trim($partes[1])) : "TEXT";

    if($fk !== null && !isset($partes[1])){
      $tipo = "INTEGER";
    }

    if($nombre == ""){
      throw new Exception("Nombre de campo vacío en la línea " . ($numero + 1));
    }

    if(strtolower($nombre) == "identificador"){
      throw new Exception(
        "No debes declarar Identificador manualmente. Se crea automáticamente."
      );
    }

    if(!in_array($tipo, $tiposPermitidos)){
      throw new Exception("Tipo '$tipo' no permitido en la línea " . ($numero + 1));
    }

    if(isset($tablas[$tablaActual][$nombre])){
      throw new Exception("Campo duplicado '$nombre' en '$tablaActual'");
    }

    $tablas[$tablaActual][$nombre] = [
      "tipo" => $tipo,
      "fk" => $fk
    ];
  }

  if(count($tablas) == 0){
    throw new Exception("El esquema no contiene ninguna tabla");
  }

  foreach($tablas as $tabla => $campos){
    if(count($campos) == 0){
      throw new Exception("La tabla '$tabla' no tiene campos");
    }

    foreach($campos as $campo => $datos){
      if($datos["fk"] !== null && !isset($tablas[$datos["fk"]])){
        throw new Exception(
          "La FK '$tabla.$campo' referencia la tabla inexistente '" .
          $datos["fk"] . "'"
        );
      }
    }
  }

  return $tablas;
}

function leerEsquema($archivo){
  if(!file_exists($archivo)){
    throw new Exception("No existe esquema.md");
  }

  $contenido = file_get_contents($archivo);

  if($contenido === false){
    throw new Exception("No se ha podido leer esquema.md");
  }

  return interpretarEsquema($contenido);
}

function definicionTabla($campos){
  $definiciones = [
    identificador("Identificador") . " INTEGER PRIMARY KEY AUTOINCREMENT"
  ];

  foreach($campos as $campo => $datos){
    $definicion = identificador($campo) . " " . $datos["tipo"];

    if($datos["fk"] !== null){
      $definicion .=
        " REFERENCES " . identificador($datos["fk"]) .
        "(" . identificador("Identificador") . ")";
    }

    $definiciones[] = $definicion;
  }

  return implode(", ", $definiciones);
}

$archivoEsquema = __DIR__ . "/esquema.md";
$carpetaDatos = dirname(__DIR__) . "/data";
$baseDatos = $carpetaDatos . "/erin.sqlite";
$solicitudPost = ($_SERVER["REQUEST_METHOD"] ?? "GET") == "POST";
$instalado = file_exists($baseDatos);
$instalacionCompletada = false;
$baseDatosCreada = false;
$esquemaGuardado = false;
$error = null;
$tablas = [];
$mensajes = [];
$contenidoAnterior = null;
$contenidoEditor = "";

if(file_exists($archivoEsquema)){
  $contenidoLeido = file_get_contents($archivoEsquema);

  if($contenidoLeido !== false){
    $contenidoEditor = $contenidoLeido;
  }
}

if($solicitudPost){
  $contenidoEditor = $_POST["contenido_esquema"] ?? "";

  try{
    if($instalado){
      throw new Exception(
        "ERIN ya está instalado. Utiliza migrar.php para actualizar su esquema."
      );
    }

    if(!extension_loaded("pdo_sqlite")){
      throw new Exception("PHP no tiene habilitada la extensión pdo_sqlite");
    }

    $tablas = interpretarEsquema($contenidoEditor);
    if(file_exists($archivoEsquema)){
      $contenidoAnterior = file_get_contents($archivoEsquema);

      if($contenidoAnterior === false){
        throw new Exception("No se ha podido leer el esquema anterior");
      }
    }else{
      $contenidoAnterior = null;
    }

    $contenidoNormalizado = rtrim($contenidoEditor) . PHP_EOL;

    if(file_put_contents($archivoEsquema, $contenidoNormalizado) === false){
      throw new Exception("No se ha podido guardar esquema.md");
    }

    $esquemaGuardado = true;
    $contenidoEditor = $contenidoNormalizado;

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

    foreach($tablas as $tabla => $campos){
      $sql =
        "CREATE TABLE " . identificador($tabla) .
        " (" . definicionTabla($campos) . ")";

      $db->exec($sql);
      $mensajes[] = "Tabla '$tabla' creada";
    }

    $db->commit();
    $instalacionCompletada = true;
    $instalado = true;

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

    if($esquemaGuardado){
      if($contenidoAnterior === null){
        if(file_exists($archivoEsquema)){
          unlink($archivoEsquema);
        }
      }else{
        file_put_contents($archivoEsquema, $contenidoAnterior);
      }
    }

    $error = $errorCapturado->getMessage();
  }
}elseif(!$instalado && !file_exists($archivoEsquema)){
  $error = "No existe esquema.md";
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
    <div class="resultado aviso">
      <strong>ERIN ERP ya está instalado</strong>
      <p>La base existente no se ha modificado.</p>
      <p>Utiliza <a href="migrar.php">migrar.php</a> para actualizar el esquema.</p>
    </div>
    <p><a href="../index.html">Volver a ERIN ERP</a></p>

  <?php }else{ ?>
    <div class="editor">
      <h2>Revisar el esquema</h2>
      <p>
        Comprueba las entidades, los campos y las relaciones antes de crear la base.
        La instalación solo comenzará cuando confirmes este formulario.
      </p>

      <form method="post">
        <label for="contenido_esquema">Contenido de esquema.md</label>
        <textarea id="contenido_esquema" name="contenido_esquema" spellcheck="false"><?= escapar($contenidoEditor) ?></textarea>
        <button type="submit">Instalar ERIN</button>
      </form>
    </div>
  <?php } ?>
</body>
</html>
