<?php
header("Content-Type: application/json; charset=utf-8");

function identificador($texto){
	return '"' . str_replace('"', '""', $texto) . '"';
}

try{
	$baseDatos = dirname(__DIR__) . "/data/erin.sqlite";

	if(!file_exists($baseDatos)){
		throw new Exception("No existe la base de datos SQLite");
	}

	$db = new PDO("sqlite:" . $baseDatos);
	$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
	$db->exec("PRAGMA foreign_keys = ON");

	switch($_GET["bloque"] ?? ""){
		case "menu":
			$consulta = $db->query("
				SELECT name
				FROM sqlite_master
				WHERE type = 'table'
				AND name NOT LIKE 'sqlite_%'
				ORDER BY name
			");

			echo json_encode(
				$consulta->fetchAll(PDO::FETCH_COLUMN),
				JSON_UNESCAPED_UNICODE
			);
			break;

		case "tabla":
			$tabla = $_GET["tabla"] ?? "";

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

			$estructura = $db->query(
				"PRAGMA table_info(" . identificador($tabla) . ")"
			)->fetchAll(PDO::FETCH_ASSOC);

			$contenido = $db->query(
				"SELECT * FROM " . identificador($tabla)
			)->fetchAll(PDO::FETCH_ASSOC);

			echo json_encode([
				"tabla" => $tabla,
				"estructura" => $estructura,
				"contenido" => $contenido
			], JSON_UNESCAPED_UNICODE);
			break;

		default:
			http_response_code(400);
			echo json_encode([
				"error" => "Bloque no válido"
			], JSON_UNESCAPED_UNICODE);
	}

}catch(Exception $error){
	http_response_code(500);
	echo json_encode([
		"error" => "Se ha producido un error",
		"debug" => $error->getMessage()
	], JSON_UNESCAPED_UNICODE);
}
?>
