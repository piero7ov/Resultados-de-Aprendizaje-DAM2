<?php
header("Content-Type: application/json; charset=utf-8");

function identificador($texto){
	return '"' . str_replace('"', '""', $texto) . '"';
}

function responder($datos, $codigo = 200){
	http_response_code($codigo);
	echo json_encode($datos, JSON_UNESCAPED_UNICODE);
}

function validarTabla($db, $tabla){
	if($tabla == ""){
		throw new Exception("No se ha indicado ninguna tabla");
	}

	$consulta = $db->prepare("
		SELECT name
		FROM sqlite_master
		WHERE type = 'table'
		AND name = :tabla
		AND name NOT LIKE 'sqlite_%'
	");
	$consulta->execute([
		":tabla" => $tabla
	]);

	if(!$consulta->fetchColumn()){
		throw new Exception("La tabla '" . $tabla . "' no existe");
	}
}

function estructuraTabla($db, $tabla){
	return $db->query(
		"PRAGMA table_info(" . identificador($tabla) . ")"
	)->fetchAll(PDO::FETCH_ASSOC);
}

function camposEditables($estructura){
	return array_values(array_filter(
		$estructura,
		function($campo){
			return $campo["name"] != "Identificador";
		}
	));
}

function validarIdentificador($identificador){
	if(!ctype_digit((string)$identificador) || (int)$identificador < 1){
		throw new Exception("El Identificador no es válido");
	}

	return (int)$identificador;
}

function exigirPost(){
	if(($_SERVER["REQUEST_METHOD"] ?? "GET") != "POST"){
		throw new Exception("La operación debe enviarse mediante POST");
	}
}

function obtenerRegistro($db, $tabla, $identificadorRegistro){
	$consulta = $db->prepare(
		"SELECT * FROM " . identificador($tabla) .
		" WHERE " . identificador("Identificador") . " = :identificador"
	);
	$consulta->execute([
		":identificador" => $identificadorRegistro
	]);
	$registro = $consulta->fetch(PDO::FETCH_ASSOC);

	if(!$registro){
		throw new Exception("El registro solicitado no existe");
	}

	return $registro;
}

try{
	$baseDatos = dirname(__DIR__) . "/data/erin.sqlite";

	if(!file_exists($baseDatos)){
		throw new Exception("No existe la base de datos SQLite");
	}

	$db = new PDO("sqlite:" . $baseDatos);
	$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
	$db->exec("PRAGMA foreign_keys = ON");

	$bloque = $_GET["bloque"] ?? "";
	$tabla = $_GET["tabla"] ?? "";

	switch($bloque){
		case "menu":
			$consulta = $db->query("
				SELECT name
				FROM sqlite_master
				WHERE type = 'table'
				AND name NOT LIKE 'sqlite_%'
				ORDER BY name
			");

			responder($consulta->fetchAll(PDO::FETCH_COLUMN));
			break;

		case "tabla":
			validarTabla($db, $tabla);
			$estructura = estructuraTabla($db, $tabla);
			$contenido = $db->query(
				"SELECT * FROM " . identificador($tabla) .
				" ORDER BY " . identificador("Identificador") . " DESC"
			)->fetchAll(PDO::FETCH_ASSOC);

			responder([
				"tabla" => $tabla,
				"estructura" => $estructura,
				"contenido" => $contenido
			]);
			break;

		case "registro":
			validarTabla($db, $tabla);
			$identificadorRegistro = validarIdentificador(
				$_GET["identificador"] ?? ""
			);

			responder([
				"tabla" => $tabla,
				"estructura" => estructuraTabla($db, $tabla),
				"registro" => obtenerRegistro($db, $tabla, $identificadorRegistro)
			]);
			break;

		case "insertar":
			exigirPost();
			validarTabla($db, $tabla);
			$campos = camposEditables(estructuraTabla($db, $tabla));
			$nombres = [];
			$marcadores = [];
			$valores = [];

			foreach($campos as $indice => $campo){
				$nombres[] = identificador($campo["name"]);
				$marcador = ":campo" . $indice;
				$marcadores[] = $marcador;
				$valor = $_POST[$campo["name"]] ?? null;
				$valores[$marcador] = $valor === "" ? null : $valor;
			}

			if(count($nombres) == 0){
				throw new Exception("La tabla no contiene campos editables");
			}

			$consulta = $db->prepare(
				"INSERT INTO " . identificador($tabla) .
				" (" . implode(", ", $nombres) . ")" .
				" VALUES (" . implode(", ", $marcadores) . ")"
			);
			$consulta->execute($valores);

			responder([
				"correcto" => true,
				"mensaje" => "Registro insertado correctamente",
				"identificador" => (int)$db->lastInsertId()
			], 201);
			break;

		case "actualizar":
			exigirPost();
			validarTabla($db, $tabla);
			$identificadorRegistro = validarIdentificador(
				$_GET["identificador"] ?? ""
			);
			obtenerRegistro($db, $tabla, $identificadorRegistro);
			$campos = camposEditables(estructuraTabla($db, $tabla));
			$asignaciones = [];
			$valores = [
				":identificador" => $identificadorRegistro
			];

			foreach($campos as $indice => $campo){
				$marcador = ":campo" . $indice;
				$asignaciones[] = identificador($campo["name"]) . " = " . $marcador;
				$valor = $_POST[$campo["name"]] ?? null;
				$valores[$marcador] = $valor === "" ? null : $valor;
			}

			if(count($asignaciones) == 0){
				throw new Exception("La tabla no contiene campos editables");
			}

			$consulta = $db->prepare(
				"UPDATE " . identificador($tabla) .
				" SET " . implode(", ", $asignaciones) .
				" WHERE " . identificador("Identificador") . " = :identificador"
			);
			$consulta->execute($valores);

			responder([
				"correcto" => true,
				"mensaje" => "Registro actualizado correctamente"
			]);
			break;

		case "eliminar":
			exigirPost();
			validarTabla($db, $tabla);
			$identificadorRegistro = validarIdentificador(
				$_GET["identificador"] ?? ""
			);
			obtenerRegistro($db, $tabla, $identificadorRegistro);

			$consulta = $db->prepare(
				"DELETE FROM " . identificador($tabla) .
				" WHERE " . identificador("Identificador") . " = :identificador"
			);
			$consulta->execute([
				":identificador" => $identificadorRegistro
			]);

			responder([
				"correcto" => true,
				"mensaje" => "Registro eliminado correctamente"
			]);
			break;

		default:
			responder([
				"error" => "Bloque no válido"
			], 400);
	}

}catch(Throwable $error){
	responder([
		"error" => "Se ha producido un error",
		"debug" => $error->getMessage()
	], 500);
}
?>
