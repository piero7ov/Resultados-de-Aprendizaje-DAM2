<?php
session_start();
require_once __DIR__ . '/nucleo/autenticacion.php';
$datos = new ErinDatos();
if(!$datos->instalado()){ header('Location: instalacion/instalar.php'); exit; }
try{ exigirAdministrador($datos); }catch(Throwable $error){ header('Location: acceso.html'); exit; }
function escapar($texto){
  return htmlspecialchars((string)$texto, ENT_QUOTES, "UTF-8");
}
function rutaModulo($nombre){
  if(!preg_match('/^[a-z0-9_-]+$/', $nombre)){
    throw new Exception("Nombre de módulo no válido");
  }
  return __DIR__ . "/modulos/" . $nombre;
}
function leerModulo($nombre){
  $archivo = rutaModulo($nombre) . "/carpetas.json";
  if(!file_exists($archivo)){
    throw new Exception("No existe la configuración del módulo '$nombre'");
  }
  $datos = json_decode(file_get_contents($archivo), true);
  if(!is_array($datos) || ($datos["modulo"] ?? null) !== $nombre || !is_array($datos["tablas"] ?? null)){
    throw new Exception("Configuración no válida en '$nombre'");
  }
  return $datos;
}
function guardarModulo($nombre, $datos){
  $archivo = rutaModulo($nombre) . "/carpetas.json";
  $contenido = json_encode($datos, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;
  $temporal = tempnam(dirname($archivo), "modulo-");
  if($temporal === false || file_put_contents($temporal, $contenido) === false || !rename($temporal, $archivo)){
    throw new Exception("No se ha podido guardar el módulo '$nombre'");
  }
}

if(!isset($_SESSION["token_configuracion"])){
  $_SESSION["token_configuracion"] = bin2hex(random_bytes(16));
}
$error = null;
$mensaje = $_GET["mensaje"] ?? null;
$tablas = [];
$modulos = [];
$elegido = $_GET["modulo"] ?? null;
$configuracion = null;

try{
  $tablas = $datos->tablas(false);
  if(($_SERVER["REQUEST_METHOD"] ?? "GET") === "POST"){
    if(!hash_equals($_SESSION["token_configuracion"], $_POST["token"] ?? "")){
      throw new Exception("Sesión caducada. Recarga la página.");
    }
    $accion = $_POST["accion"] ?? "";
    $nombre = strtolower(trim($_POST["modulo"] ?? ""));
    $ruta = rutaModulo($nombre);
    if($accion === "crear"){
      if(is_dir($ruta)){
        throw new Exception("El módulo '$nombre' ya existe");
      }
      if(!mkdir($ruta)){
        throw new Exception("No se ha podido crear el módulo");
      }
      guardarModulo($nombre, ["modulo" => $nombre, "activo" => true, "tablas" => []]);
      $mensaje = "Módulo '$nombre' creado";
    }elseif($accion === "guardar"){
      $actual = leerModulo($nombre);
      $seleccionadas = $_POST["tablas"] ?? [];
      if(!is_array($seleccionadas) || count(array_diff($seleccionadas, $tablas)) > 0){
        throw new Exception("La selección contiene tablas inexistentes");
      }
      $actual["tablas"] = array_values(array_unique($seleccionadas));
      $actual["activo"] = isset($_POST["activo"]);
      guardarModulo($nombre, $actual);
      $mensaje = "Módulo '$nombre' actualizado";
    }elseif($accion === "eliminar"){
      leerModulo($nombre);
      if(array_diff(scandir($ruta), [".", "..", "carpetas.json"])){
        throw new Exception("El módulo contiene otros archivos y no se puede eliminar desde aquí");
      }
      unlink($ruta . "/carpetas.json");
      rmdir($ruta);
      $mensaje = "Módulo '$nombre' eliminado";
      $nombre = "";
    }else{
      throw new Exception("Acción desconocida");
    }
    header("Location: configuracion.php?" . http_build_query(["modulo" => $nombre, "mensaje" => $mensaje]));
    exit;
  }
  foreach(scandir(__DIR__ . "/modulos") as $nombre){
    if($nombre !== "." && $nombre !== ".." && is_dir(__DIR__ . "/modulos/" . $nombre)){
      $modulos[$nombre] = leerModulo($nombre);
    }
  }
  if(!isset($modulos[$elegido])){
    $elegido = array_key_first($modulos);
  }
  $configuracion = $elegido === null ? null : $modulos[$elegido];
}catch(Throwable $excepcion){
  $error = $excepcion->getMessage();
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Configuración · ERIN ERP</title>
  <link rel="stylesheet" href="nucleo/estilo/configuracion.css">
</head>
<body>
  <header>
    <a class="marca" href="index.html" aria-label="ERIN, inicio">ER<span class="letra-i">I</span>N</a>
    <h1>Configuración del sistema</h1>
    <div><a class="boton" href="instalacion/disenador.php">Modelo de datos</a> <a class="boton" href="instalacion/migrar.php">Actualizaciones</a> <a class="boton" href="index.html">Volver a ERIN</a></div>
  </header>
  <?php if($error){ ?><p class="aviso error"><?= escapar($error) ?> · <a href="instalacion/instalar.php">Abrir instalador</a></p><?php } ?>
  <?php if($mensaje){ ?><p class="aviso"><?= escapar($mensaje) ?></p><?php } ?>
  <?php if($error === null){ ?>
  <div class="estructura">
    <aside>
      <h2>Módulos <small><?= count($modulos) ?></small></h2>
      <p>Activa las áreas que necesita esta instalación y asigna sus tablas.</p>
      <nav aria-label="Módulos">
        <?php foreach($modulos as $nombre => $datos){ ?>
          <a class="<?= $nombre === $elegido ? "activo" : "" ?>" href="?modulo=<?= urlencode($nombre) ?>">
            <?= escapar($nombre) ?>
            <small><?= ($datos["activo"] ?? true) ? "Activo" : "Inactivo" ?> · <?= count($datos["tablas"]) ?> tablas</small>
          </a>
        <?php } ?>
      </nav>
      <form method="post" class="crear">
        <input type="hidden" name="token" value="<?= escapar($_SESSION["token_configuracion"]) ?>">
        <input type="hidden" name="accion" value="crear">
        <label for="nuevo_modulo">Crear módulo</label>
        <input id="nuevo_modulo" name="modulo" required pattern="[a-z0-9_-]+" placeholder="ej. calidad">
        <button type="submit">Crear módulo</button>
      </form>
    </aside>
    <main>
      <?php if($configuracion === null){ ?>
        <h2>No hay módulos</h2><p>Crea el primero desde la columna izquierda.</p>
      <?php }else{ ?>
        <div class="encabezado"><div><h2><?= escapar($elegido) ?></h2><p>Tablas UnicornBBDD asociadas a este módulo</p></div><span><?= count($tablas) ?> tablas disponibles</span></div>
        <form method="post">
          <input type="hidden" name="token" value="<?= escapar($_SESSION["token_configuracion"]) ?>">
          <input type="hidden" name="accion" value="guardar">
          <input type="hidden" name="modulo" value="<?= escapar($elegido) ?>">
          <label class="estado"><input type="checkbox" name="activo" value="1" <?= ($configuracion["activo"] ?? true) ? "checked" : "" ?>> Módulo activo en la navegación</label>
          <label for="buscar_tabla">Filtrar tablas</label>
          <input id="buscar_tabla" type="search" placeholder="Buscar por nombre…">
          <div class="tablas" id="tablas">
            <?php foreach($tablas as $tabla){ ?>
              <label class="tabla"><input type="checkbox" name="tablas[]" value="<?= escapar($tabla) ?>" <?= in_array($tabla, $configuracion["tablas"], true) ? "checked" : "" ?>> <?= escapar($tabla) ?></label>
            <?php } ?>
          </div>
          <button type="submit">Guardar configuración</button>
        </form>
        <form method="post" class="eliminar" onsubmit="return confirm('¿Eliminar el módulo <?= escapar($elegido) ?>? Se borrará su configuración, no las tablas de UnicornBBDD.')">
          <input type="hidden" name="token" value="<?= escapar($_SESSION["token_configuracion"]) ?>">
          <input type="hidden" name="accion" value="eliminar">
          <input type="hidden" name="modulo" value="<?= escapar($elegido) ?>">
          <button type="submit">Eliminar módulo</button>
        </form>
      <?php } ?>
    </main>
  </div>
  <?php } ?>
  <script>
    const buscarTabla = document.querySelector("#buscar_tabla");
    if(buscarTabla){
      buscarTabla.addEventListener("input", function(){
        const texto = buscarTabla.value.toLocaleLowerCase();
        document.querySelectorAll(".tabla").forEach(function(etiqueta){
          etiqueta.hidden = !etiqueta.textContent.toLocaleLowerCase().includes(texto);
        });
      });
    }
  </script>
</body>
</html>
