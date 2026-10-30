<?php
require_once __DIR__ . '/modelo.php';
require_once dirname(__DIR__) . '/nucleo/autenticacion.php';

function crearInstantaneaErin(ErinDatos $datos): array
{
  $instantanea = [
    'fecha'=>date(DATE_ATOM),
    'version'=>versionInstaladaErin($datos),
    'base'=>$datos->baseActual(),
    'tablas'=>[]
  ];
  foreach($datos->tablas(true) as $tabla){
    $instantanea['tablas'][$tabla] = [
      'estructura'=>$datos->estructura($tabla),
      'registros'=>$datos->listar($tabla)
    ];
  }
  return $instantanea;
}

function carpetaCopiasErin(ErinDatos $datos): string
{
  $carpeta = $datos->rutaRuntime() . '/copias';
  if(!is_dir($carpeta) && !mkdir($carpeta, 0775, true) && !is_dir($carpeta)){
    throw new Exception('No se puede crear la carpeta protegida de copias');
  }
  if(!is_file($carpeta . '/.htaccess')){ file_put_contents($carpeta . '/.htaccess', "Require all denied\n", LOCK_EX); }
  return $carpeta;
}

function guardarJsonErin(string $archivo, array $contenido): void
{
  $json = json_encode($contenido, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL;
  if(file_put_contents($archivo, $json, LOCK_EX) === false){ throw new Exception('No se ha podido guardar la copia de seguridad'); }
}

function copiarRegistrosCompatiblesErin(ErinDatos $destino, array $instantanea, string $tabla): int
{
  if(!isset($instantanea['tablas'][$tabla]) || !$destino->existeTabla($tabla)){ return 0; }
  $camposNuevos = array_column($destino->estructura($tabla), 'name');
  $filas = $instantanea['tablas'][$tabla]['registros'];
  usort($filas, fn($a, $b)=>(int)$a['Identificador'] <=> (int)$b['Identificador']);
  $compatibles = [];
  foreach($filas as $fila){
    $compatibles[] = array_intersect_key($fila, array_flip($camposNuevos));
  }
  if($compatibles){ $destino->insertarMuchos($tabla, $compatibles); }
  return count($compatibles);
}

function migrarBaseErin(ErinDatos $origen, array $diagrama, bool $activar = true): array
{
  $modelo = validarDiagrama($diagrama);
  $instantanea = crearInstantaneaErin($origen);
  $marca = date('Ymd_His');
  $carpeta = carpetaCopiasErin($origen);
  $archivoCopia = $carpeta . '/erin-unicorn-' . $marca . '.json';
  $archivoManifiesto = $carpeta . '/migracion-' . $marca . '.json';
  guardarJsonErin($archivoCopia, $instantanea);

  $baseNueva = 'erin_erp_023_' . $marca;
  $destino = new ErinDatos($baseNueva);
  if($destino->instalado()){ throw new Exception('Ya existe la base temporal prevista para la migración'); }
  $recuentos = [];
  try{
    $destino->crearBase();
    crearModeloUnicorn($destino, $diagrama, false);
    crearTablasAcceso($destino);

    foreach(array_keys($modelo) as $tabla){ $recuentos[$tabla] = copiarRegistrosCompatiblesErin($destino, $instantanea, $tabla); }
    copiarRegistrosCompatiblesErin($destino, $instantanea, 'erin_usuarios');
    copiarRegistrosCompatiblesErin($destino, $instantanea, 'erin_permisos');

    crearRelacionesUnicorn($destino, $modelo);
    comprobarIntegridadModelo($destino, $diagrama);
    registrarVersionErin($destino);

    foreach($recuentos as $tabla=>$cantidad){
      if(count($destino->listar($tabla)) !== $cantidad){ throw new Exception("La validación de '$tabla' no conserva su recuento"); }
    }

    $manifiesto = [
      'fecha'=>date(DATE_ATOM), 'estado'=>'validada',
      'base_anterior'=>$origen->baseActual(), 'base_nueva'=>$baseNueva,
      'version_anterior'=>$instantanea['version'], 'version_nueva'=>versionActualErin(),
      'copia_json'=>$archivoCopia, 'recuentos'=>$recuentos
    ];
    guardarJsonErin($archivoManifiesto, $manifiesto);
    if($activar){
      $origen->activarBase($baseNueva);
      $manifiesto['estado'] = 'activa';
      $manifiesto['activada'] = date(DATE_ATOM);
    }
    guardarJsonErin($archivoManifiesto, $manifiesto);
    return ['copia'=>$archivoCopia, 'manifiesto'=>$archivoManifiesto, 'anterior'=>$instantanea['base'], 'nueva'=>$baseNueva];
  }catch(Throwable $error){
    if($destino->instalado()){ $destino->eliminarBase(); }
    throw $error;
  }
}

function copiasRecuperablesErin(ErinDatos $datos): array
{
  $resultado = [];
  $carpeta = carpetaCopiasErin($datos);
  foreach(glob($carpeta . '/migracion-*.json') ?: [] as $archivo){
    $contenido = json_decode((string)file_get_contents($archivo), true);
    if(!is_array($contenido)){ continue; }
    foreach(['base_anterior','base_nueva'] as $campo){
      $base = $contenido[$campo] ?? null;
      if(is_string($base) && in_array($base, $datos->basesDisponibles(), true)){
        $resultado[$base] = ['base'=>$base, 'fecha'=>$contenido['fecha'] ?? '', 'origen'=>basename($archivo)];
      }
    }
  }
  return array_values($resultado);
}
