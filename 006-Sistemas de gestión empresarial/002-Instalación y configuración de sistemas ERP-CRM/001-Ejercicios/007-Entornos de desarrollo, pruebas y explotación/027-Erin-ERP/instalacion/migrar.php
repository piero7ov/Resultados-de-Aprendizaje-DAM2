<?php
session_start();
require_once __DIR__ . '/modelo.php';
require_once dirname(__DIR__) . '/nucleo/autenticacion.php';
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
  }
}
$esDestructivo = function($diferencia){
  return str_starts_with($diferencia, 'Retirar') || str_starts_with($diferencia, 'Cambiar') || str_starts_with($diferencia, 'Actualizar la relación');
};
$hayDestructivos = count(array_filter($diferencias, $esDestructivo)) > 0;
$error = null;
$mensaje = null;
$copia = null;

if(($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST'){
  try{
    if(!hash_equals($_SESSION['token_migracion'], $_POST['token'] ?? '')){ throw new Exception('Sesión caducada'); }
    if(($_POST['accion'] ?? '') !== 'migrar'){ throw new Exception('Acción no válida'); }
    if($hayDestructivos && ($_POST['confirmar_destructivos'] ?? '') !== 'si'){
      throw new Exception('Confirma que has revisado los cambios destructivos');
    }
    $instantanea = ['fecha'=>date(DATE_ATOM), 'version'=>versionInstaladaErin($datos), 'tablas'=>[]];
    foreach($datos->tablas(true) as $tabla){
      $instantanea['tablas'][$tabla] = ['estructura'=>$datos->estructura($tabla), 'registros'=>$datos->listar($tabla)];
    }
    $carpetaCopias = dirname(__DIR__) . '/data/copias';
    if(!is_dir($carpetaCopias) && !mkdir($carpetaCopias, 0775, true) && !is_dir($carpetaCopias)){ throw new Exception('No se puede crear la carpeta de copias'); }
    $copia = $carpetaCopias . '/erin-unicorn-' . date('Ymd-His') . '.json';
    if(file_put_contents($copia, json_encode($instantanea, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), LOCK_EX) === false){
      throw new Exception('No se ha podido crear la copia de seguridad');
    }

    $datos->eliminarBase();
    $datos->crearBase();
    crearModeloUnicorn($datos, $diagrama, false);
    crearTablasAcceso($datos);

    $mapas = [];
    $tablasRestaurables = array_merge(array_keys($modelo), ['erin_usuarios']);
    foreach($tablasRestaurables as $tabla){
      if(!isset($instantanea['tablas'][$tabla]) || !$datos->existeTabla($tabla)){ continue; }
      $estructuraNueva = $datos->estructura($tabla);
      $camposNuevos = array_column($estructuraNueva, 'name');
      $camposFk = [];
      if(isset($modelo[$tabla])){
        foreach($modelo[$tabla] as $campo=>$definicion){ if(($definicion['fk'] ?? null)){ $camposFk[] = $campo; } }
      }
      $filas = $instantanea['tablas'][$tabla]['registros'];
      usort($filas, fn($a,$b)=>(int)$a['Identificador']<=>(int)$b['Identificador']);
      foreach($filas as $fila){
        $viejo = (int)$fila['Identificador'];
        $guardar = [];
        foreach($fila as $campo=>$valor){
          if($campo !== 'Identificador' && in_array($campo, $camposNuevos, true) && !in_array($campo, $camposFk, true)){ $guardar[$campo] = $valor; }
        }
        $mapas[$tabla][$viejo] = $datos->insertar($tabla, $guardar);
      }
    }

    foreach(array_keys($modelo) as $tabla){
      if(!isset($instantanea['tablas'][$tabla], $mapas[$tabla])){ continue; }
      foreach($instantanea['tablas'][$tabla]['registros'] as $fila){
        $viejo = (int)$fila['Identificador'];
        $cambios = [];
        foreach($modelo[$tabla] as $campo=>$definicion){
          $referenciada = $definicion['fk'] ?? null;
          if($referenciada && isset($fila[$campo]) && $fila[$campo] !== null && $fila[$campo] !== ''){
            $cambios[$campo] = $mapas[$referenciada][(int)$fila[$campo]] ?? null;
          }
        }
        if($cambios){ $datos->actualizar($tabla, $mapas[$tabla][$viejo], $cambios); }
      }
    }
    crearRelacionesUnicorn($datos, $modelo);

    if(isset($instantanea['tablas']['erin_permisos'])){
      foreach($instantanea['tablas']['erin_permisos']['registros'] as $permiso){
        $usuarioNuevo = $mapas['erin_usuarios'][(int)$permiso['usuario_id']] ?? null;
        if($usuarioNuevo){
          unset($permiso['Identificador']);
          $permiso['usuario_id'] = $usuarioNuevo;
          $datos->insertar('erin_permisos', $permiso);
        }
      }
    }
    registrarVersionErin($datos);
    $_SESSION['usuario_erin'] = $mapas['erin_usuarios'][(int)$administrador['id']] ?? 0;
    $mensaje = 'Migración completada. Los registros compatibles y los accesos se han conservado.';
    $actuales = $datos->tablas(false);
    $diferencias = [];
  }catch(Throwable $fallo){ $error = $fallo->getMessage(); }
}
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
      <p>Revisa las operaciones antes de ejecutar la actualización. Se creará una copia JSON y después se reconstruirá el modelo conservando los datos compatibles.</p>
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

  <div class="acciones"><a href="disenador.php">Volver al diseñador</a><a href="../index.html">Volver a ERIN ERP</a></div>
</body>
</html>
