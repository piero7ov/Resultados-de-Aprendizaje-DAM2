<?php

function erinwaveRutaBaseDatos(): string{
  $carpetaDatos = dirname(__DIR__) . DIRECTORY_SEPARATOR . "datos";

  if(!is_dir($carpetaDatos) && !mkdir($carpetaDatos,0775,true) && !is_dir($carpetaDatos)){
    throw new RuntimeException("No se pudo crear la carpeta de datos");
  }

  return $carpetaDatos . DIRECTORY_SEPARATOR . "erinwave.sqlite";
}

function erinwaveAbrirBaseDatos(): PDO{
  static $conexion = null;

  if($conexion instanceof PDO){
    return $conexion;
  }

  $conexion = new PDO("sqlite:" . erinwaveRutaBaseDatos());
  $conexion->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);
  $conexion->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE,PDO::FETCH_ASSOC);
  $conexion->exec("PRAGMA foreign_keys = ON");
  $conexion->exec("PRAGMA busy_timeout = 5000");
  erinwaveCrearEsquema($conexion);

  return $conexion;
}

function erinwaveCrearEsquema(PDO $conexion): void{
  $conexion->exec(<<<SQL
    CREATE TABLE IF NOT EXISTS canciones(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      archivo TEXT NOT NULL UNIQUE,
      artista TEXT,
      titulo TEXT NOT NULL,
      activa INTEGER NOT NULL DEFAULT 1 CHECK(activa IN (0,1)),
      creada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS letras(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cancion_id INTEGER NOT NULL UNIQUE,
      idioma TEXT NOT NULL CHECK(idioma IN ('es','en')),
      texto TEXT NOT NULL,
      hash TEXT NOT NULL,
      fuente TEXT,
      revisada INTEGER NOT NULL DEFAULT 1 CHECK(revisada IN (0,1)),
      actualizada_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(cancion_id) REFERENCES canciones(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lineas_letra(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      letra_id INTEGER NOT NULL,
      orden INTEGER NOT NULL,
      texto TEXT NOT NULL,
      texto_normalizado TEXT NOT NULL,
      FOREIGN KEY(letra_id) REFERENCES letras(id) ON DELETE CASCADE,
      UNIQUE(letra_id,orden)
    );

    CREATE TABLE IF NOT EXISTS generaciones(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cancion_id INTEGER NOT NULL,
      modelo TEXT NOT NULL,
      estado TEXT NOT NULL,
      idioma_detectado TEXT,
      frases_whisper INTEGER NOT NULL DEFAULT 0,
      lineas_letra INTEGER NOT NULL DEFAULT 0,
      coincidencias INTEGER NOT NULL DEFAULT 0,
      similitud_media REAL NOT NULL DEFAULT 0,
      creado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(cancion_id) REFERENCES canciones(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trabajos_karaoke(
      cancion_id INTEGER PRIMARY KEY,
      estado TEXT NOT NULL,
      fase TEXT NOT NULL,
      porcentaje INTEGER NOT NULL DEFAULT 0,
      modelo TEXT,
      idioma_detectado TEXT,
      codigo_error TEXT,
      url_vtt TEXT,
      alineacion_json TEXT,
      iniciado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(cancion_id) REFERENCES canciones(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS indice_lineas_letra
      ON lineas_letra(letra_id,orden);

    CREATE INDEX IF NOT EXISTS indice_generaciones_cancion
      ON generaciones(cancion_id,id DESC);
  SQL);
}

function erinwaveSepararNombreCancion(string $archivo): array{
  $nombreBase = pathinfo($archivo,PATHINFO_FILENAME);
  $artista = null;
  $titulo = $nombreBase;

  if(preg_match('/^\s*(.+?)\s+-\s+(.+?)\s*$/u',$nombreBase,$partes)){
    $artista = trim($partes[1]);
    $titulo = trim($partes[2]);
  }

  return [
    "artista" => $artista,
    "titulo" => $titulo
  ];
}

function erinwaveNormalizarTexto(string $texto): string{
  $texto = mb_strtolower(trim($texto),"UTF-8");
  $texto = strtr($texto,[
    "á" => "a", "à" => "a", "ä" => "a", "â" => "a",
    "é" => "e", "è" => "e", "ë" => "e", "ê" => "e",
    "í" => "i", "ì" => "i", "ï" => "i", "î" => "i",
    "ó" => "o", "ò" => "o", "ö" => "o", "ô" => "o",
    "ú" => "u", "ù" => "u", "ü" => "u", "û" => "u",
    "ñ" => "n", "ç" => "c", "’" => "'", "‘" => "'"
  ]);
  $texto = preg_replace('/[^a-z0-9\s\']+/u',' ',$texto);
  $texto = preg_replace('/\s+/u',' ',(string)$texto);

  return trim((string)$texto);
}

function erinwaveSincronizarCanciones(PDO $conexion,string $carpetaAudio): void{
  if(!is_dir($carpetaAudio)){
    throw new RuntimeException("No se encuentra la carpeta de audio");
  }

  $archivos = scandir($carpetaAudio);

  if($archivos === false){
    throw new RuntimeException("No se pudo explorar la carpeta de audio");
  }

  $conexion->beginTransaction();

  try{
    $conexion->exec("UPDATE canciones SET activa = 0");
    $consulta = $conexion->prepare(<<<SQL
      INSERT INTO canciones(archivo,artista,titulo,activa)
      VALUES(:archivo,:artista,:titulo,1)
      ON CONFLICT(archivo) DO UPDATE SET
        artista = excluded.artista,
        titulo = excluded.titulo,
        activa = 1,
        actualizada_en = CURRENT_TIMESTAMP
    SQL);

    foreach($archivos as $archivo){
      $ruta = $carpetaAudio . DIRECTORY_SEPARATOR . $archivo;

      if(!is_file($ruta) || strtolower(pathinfo($archivo,PATHINFO_EXTENSION)) !== "mp3"){
        continue;
      }

      $datos = erinwaveSepararNombreCancion($archivo);
      $consulta->execute([
        ":archivo" => $archivo,
        ":artista" => $datos["artista"],
        ":titulo" => $datos["titulo"]
      ]);
    }

    $conexion->commit();
  }catch(Throwable $error){
    $conexion->rollBack();
    throw $error;
  }
}

function erinwaveObtenerCancion(PDO $conexion,string $archivo): ?array{
  $consulta = $conexion->prepare("SELECT * FROM canciones WHERE archivo = :archivo AND activa = 1");
  $consulta->execute([":archivo" => $archivo]);
  $cancion = $consulta->fetch();

  return $cancion === false ? null : $cancion;
}

function erinwaveObtenerLetra(PDO $conexion,string $archivo): ?array{
  $consulta = $conexion->prepare(<<<SQL
    SELECT
      l.id,
      l.idioma,
      l.texto,
      l.hash,
      l.fuente,
      l.revisada,
      l.actualizada_en
    FROM letras l
    INNER JOIN canciones c ON c.id = l.cancion_id
    WHERE c.archivo = :archivo AND c.activa = 1
  SQL);
  $consulta->execute([":archivo" => $archivo]);
  $letra = $consulta->fetch();

  if($letra === false){
    return null;
  }

  $consultaLineas = $conexion->prepare(<<<SQL
    SELECT orden,texto,texto_normalizado
    FROM lineas_letra
    WHERE letra_id = :letra_id
    ORDER BY orden
  SQL);
  $consultaLineas->execute([":letra_id" => $letra["id"]]);
  $letra["lineas"] = $consultaLineas->fetchAll();

  return $letra;
}

function erinwaveGuardarLetra(
  PDO $conexion,
  string $archivo,
  string $idioma,
  string $texto,
  ?string $fuente
): array{
  if(!in_array($idioma,["es","en"],true)){
    throw new InvalidArgumentException("Idioma no válido");
  }

  $cancion = erinwaveObtenerCancion($conexion,$archivo);

  if($cancion === null){
    throw new InvalidArgumentException("Canción no encontrada");
  }

  $lineas = array_values(array_filter(array_map(
    fn(string $linea): string => trim($linea),
    preg_split('/\R/u',trim($texto)) ?: []
  ),fn(string $linea): bool => $linea !== ""));

  if(count($lineas) === 0){
    throw new InvalidArgumentException("La letra no contiene líneas");
  }

  $textoLimpio = implode("\n",$lineas);
  $hash = hash("sha256",$textoLimpio);
  $fuente = $fuente === null || trim($fuente) === "" ? null : trim($fuente);

  $conexion->beginTransaction();

  try{
    $consulta = $conexion->prepare(<<<SQL
      INSERT INTO letras(cancion_id,idioma,texto,hash,fuente,revisada)
      VALUES(:cancion_id,:idioma,:texto,:hash,:fuente,1)
      ON CONFLICT(cancion_id) DO UPDATE SET
        idioma = excluded.idioma,
        texto = excluded.texto,
        hash = excluded.hash,
        fuente = excluded.fuente,
        revisada = 1,
        actualizada_en = CURRENT_TIMESTAMP
    SQL);
    $consulta->execute([
      ":cancion_id" => $cancion["id"],
      ":idioma" => $idioma,
      ":texto" => $textoLimpio,
      ":hash" => $hash,
      ":fuente" => $fuente
    ]);

    $consultaLetra = $conexion->prepare("SELECT id FROM letras WHERE cancion_id = :cancion_id");
    $consultaLetra->execute([":cancion_id" => $cancion["id"]]);
    $letraId = (int)$consultaLetra->fetchColumn();
    $conexion->prepare("DELETE FROM lineas_letra WHERE letra_id = :letra_id")
      ->execute([":letra_id" => $letraId]);
    $insertarLinea = $conexion->prepare(<<<SQL
      INSERT INTO lineas_letra(letra_id,orden,texto,texto_normalizado)
      VALUES(:letra_id,:orden,:texto,:texto_normalizado)
    SQL);

    foreach($lineas as $indice => $linea){
      $insertarLinea->execute([
        ":letra_id" => $letraId,
        ":orden" => $indice + 1,
        ":texto" => $linea,
        ":texto_normalizado" => erinwaveNormalizarTexto($linea)
      ]);
    }

    $conexion->commit();
  }catch(Throwable $error){
    $conexion->rollBack();
    throw $error;
  }

  return erinwaveObtenerLetra($conexion,$archivo);
}

function erinwaveRegistrarGeneracion(PDO $conexion,string $archivo,array $datos): void{
  $cancion = erinwaveObtenerCancion($conexion,$archivo);

  if($cancion === null){
    return;
  }

  $consulta = $conexion->prepare(<<<SQL
    INSERT INTO generaciones(
      cancion_id,modelo,estado,idioma_detectado,frases_whisper,
      lineas_letra,coincidencias,similitud_media
    ) VALUES(
      :cancion_id,:modelo,:estado,:idioma_detectado,:frases_whisper,
      :lineas_letra,:coincidencias,:similitud_media
    )
  SQL);
  $consulta->execute([
    ":cancion_id" => $cancion["id"],
    ":modelo" => $datos["modelo"] ?? "small",
    ":estado" => $datos["estado"] ?? "generado",
    ":idioma_detectado" => $datos["idiomaDetectado"] ?? null,
    ":frases_whisper" => (int)($datos["frasesWhisper"] ?? 0),
    ":lineas_letra" => (int)($datos["lineasLetra"] ?? 0),
    ":coincidencias" => (int)($datos["coincidencias"] ?? 0),
    ":similitud_media" => (float)($datos["similitudMedia"] ?? 0)
  ]);
}

function erinwaveObtenerTrabajoKaraoke(PDO $conexion,string $archivo): ?array{
  $consulta = $conexion->prepare(<<<SQL
    SELECT
      t.estado,
      t.fase,
      t.porcentaje,
      t.modelo,
      t.idioma_detectado,
      t.codigo_error,
      t.url_vtt,
      t.alineacion_json,
      t.iniciado_en,
      t.actualizado_en,
      MAX(0,strftime('%s','now') - strftime('%s',t.actualizado_en)) AS segundos_sin_actualizar
    FROM trabajos_karaoke t
    INNER JOIN canciones c ON c.id = t.cancion_id
    WHERE c.archivo = :archivo AND c.activa = 1
  SQL);
  $consulta->execute([":archivo" => $archivo]);
  $trabajo = $consulta->fetch();

  if($trabajo === false){
    return null;
  }

  $trabajo["porcentaje"] = (int)$trabajo["porcentaje"];
  $trabajo["segundosSinActualizar"] = (int)$trabajo["segundos_sin_actualizar"];
  $trabajo["idiomaDetectado"] = $trabajo["idioma_detectado"];
  $trabajo["codigoError"] = $trabajo["codigo_error"];
  $trabajo["urlVtt"] = $trabajo["url_vtt"];
  $trabajo["alineacion"] = $trabajo["alineacion_json"] === null
    ? null
    : json_decode($trabajo["alineacion_json"],true);
  unset(
    $trabajo["segundos_sin_actualizar"],
    $trabajo["idioma_detectado"],
    $trabajo["codigo_error"],
    $trabajo["url_vtt"],
    $trabajo["alineacion_json"]
  );

  return $trabajo;
}

function erinwaveActualizarTrabajoKaraoke(PDO $conexion,string $archivo,array $datos): void{
  $cancion = erinwaveObtenerCancion($conexion,$archivo);

  if($cancion === null){
    return;
  }

  $anterior = erinwaveObtenerTrabajoKaraoke($conexion,$archivo);
  $estado = (string)($datos["estado"] ?? $anterior["estado"] ?? "en_curso");
  $fase = (string)($datos["fase"] ?? $anterior["fase"] ?? "iniciando");
  $porcentaje = max(0,min(100,(int)($datos["porcentaje"] ?? $anterior["porcentaje"] ?? 0)));
  $modelo = $datos["modelo"] ?? $anterior["modelo"] ?? null;
  $idioma = $datos["idiomaDetectado"] ?? $anterior["idiomaDetectado"] ?? null;
  $codigo = array_key_exists("codigoError",$datos)
    ? $datos["codigoError"]
    : ($anterior["codigoError"] ?? null);
  $url = $datos["urlVtt"] ?? $anterior["urlVtt"] ?? null;
  $alineacion = array_key_exists("alineacion",$datos)
    ? $datos["alineacion"]
    : ($anterior["alineacion"] ?? null);
  $reiniciar = (bool)($datos["reiniciar"] ?? false);
  $consulta = $conexion->prepare(<<<SQL
    INSERT INTO trabajos_karaoke(
      cancion_id,estado,fase,porcentaje,modelo,idioma_detectado,
      codigo_error,url_vtt,alineacion_json,iniciado_en,actualizado_en
    ) VALUES(
      :cancion_id,:estado,:fase,:porcentaje,:modelo,:idioma_detectado,
      :codigo_error,:url_vtt,:alineacion_json,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
    )
    ON CONFLICT(cancion_id) DO UPDATE SET
      estado = excluded.estado,
      fase = excluded.fase,
      porcentaje = excluded.porcentaje,
      modelo = excluded.modelo,
      idioma_detectado = excluded.idioma_detectado,
      codigo_error = excluded.codigo_error,
      url_vtt = excluded.url_vtt,
      alineacion_json = excluded.alineacion_json,
      iniciado_en = CASE WHEN :reiniciar = 1 THEN CURRENT_TIMESTAMP ELSE trabajos_karaoke.iniciado_en END,
      actualizado_en = CURRENT_TIMESTAMP
  SQL);
  $consulta->execute([
    ":cancion_id" => $cancion["id"],
    ":estado" => $estado,
    ":fase" => $fase,
    ":porcentaje" => $porcentaje,
    ":modelo" => $modelo,
    ":idioma_detectado" => $idioma,
    ":codigo_error" => $codigo,
    ":url_vtt" => $url,
    ":alineacion_json" => $alineacion === null
      ? null
      : json_encode($alineacion,JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    ":reiniciar" => $reiniciar ? 1 : 0
  ]);
}

function erinwaveListarCancionesConLetras(PDO $conexion): array{
  $consulta = $conexion->query(<<<SQL
    SELECT
      c.id,
      c.archivo,
      c.artista,
      c.titulo,
      l.idioma,
      l.texto,
      l.fuente,
      l.hash,
      l.actualizada_en,
      (SELECT COUNT(*) FROM lineas_letra ll WHERE ll.letra_id = l.id) AS total_lineas,
      (SELECT g.estado FROM generaciones g WHERE g.cancion_id = c.id ORDER BY g.id DESC LIMIT 1) AS ultimo_estado,
      (SELECT g.coincidencias FROM generaciones g WHERE g.cancion_id = c.id ORDER BY g.id DESC LIMIT 1) AS ultimas_coincidencias,
      (SELECT g.lineas_letra FROM generaciones g WHERE g.cancion_id = c.id ORDER BY g.id DESC LIMIT 1) AS ultimas_lineas
    FROM canciones c
    LEFT JOIN letras l ON l.cancion_id = c.id
    WHERE c.activa = 1
    ORDER BY c.archivo COLLATE NOCASE
  SQL);

  return $consulta->fetchAll();
}
