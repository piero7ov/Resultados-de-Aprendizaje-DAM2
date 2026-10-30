<?php
function citarIdentificador($nombre){
  return '"' . str_replace('"', '""', $nombre) . '"';
}

function validarNombre($nombre){
  if(!is_string($nombre) || !preg_match('/^[\p{L}_][\p{L}\p{N}_]*$/u', $nombre)){
    throw new Exception("Nombre de tabla o campo no válido: " . (string)$nombre);
  }
  return $nombre;
}

function generarSqlDiagrama($diagrama){
  if(!is_array($diagrama) || !isset($diagrama["tablas"]) || !is_array($diagrama["tablas"])){
    throw new Exception("El diagrama debe contener una lista de entidades");
  }
  if(count($diagrama["tablas"]) == 0){
    return "";
  }
  $tablas = [];
  foreach($diagrama["tablas"] as $tabla){
    $nombre = validarNombre($tabla["nombre"] ?? null);
    if(isset($tablas[$nombre])){
      throw new Exception("Entidad duplicada: $nombre");
    }
    $tablas[$nombre] = $tabla;
  }
  $sql = [];
  foreach($tablas as $nombre => $tabla){
    $columnas = [citarIdentificador("Identificador") . " INTEGER PRIMARY KEY AUTOINCREMENT"];
    $nombres = ["Identificador" => true];
    foreach($tabla["campos"] ?? [] as $campo){
      $nombreCampo = validarNombre($campo["nombre"] ?? null);
      $tipo = strtoupper((string)($campo["tipo"] ?? ""));
      if(isset($nombres[$nombreCampo])){
        throw new Exception("Campo duplicado en $nombre: $nombreCampo");
      }
      if(!in_array($tipo, ["TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC"], true)){
        throw new Exception("Tipo no permitido en $nombre.$nombreCampo");
      }
      $nombres[$nombreCampo] = true;
      $definicion = citarIdentificador($nombreCampo) . " " . $tipo;
      $fk = $campo["fk"] ?? null;
      if($fk !== null && $fk !== ""){
        if(!isset($tablas[$fk]) || $tipo !== "INTEGER"){
          throw new Exception("FK no válida en $nombre.$nombreCampo");
        }
        $definicion .= " REFERENCES " . citarIdentificador($fk) . "(" . citarIdentificador("Identificador") . ")";
      }
      $columnas[] = $definicion;
    }
    $sql[] = "CREATE TABLE " . citarIdentificador($nombre) . " (" . implode(", ", $columnas) . ");";
  }
  return implode(PHP_EOL . PHP_EOL, $sql) . PHP_EOL;
}

function leerModeloSql($archivo){
  $sql = file_get_contents($archivo);
  if($sql === false || trim($sql) === ""){
    throw new Exception("No se puede leer esquema.sql");
  }
  $memoria = new PDO("sqlite::memory:");
  $memoria->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $memoria->exec($sql);
  $nombres = $memoria->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
  if(count($nombres) === 0){
    throw new Exception("El SQL no contiene tablas");
  }
  $tablas = [];
  foreach($nombres as $nombre){
    $campos = [];
    $fks = [];
    foreach($memoria->query("PRAGMA foreign_key_list(" . citarIdentificador($nombre) . ")") as $fk){
      if($fk["to"] !== "Identificador"){
        throw new Exception("La FK de $nombre debe referirse a Identificador");
      }
      $fks[$fk["from"]] = $fk["table"];
    }
    $pk = false;
    foreach($memoria->query("PRAGMA table_info(" . citarIdentificador($nombre) . ")") as $campo){
      if($campo["name"] === "Identificador"){
        $pk = (int)$campo["pk"] === 1 && strtoupper($campo["type"]) === "INTEGER";
        continue;
      }
      $tipo = strtoupper($campo["type"] ?: "TEXT");
      if(!in_array($tipo, ["TEXT", "INTEGER", "REAL", "BLOB", "NUMERIC"], true)){
        throw new Exception("Tipo no compatible en $nombre." . $campo["name"]);
      }
      $campos[$campo["name"]] = ["tipo" => $tipo, "fk" => $fks[$campo["name"]] ?? null];
    }
    if(!$pk){
      throw new Exception("Falta Identificador en $nombre");
    }
    $tablas[$nombre] = $campos;
  }
  return $tablas;
}
