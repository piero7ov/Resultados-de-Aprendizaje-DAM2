<?php
require_once dirname(__DIR__) . '/nucleo/datos/ErinDatos.php';

function validarNombre($nombre){
  if(!is_string($nombre) || !preg_match('/^[\p{L}_][\p{L}\p{N}_]*$/u', $nombre)){
    throw new Exception('Nombre de tabla o campo no válido: ' . (string)$nombre);
  }
  return $nombre;
}

function validarDiagrama($diagrama){
  if(!is_array($diagrama) || !isset($diagrama['tablas']) || !is_array($diagrama['tablas'])){
    throw new Exception('El diagrama debe contener una lista de entidades');
  }
  $tablas = [];
  foreach($diagrama['tablas'] as $tabla){
    $nombre = validarNombre($tabla['nombre'] ?? null);
    if(str_starts_with($nombre, 'erin_')){ throw new Exception("El prefijo erin_ está reservado: $nombre"); }
    if(isset($tablas[$nombre])){ throw new Exception("Entidad duplicada: $nombre"); }
    $campos = [];
    foreach($tabla['campos'] ?? [] as $campo){
      $campoNombre = validarNombre($campo['nombre'] ?? null);
      if($campoNombre === 'Identificador' || isset($campos[$campoNombre])){
        throw new Exception("Campo duplicado o reservado en $nombre: $campoNombre");
      }
      $tipo = strtoupper((string)($campo['tipo'] ?? ''));
      if(!in_array($tipo, ['TEXT', 'INTEGER', 'REAL', 'BLOB', 'NUMERIC'], true)){
        throw new Exception("Tipo no permitido en $nombre.$campoNombre");
      }
      $campos[$campoNombre] = ['tipo' => $tipo, 'fk' => $campo['fk'] ?? null];
    }
    $tablas[$nombre] = $campos;
  }
  foreach($tablas as $nombre => $campos){
    foreach($campos as $campo => $definicion){
      $fk = $definicion['fk'];
      if($fk !== null && $fk !== ''){
        if(!isset($tablas[$fk]) || $definicion['tipo'] !== 'INTEGER'){
          throw new Exception("FK no válida en $nombre.$campo");
        }
      }
    }
  }
  return $tablas;
}

function leerDiagrama($archivo = null){
  $archivo ??= __DIR__ . '/diagrama.json';
  $contenido = file_get_contents($archivo);
  if($contenido === false){ throw new Exception('No se puede leer diagrama.json'); }
  return json_decode($contenido, true, 512, JSON_THROW_ON_ERROR);
}

function crearModeloUnicorn(ErinDatos $datos, array $diagrama, $crearRelaciones = true){
  $tablas = validarDiagrama($diagrama);
  if($crearRelaciones){ crearRelacionesUnicorn($datos, $tablas); }
  return $tablas;
}

function crearRelacionesUnicorn(ErinDatos $datos, array $tablas){
  foreach($tablas as $nombre => $campos){
    $columnas = [];
    foreach($campos as $campo => $definicion){ $columnas[$campo] = $definicion['tipo']; }
    $datos->crearTabla($nombre, $columnas);
  }
  foreach($tablas as $nombre => $campos){
    foreach($campos as $campo => $definicion){
      if(($definicion['fk'] ?? null) !== null && $definicion['fk'] !== ''){
        $datos->anadirClaveForanea($nombre, $campo, $definicion['fk']);
      }
    }
  }
}

function separarTuplasInsert($texto){
  $tuplas = [];
  $actual = '';
  $nivel = 0;
  $comilla = false;
  $longitud = strlen($texto);
  for($i = 0; $i < $longitud; $i++){
    $caracter = $texto[$i];
    if($comilla){
      $actual .= $caracter;
      if($caracter === "'"){
        if($i + 1 < $longitud && $texto[$i + 1] === "'"){
          $actual .= $texto[++$i];
        }else{ $comilla = false; }
      }
      continue;
    }
    if($caracter === "'"){ $comilla = true; $actual .= $caracter; continue; }
    if($caracter === '('){ if($nivel++ > 0){ $actual .= $caracter; } continue; }
    if($caracter === ')'){
      $nivel--;
      if($nivel === 0){ $tuplas[] = $actual; $actual = ''; }
      else{ $actual .= $caracter; }
      continue;
    }
    if($nivel > 0){ $actual .= $caracter; }
  }
  return $tuplas;
}

function separarValoresInsert($texto){
  $valores = [];
  $actual = '';
  $comilla = false;
  $longitud = strlen($texto);
  for($i = 0; $i < $longitud; $i++){
    $caracter = $texto[$i];
    if($comilla){
      if($caracter === "'" && $i + 1 < $longitud && $texto[$i + 1] === "'"){
        $actual .= "'"; $i++; continue;
      }
      if($caracter === "'"){ $comilla = false; continue; }
      $actual .= $caracter;
    }elseif($caracter === "'"){
      $comilla = true;
    }elseif($caracter === ','){
      $valores[] = trim($actual); $actual = '';
    }else{ $actual .= $caracter; }
  }
  $valores[] = trim($actual);
  return array_map(fn($valor) => strtoupper($valor) === 'NULL' ? null : $valor, $valores);
}

function importarDatosDemostracion(ErinDatos $datos, string $archivo, array $diagrama){
  $sql = file_get_contents($archivo);
  if($sql === false){ throw new Exception('No se pueden leer los datos de demostración'); }
  $modelos = validarDiagrama($diagrama);
  $sql = preg_replace('/^\s*--.*$/m', '', $sql);
  preg_match_all('/INSERT\s+INTO\s+"([^"]+)"\s*(?:\((.*?)\))?\s*VALUES\s*(.*?);/is', $sql, $inserciones, PREG_SET_ORDER);
  $pendientes = [];
  foreach($inserciones as $insert){
    $tabla = $insert[1];
    $tablaReal = array_key_exists($tabla, $modelos) ? $tabla : null;
    if($tablaReal === null){
      foreach(array_keys($modelos) as $candidata){
        if(strcasecmp($candidata, $tabla) === 0){ $tablaReal = $candidata; break; }
      }
    }
    if($tablaReal === null){ throw new Exception("Los datos mencionan una tabla inexistente: $tabla"); }
    if(trim($insert[2] ?? '') !== ''){
      preg_match_all('/"([^"]+)"/', $insert[2], $nombres);
      $columnas = $nombres[1];
    }else{
      $columnas = array_merge(['Identificador'], array_keys($modelos[$tablaReal]));
    }
    foreach(separarTuplasInsert($insert[3]) as $tupla){
      $valores = separarValoresInsert($tupla);
      if(count($columnas) !== count($valores)){ throw new Exception("Datos incompatibles en $tablaReal"); }
      $fila = array_combine($columnas, $valores);
      $pendientes[] = ['tabla'=>$tablaReal, 'fila'=>$fila];
    }
  }
  $mapas = [];
  foreach($pendientes as $indice=>$pendiente){
    $tabla = $pendiente['tabla'];
    $fila = $pendiente['fila'];
    $identificadorOriginal = isset($fila['Identificador']) ? (int)$fila['Identificador'] : $indice + 1;
    unset($fila['Identificador']);
    foreach($modelos[$tabla] as $campo=>$definicion){
      if(($definicion['fk'] ?? null) !== null){ unset($fila[$campo]); }
    }
    $nuevo = $datos->insertar($tabla, $fila);
    $mapas[$tabla][$identificadorOriginal] = $nuevo;
    $pendientes[$indice]['nuevo'] = $nuevo;
  }
  foreach($pendientes as $pendiente){
    $tabla = $pendiente['tabla'];
    $cambios = [];
    foreach($modelos[$tabla] as $campo=>$definicion){
      $referenciada = $definicion['fk'] ?? null;
      $valor = $pendiente['fila'][$campo] ?? null;
      if($referenciada !== null && $valor !== null && $valor !== ''){
        if(!isset($mapas[$referenciada][(int)$valor])){
          throw new Exception("Relación no disponible en $tabla.$campo");
        }
        $cambios[$campo] = $mapas[$referenciada][(int)$valor];
      }
    }
    if($cambios){ $datos->actualizar($tabla, $pendiente['nuevo'], $cambios); }
  }
  return count($pendientes);
}

