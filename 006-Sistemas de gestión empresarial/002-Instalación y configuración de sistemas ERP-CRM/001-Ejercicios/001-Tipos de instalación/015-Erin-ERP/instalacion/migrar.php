<?php
function escapar($texto){
  return htmlspecialchars((string)$texto, ENT_QUOTES, "UTF-8");
}

function identificador($texto){
  return '"' . str_replace('"', '""', $texto) . '"';
}

function leerEsquema($archivo){
  if(!file_exists($archivo)){
    throw new Exception("No existe esquema.md");
  }

  $lineas = file($archivo, FILE_IGNORE_NEW_LINES);
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

function definicionCampo($campo, $datos){
  $definicion = identificador($campo) . " " . $datos["tipo"];

  if($datos["fk"] !== null){
    $definicion .=
      " REFERENCES " . identificador($datos["fk"]) .
      "(" . identificador("Identificador") . ")";
  }

  return $definicion;
}

function definicionTabla($campos){
  $definiciones = [
    identificador("Identificador") . " INTEGER PRIMARY KEY AUTOINCREMENT"
  ];

  foreach($campos as $campo => $datos){
    $definiciones[] = definicionCampo($campo, $datos);
  }

  return implode(", ", $definiciones);
}

function leerSQLite($db){
  $tablas = [];

  $nombres = $db->query("
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  ")->fetchAll(PDO::FETCH_COLUMN);

  foreach($nombres as $tabla){
    $tablas[$tabla] = [
      "campos" => [],
      "sql" => null
    ];

    $consultaSql = $db->prepare("
      SELECT sql
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
    ");
    $consultaSql->execute([$tabla]);
    $tablas[$tabla]["sql"] = $consultaSql->fetchColumn();

    $columnas = $db->query(
      "PRAGMA table_info(" . identificador($tabla) . ")"
    )->fetchAll(PDO::FETCH_ASSOC);

    $foraneas = $db->query(
      "PRAGMA foreign_key_list(" . identificador($tabla) . ")"
    )->fetchAll(PDO::FETCH_ASSOC);

    $mapaFK = [];

    foreach($foraneas as $fk){
      $mapaFK[$fk["from"]] = $fk["table"];
    }

    foreach($columnas as $columna){
      $tablas[$tabla]["campos"][$columna["name"]] = [
        "tipo" => strtoupper($columna["type"] ?: "TEXT"),
        "pk" => (int)$columna["pk"],
        "fk" => $mapaFK[$columna["name"]] ?? null
      ];
    }
  }

  return $tablas;
}

function comparar($esquema, $actual){
  $cambios = [];

  foreach($esquema as $tabla => $campos){
    if(!isset($actual[$tabla])){
      $cambios[] = [
        "tipo" => "crear_tabla",
        "tabla" => $tabla,
        "destructivo" => false
      ];
      continue;
    }

    $camposActuales = $actual[$tabla]["campos"];
    $motivosReconstruccion = [];

    if(
      !isset($camposActuales["Identificador"]) ||
      strtoupper($camposActuales["Identificador"]["tipo"]) != "INTEGER" ||
      $camposActuales["Identificador"]["pk"] != 1 ||
      stripos((string)$actual[$tabla]["sql"], "AUTOINCREMENT") === false
    ){
      $motivosReconstruccion[] =
        "corregir Identificador como INTEGER PRIMARY KEY AUTOINCREMENT";
    }

    foreach($campos as $campo => $datos){
      if(!isset($camposActuales[$campo])){
        continue;
      }

      $existente = $camposActuales[$campo];

      if(strtoupper($existente["tipo"]) != strtoupper($datos["tipo"])){
        $motivosReconstruccion[] =
          "cambiar el tipo de '$campo' de " . $existente["tipo"] .
          " a " . $datos["tipo"];
      }

      if($existente["fk"] != $datos["fk"]){
        $desde = $existente["fk"] ?? "sin referencia";
        $hasta = $datos["fk"] ?? "sin referencia";
        $motivosReconstruccion[] =
          "cambiar la relación de '$campo' de '$desde' a '$hasta'";
      }
    }

    foreach($camposActuales as $campo => $datos){
      if($campo != "Identificador" && !isset($campos[$campo])){
        $motivosReconstruccion[] = "eliminar el campo '$campo'";
      }
    }

    if(count($motivosReconstruccion) > 0){
      $cambios[] = [
        "tipo" => "reconstruir_tabla",
        "tabla" => $tabla,
        "motivos" => $motivosReconstruccion,
        "destructivo" => true
      ];
      continue;
    }

    foreach($campos as $campo => $datos){
      if(!isset($camposActuales[$campo])){
        $cambios[] = [
          "tipo" => "anadir_campo",
          "tabla" => $tabla,
          "campo" => $campo,
          "datos" => $datos,
          "destructivo" => false
        ];
      }
    }
  }

  foreach($actual as $tabla => $datos){
    if(!isset($esquema[$tabla])){
      $cambios[] = [
        "tipo" => "eliminar_tabla",
        "tabla" => $tabla,
        "destructivo" => true
      ];
    }
  }

  return $cambios;
}

function describirCambio($cambio){
  switch($cambio["tipo"]){
    case "crear_tabla":
      return "Crear la tabla '" . $cambio["tabla"] . "'";

    case "anadir_campo":
      $texto =
        "Añadir el campo '" . $cambio["campo"] . "' (" .
        $cambio["datos"]["tipo"] . ") a '" . $cambio["tabla"] . "'";

      if($cambio["datos"]["fk"] !== null){
        $texto .= " con referencia a '" . $cambio["datos"]["fk"] . "'";
      }

      return $texto;

    case "reconstruir_tabla":
      return
        "Reconstruir la tabla '" . $cambio["tabla"] . "': " .
        implode("; ", $cambio["motivos"]);

    case "eliminar_tabla":
      return "Eliminar la tabla '" . $cambio["tabla"] . "'";
  }

  return "Cambio desconocido";
}

function crearTabla($db, $tabla, $campos){
  $sql =
    "CREATE TABLE " . identificador($tabla) .
    " (" . definicionTabla($campos) . ")";
  $db->exec($sql);
}

function reconstruirTabla($db, $tabla, $camposDeseados, $tablaActual){
  $tablaTemporal = "__migracion_" . $tabla;
  $db->exec("DROP TABLE IF EXISTS " . identificador($tablaTemporal));
  crearTabla($db, $tablaTemporal, $camposDeseados);

  $origen = $tablaActual["campos"];
  $columnasDestino = [];
  $expresionesOrigen = [];

  if(isset($origen["Identificador"])){
    $columnasDestino[] = identificador("Identificador");
    $expresionesOrigen[] = identificador("Identificador");
  }

  foreach($camposDeseados as $campo => $datos){
    if(!isset($origen[$campo])){
      continue;
    }

    $columnasDestino[] = identificador($campo);
    $expresion = identificador($campo);

    if(strtoupper($origen[$campo]["tipo"]) != strtoupper($datos["tipo"])){
      $expresion = "CAST(" . $expresion . " AS " . $datos["tipo"] . ")";
    }

    $expresionesOrigen[] = $expresion;
  }

  if(count($columnasDestino) > 0){
    $sql =
      "INSERT INTO " . identificador($tablaTemporal) .
      " (" . implode(", ", $columnasDestino) . ")" .
      " SELECT " . implode(", ", $expresionesOrigen) .
      " FROM " . identificador($tabla);
    $db->exec($sql);
  }

  $db->exec("DROP TABLE " . identificador($tabla));
  $db->exec(
    "ALTER TABLE " . identificador($tablaTemporal) .
    " RENAME TO " . identificador($tabla)
  );
}

function rutaCopiaSeguridad($baseDatos){
  $ruta = $baseDatos . ".backup-" . date("Ymd-His");
  $numero = 1;

  while(file_exists($ruta)){
    $ruta = $baseDatos . ".backup-" . date("Ymd-His") . "-" . $numero;
    $numero++;
  }

  return $ruta;
}

$archivoEsquema = __DIR__ . "/esquema.md";
$baseDatos = dirname(__DIR__) . "/data/erin.sqlite";
$error = null;
$mensaje = null;
$copiaSeguridad = null;
$esquema = [];
$actual = [];
$cambios = [];
$solicitudPost = ($_SERVER["REQUEST_METHOD"] ?? "GET") == "POST";

try{
  if(!extension_loaded("pdo_sqlite")){
    throw new Exception("PHP no tiene habilitada la extensión pdo_sqlite");
  }

  if(!file_exists($baseDatos)){
    throw new Exception(
      "La base de datos no existe. Ejecuta primero instalar.php."
    );
  }

  $esquema = leerEsquema($archivoEsquema);
  $db = new PDO("sqlite:" . $baseDatos);
  $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $db->exec("PRAGMA foreign_keys = ON");

  $actual = leerSQLite($db);
  $cambios = comparar($esquema, $actual);
  $hayDestructivos = count(array_filter(
    $cambios,
    function($cambio){ return $cambio["destructivo"]; }
  )) > 0;

  if($solicitudPost && count($cambios) > 0){
    if(
      $hayDestructivos &&
      ($_POST["confirmar_destructivos"] ?? "") != "si"
    ){
      throw new Exception(
        "Debes confirmar expresamente los cambios destructivos."
      );
    }

    $copiaSeguridad = rutaCopiaSeguridad($baseDatos);

    if(!copy($baseDatos, $copiaSeguridad)){
      throw new Exception("No se ha podido crear la copia de seguridad");
    }

    $db->exec("PRAGMA foreign_keys = OFF");
    $db->beginTransaction();

    try{
      foreach($cambios as $cambio){
        switch($cambio["tipo"]){
          case "crear_tabla":
            crearTabla($db, $cambio["tabla"], $esquema[$cambio["tabla"]]);
            break;

          case "anadir_campo":
            $db->exec(
              "ALTER TABLE " . identificador($cambio["tabla"]) .
              " ADD COLUMN " .
              definicionCampo($cambio["campo"], $cambio["datos"])
            );
            break;

          case "reconstruir_tabla":
            reconstruirTabla(
              $db,
              $cambio["tabla"],
              $esquema[$cambio["tabla"]],
              $actual[$cambio["tabla"]]
            );
            break;

          case "eliminar_tabla":
            $db->exec("DROP TABLE " . identificador($cambio["tabla"]));
            break;
        }
      }

      $incidencias = $db->query(
        "PRAGMA foreign_key_check"
      )->fetchAll(PDO::FETCH_ASSOC);

      if(count($incidencias) > 0){
        throw new Exception(
          "La migración produciría errores de integridad referencial"
        );
      }

      $resultado = comparar($esquema, leerSQLite($db));

      if(count($resultado) > 0){
        throw new Exception("No se ha podido aplicar completamente el esquema");
      }

      $db->commit();
      $db->exec("PRAGMA foreign_keys = ON");
      $mensaje = "Migración completada correctamente";
      $cambios = [];

    }catch(Exception $errorMigracion){
      if($db->inTransaction()){
        $db->rollBack();
      }

      $db->exec("PRAGMA foreign_keys = ON");
      throw $errorMigracion;
    }
  }

}catch(Exception $errorCapturado){
  $error = $errorCapturado->getMessage();
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Migración · ERIN ERP</title>
  <style>
    @font-face{
      font-family:Coolvetica;
      src:url("../nucleo/fuentes/Coolvetica-Rg.otf") format("opentype");
    }
    :root{
      --papel:#fffaf2;
      --arena:#eee4d5;
      --salmon:#f5aa91;
      --terracota:#bd573e;
      --tinta:#382d29;
      --borde:#ddd0bf;
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
    table{width:100%;border-collapse:collapse;margin:18px 0}
    th,td{padding:11px;border-bottom:1px solid var(--borde);text-align:left}
    th{background:var(--arena)}
    .resultado{padding:16px 20px;margin:20px 0;background:white}
    .correcto{border-left:5px solid var(--terracota)}
    .aviso{border-left:5px solid darkorange}
    .error{border-left:5px solid crimson}
    .destructivo{color:crimson;font-weight:bold}
    .seguro{color:seagreen;font-weight:bold}
    code{padding:2px 5px;background:var(--arena)}
    button{
      padding:10px 16px;
      border:1px solid #a54c37;
      border-radius:8px 0 8px 0;
      color:var(--tinta);
      background:linear-gradient(120deg,#f6baa1,#ed977e,#dc7d65);
      cursor:pointer;
    }
    label{display:block;margin:18px 0}
    a{color:var(--terracota)}
  </style>
</head>
<body>
  <h1>Migración de ERIN ERP</h1>

  <?php if($error !== null){ ?>
    <div class="resultado error">
      <strong>Se ha producido un error:</strong>
      <p><?= escapar($error) ?></p>
    </div>
  <?php } ?>

  <?php if($mensaje !== null){ ?>
    <div class="resultado correcto">
      <strong><?= escapar($mensaje) ?></strong>
      <p>
        Copia de seguridad:
        <code><?= escapar($copiaSeguridad) ?></code>
      </p>
    </div>
  <?php }elseif($error === null && count($cambios) == 0){ ?>
    <div class="resultado correcto">
      <strong>La base de datos ya está actualizada</strong>
      <p>No hay diferencias entre <code>esquema.md</code> y SQLite.</p>
    </div>
  <?php }elseif(count($cambios) > 0){ ?>
    <div class="resultado aviso">
      <strong>Cambios pendientes</strong>
      <p>Revisa las operaciones antes de ejecutar la migración.</p>
    </div>

    <table>
      <tr>
        <th>Operación</th>
        <th>Clasificación</th>
      </tr>
      <?php foreach($cambios as $cambio){ ?>
        <tr>
          <td><?= escapar(describirCambio($cambio)) ?></td>
          <td class="<?= $cambio["destructivo"] ? "destructivo" : "seguro" ?>">
            <?= $cambio["destructivo"] ? "Destructiva" : "Segura" ?>
          </td>
        </tr>
      <?php } ?>
    </table>

    <form method="post">
      <?php if($hayDestructivos){ ?>
        <label>
          <input type="checkbox" name="confirmar_destructivos" value="si">
          Confirmo que he revisado y acepto los cambios destructivos.
        </label>
      <?php } ?>
      <button type="submit">Ejecutar migración</button>
    </form>
  <?php } ?>

  <p><a href="../index.html">Volver a ERIN ERP</a></p>
</body>
</html>
