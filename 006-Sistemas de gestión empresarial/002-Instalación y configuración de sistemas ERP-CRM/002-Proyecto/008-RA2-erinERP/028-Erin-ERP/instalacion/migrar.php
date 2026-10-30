<?php
session_start();
require_once __DIR__ . '/migracion.php';
function escapar($texto){ return htmlspecialchars((string)$texto, ENT_QUOTES, 'UTF-8'); }

$datos = new ErinDatos();
if(!$datos->instalado()){ header('Location: instalar.php'); exit; }
try{ $administrador = exigirAdministrador($datos); }catch(Throwable $error){ header('Location: ../acceso.html'); exit; }
if(!isset($_SESSION['token_migracion'])){ $_SESSION['token_migracion'] = bin2hex(random_bytes(24)); }

$diagrama = leerDiagrama();
$modelo = validarDiagrama($diagrama);
$versionInstalada = versionInstaladaErin($datos);
$versionDisponible = versionActualErin();
$actuales = $datos->tablas(false);
$deseadas = array_keys($modelo);
$diferencias = [];
foreach(array_diff($deseadas, $actuales) as $tabla){ $diferencias[] = "Crear la tabla $tabla"; }
foreach(array_diff($actuales, $deseadas) as $tabla){ $diferencias[] = "Retirar la tabla $tabla"; }
foreach(array_intersect($deseadas, $actuales) as $tabla){
  $estructuraActual = $datos->estructura($tabla);
  $indicesActuales = $datos->indices($tabla);
  $camposActuales = array_column($estructuraActual, 'name');
  $camposDeseados = array_merge(['Identificador'], array_keys($modelo[$tabla]));
  foreach(array_diff($camposDeseados, $camposActuales) as $campo){ $diferencias[] = "Añadir $tabla.$campo"; }
  foreach(array_diff($camposActuales, $camposDeseados) as $campo){ $diferencias[] = "Retirar $tabla.$campo"; }
  foreach($estructuraActual as $campoActual){
    $campo = $campoActual['name'];
    if($campo === 'Identificador' || !isset($modelo[$tabla][$campo])){ continue; }
    $tipoEsperado = in_array($modelo[$tabla][$campo]['tipo'], ['REAL','NUMERIC'], true) ? 'REAL'
      : (in_array($modelo[$tabla][$campo]['tipo'], ['TEXT','BLOB'], true) ? 'TEXT' : 'INTEGER');
    if($campoActual['type'] !== $tipoEsperado){ $diferencias[] = "Cambiar el tipo de $tabla.$campo a $tipoEsperado"; }
    $fkActual = $campoActual['fk']['tabla'] ?? null;
    $fkEsperada = $modelo[$tabla][$campo]['fk'] ?: null;
    if($fkActual !== $fkEsperada){ $diferencias[] = "Actualizar la relación de $tabla.$campo"; }
    $definicion = $modelo[$tabla][$campo];
    if((bool)$campoActual['notnull'] !== $definicion['noNulo']){ $diferencias[] = "Actualizar NO NULO de $tabla.$campo"; }
    if((bool)($campoActual['unique'] ?? false) !== $definicion['unico']){ $diferencias[] = "Actualizar ÚNICO de $tabla.$campo"; }
    if(($campoActual['dflt_value'] ?? null) !== ($definicion['porDefecto'] === null ? null : (string)$definicion['porDefecto'])){ $diferencias[] = "Actualizar valor por defecto de $tabla.$campo"; }
    $indice = 'idx_' . $tabla . '_' . $campo;
    if(in_array($indice, $indicesActuales, true) !== $definicion['indice']){ $diferencias[] = "Actualizar índice de $tabla.$campo"; }
  }
}
$esDestructivo = function($diferencia){
  return str_starts_with($diferencia, 'Retirar') || str_starts_with($diferencia, 'Cambiar') || str_starts_with($diferencia, 'Actualizar');
};
$hayDestructivos = count(array_filter($diferencias, $esDestructivo)) > 0;
$error = null;
$mensaje = null;
$copia = null;

if(($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST'){
  try{
    if(!hash_equals($_SESSION['token_migracion'], $_POST['token'] ?? '')){ throw new Exception('Sesión caducada'); }
    $accion = $_POST['accion'] ?? '';
    if($accion === 'migrar'){
      if($hayDestructivos && ($_POST['confirmar_destructivos'] ?? '') !== 'si'){
        throw new Exception('Confirma que has revisado los cambios destructivos');
      }
      $resultado = migrarBaseErin($datos, $diagrama);
      $copia = $resultado['copia'];
      $mensaje = "Migración validada y activada. La base anterior '{$resultado['anterior']}' queda disponible para recuperación.";
      $versionInstalada = versionActualErin();
      $diferencias = [];
    }elseif($accion === 'restaurar'){
      $base = trim($_POST['base'] ?? '');
      $permitidas = array_column(copiasRecuperablesErin($datos), 'base');
      if(!in_array($base, $permitidas, true)){ throw new Exception('La base seleccionada no pertenece a una copia recuperable'); }
      $datos->activarBase($base);
      $mensaje = "Se ha activado la base recuperada '$base'.";
      $versionInstalada = versionInstaladaErin($datos);
    }else{ throw new Exception('Acción no válida'); }
  }catch(Throwable $fallo){ $error = $fallo->getMessage(); }
}
$copiasRecuperables = copiasRecuperablesErin($datos);
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Actualizaciones · ERIN ERP</title>
  <style>
    @font-face{font-family:Coolvetica;src:url("../nucleo/fuentes/Coolvetica-Rg.otf") format("opentype")}
    :root{--papel:#fffaf2;--arena:#eee4d5;--salmon:#f5aa91;--salmon-suave:#f8dfd2;--terracota:#bd573e;--tinta:#382d29;--borde:#ddd0bf}
    *{box-sizing:border-box}
    body{max-width:1000px;margin:40px auto;padding:20px;color:var(--tinta);background:var(--papel);font-family:Arial,sans-serif}
    h1,h2{font-family:Coolvetica,Arial,sans-serif;font-weight:400}h1{color:var(--terracota)}
    table{width:100%;border-collapse:collapse;margin:18px 0;background:white}th,td{padding:11px;border-bottom:1px solid var(--borde);text-align:left}th{background:var(--arena)}
    .resultado{padding:16px 20px;margin:20px 0;background:white}.correcto{border-left:5px solid var(--terracota)}.aviso{border-left:5px solid darkorange}.error{border-left:5px solid crimson}
    .destructivo{color:crimson;font-weight:bold}.seguro{color:seagreen;font-weight:bold}
    code{padding:2px 5px;background:var(--arena)}
    button{padding:10px 16px;border:1px solid #a54c37;border-radius:8px 0 8px 0;color:var(--tinta);background:linear-gradient(120deg,#f6baa1,#ed977e,#dc7d65);font:15px Coolvetica,Arial,sans-serif;letter-spacing:.07em;text-transform:uppercase;cursor:pointer}
    label{display:block;margin:18px 0;padding:14px;border-left:4px solid crimson;background:white}label input{accent-color:var(--terracota)}
    a{color:var(--terracota)}.acciones{display:flex;gap:16px;flex-wrap:wrap;margin-top:24px}
  </style>
</head>
<body>
  <h1>Actualizaciones de ERIN ERP</h1>
  <p>Versión instalada: <strong><?= escapar($versionInstalada ?? 'sin registro') ?></strong> · Versión disponible: <strong><?= escapar($versionDisponible) ?></strong></p>
  <p>Base UnicornBBDD activa: <code><?= escapar($datos->baseActual()) ?></code></p>
  <p>El modelo declarativo <code>diagrama.json</code> se compara con la estructura real de UnicornBBDD.</p>

  <?php if($error !== null){ ?><div class="resultado error"><strong>Se ha producido un error:</strong><p><?= escapar($error) ?></p></div><?php } ?>

  <?php if($mensaje !== null){ ?>
    <div class="resultado correcto">
      <strong><?= escapar($mensaje) ?></strong>
      <?php if($copia){ ?><p>Copia de seguridad: <code><?= escapar($copia) ?></code></p><?php } ?>
    </div>
  <?php }elseif($error === null && count($diferencias) === 0 && $versionInstalada === $versionDisponible){ ?>
    <div class="resultado correcto"><strong>La base de datos ya está actualizada</strong><p>No hay diferencias entre <code>diagrama.json</code> y UnicornBBDD.</p></div>
  <?php }elseif($error === null){ ?>
    <div class="resultado aviso">
      <strong>Cambios pendientes</strong>
      <p>Revisa las operaciones antes de ejecutar la actualización. Se creará una copia JSON y una base nueva; solo se activará después de validar el modelo, las relaciones y los recuentos. La base anterior no se elimina.</p>
    </div>

    <?php if($diferencias){ ?>
    <table>
      <thead><tr><th>Operación</th><th>Clasificación</th></tr></thead>
      <tbody>
      <?php foreach($diferencias as $diferencia){ $destructivo = $esDestructivo($diferencia); ?>
        <tr><td><?= escapar($diferencia) ?></td><td class="<?= $destructivo ? 'destructivo' : 'seguro' ?>"><?= $destructivo ? 'Destructiva' : 'Segura' ?></td></tr>
      <?php } ?>
      </tbody>
    </table>
    <?php }else{ ?>
      <p>La estructura coincide; solo está pendiente registrar la versión disponible.</p>
    <?php } ?>

    <form method="post">
      <input type="hidden" name="token" value="<?= escapar($_SESSION['token_migracion']) ?>">
      <input type="hidden" name="accion" value="migrar">
      <?php if($hayDestructivos){ ?><label><input type="checkbox" name="confirmar_destructivos" value="si"> Confirmo que he revisado y acepto los cambios destructivos.</label><?php } ?>
      <button type="submit">Ejecutar actualización</button>
    </form>
  <?php } ?>

  <?php if($copiasRecuperables){ ?>
    <h2>Recuperación</h2>
    <p>Estas bases proceden de migraciones anteriores y se pueden volver a activar sin reconstruir sus archivos.</p>
    <table>
      <thead><tr><th>Base disponible</th><th>Fecha de la copia</th><th>Acción</th></tr></thead>
      <tbody>
      <?php foreach($copiasRecuperables as $recuperable){ ?>
        <tr>
          <td><code><?= escapar($recuperable['base']) ?></code><?= $recuperable['base'] === $datos->baseActual() ? ' · activa' : '' ?></td>
          <td><?= escapar($recuperable['fecha']) ?></td>
          <td>
            <?php if($recuperable['base'] !== $datos->baseActual()){ ?>
            <form method="post">
              <input type="hidden" name="token" value="<?= escapar($_SESSION['token_migracion']) ?>">
              <input type="hidden" name="accion" value="restaurar">
              <input type="hidden" name="base" value="<?= escapar($recuperable['base']) ?>">
              <button type="submit">Activar esta copia</button>
            </form>
            <?php } ?>
          </td>
        </tr>
      <?php } ?>
      </tbody>
    </table>
  <?php } ?>

  <div class="acciones"><a href="disenador.php">Volver al diseñador</a><a href="../index.html">Volver a ERIN ERP</a></div>
</body>
</html>
