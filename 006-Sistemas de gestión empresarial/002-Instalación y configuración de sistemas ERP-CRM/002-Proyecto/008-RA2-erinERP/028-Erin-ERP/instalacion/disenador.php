<?php
session_start();
require_once dirname(__DIR__) . '/nucleo/autenticacion.php';
require_once __DIR__ . '/modelo.php';
$datos = new ErinDatos();
if($datos->instalado()){
  try{ exigirAdministrador($datos); }catch(Throwable $error){ http_response_code(403); exit('Acceso reservado al administrador'); }
}
$archivoDiagrama = __DIR__ . '/diagrama.json';
if(!isset($_SESSION["token_modelo"])){
  $_SESSION["token_modelo"] = bin2hex(random_bytes(16));
}

if(($_SERVER["REQUEST_METHOD"] ?? "GET") === "POST"){
  header("Content-Type: application/json; charset=utf-8");
  try{
    if(!hash_equals($_SESSION["token_modelo"], $_SERVER["HTTP_X_TOKEN_MODELO"] ?? "")){
      throw new Exception("Sesión caducada. Recarga el diseñador.");
    }
    $diagrama = json_decode(file_get_contents("php://input"), true, 512, JSON_THROW_ON_ERROR);
    if($datos->instalado() && count($diagrama["tablas"] ?? []) === 0){
      throw new Exception("La instalación activa necesita al menos una entidad");
    }
    validarDiagrama($diagrama);
    $json = json_encode($diagrama, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . PHP_EOL;
    $temporalJson = tempnam(__DIR__, "diagrama-");
    if($temporalJson === false){
      throw new Exception("No se pueden preparar los archivos del modelo");
    }
    file_put_contents($temporalJson, $json);
    if(!rename($temporalJson, $archivoDiagrama)){
      throw new Exception("No se ha podido guardar el modelo");
    }
    echo json_encode(["correcto" => true, "tablas" => count($diagrama["tablas"])]);
  }catch(Throwable $error){
    http_response_code(400);
    echo json_encode(["correcto" => false, "error" => $error->getMessage()]);
  }
  exit;
}

$diagrama = file_get_contents($archivoDiagrama);
if($diagrama === false){
  http_response_code(500);
  exit("No existe diagrama.json");
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Modelo de datos · ERIN ERP</title>
  <link rel="stylesheet" href="disenador.css">
</head>
<body>
  <header>
    <div class="marca"><a href="../index.html" aria-label="ERIN, inicio">ER<span class="letra-i">I</span>N</a><small>Modelo de datos</small></div>
    <div class="acciones">
      <button id="nueva">Nueva entidad</button>
      <button id="ordenar">Redistribuir</button>
      <button id="vaciar">Vaciar diagrama</button>
      <button id="guardar" class="principal">Guardar modelo</button>
      <a href="diagrama.json" download>Exportar modelo JSON</a>
      <a href="instalar.php">Volver al instalador</a>
      <a href="migrar.php">Revisar migración</a>
    </div>
  </header>
  <div class="zona">
    <aside>
      <h1>Entidades y relaciones</h1>
      <p>Arrastra las entidades en el lienzo. Selecciona una para editar sus campos. Una referencia FK crea la flecha hacia la entidad relacionada.</p>
      <label for="filtrar">Buscar entidad</label>
      <input id="filtrar" type="search" placeholder="Nombre…">
      <div id="lista"></div>
      <section id="editor" hidden>
        <h2>Entidad seleccionada</h2>
        <label for="nombre_entidad">Nombre</label>
        <input id="nombre_entidad" type="text">
        <p><strong>Identificador</strong> · INTEGER · clave primaria automática</p>
        <div id="campos"></div>
        <button id="anadir_campo">Añadir campo</button>
        <button id="eliminar_entidad" class="peligro">Eliminar entidad</button>
      </section>
      <p id="estado" role="status"></p>
    </aside>
    <div class="superficie">
      <main id="lienzo" aria-label="Diagrama de entidades">
        <div id="escenario"><div id="mundo"><svg id="flechas" aria-hidden="true"></svg><div id="entidades"></div></div></div>
      </main>
      <div class="controles-vista" aria-label="Controles de vista">
        <button id="alejar" type="button" aria-label="Alejar">−</button>
        <span id="nivel_zoom">100%</span>
        <button id="acercar" type="button" aria-label="Acercar">+</button>
        <button id="encajar" type="button">Vista panorámica</button>
      </div>
      <div class="panorama"><canvas id="mapa" width="220" height="150" aria-label="Mapa panorámico del diagrama"></canvas></div>
    </div>
  </div>
  <script>
    window.DIAGRAMA_INICIAL = <?= json_encode(json_decode($diagrama, true), JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) ?>;
    window.TOKEN_MODELO = <?= json_encode($_SESSION["token_modelo"]) ?>;
  </script>
  <script src="disenador.js"></script>
</body>
</html>
