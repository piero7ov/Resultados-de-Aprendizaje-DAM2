<?php
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

class ErrorApi extends RuntimeException{
	private $codigoHttp;

	public function __construct($mensaje, $codigoHttp = 400){
		parent::__construct($mensaje);
		$this->codigoHttp = $codigoHttp;
	}

	public function codigoHttp(){ return $this->codigoHttp; }
}

function responderApi($datos, $codigo = 200){
	http_response_code($codigo);
	echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	exit;
}

function obtenerClaveApi(){
	$clave = getenv("ERIN_API_KEY");
	if($clave !== false && trim($clave) !== ""){
		return trim($clave);
	}

	$archivoConfiguracion = __DIR__ . "/.env";
	if(!is_file($archivoConfiguracion)){
		throw new ErrorApi("La API no está configurada", 503);
	}

	$configuracion = parse_ini_file($archivoConfiguracion, false, INI_SCANNER_RAW);
	if(!is_array($configuracion) || trim($configuracion["ERIN_API_KEY"] ?? "") === ""){
		throw new ErrorApi("La API no está configurada", 503);
	}

	return trim($configuracion["ERIN_API_KEY"]);
}

function claveRecibida(){
	if(isset($_SERVER["HTTP_X_API_KEY"])){ return trim($_SERVER["HTTP_X_API_KEY"]); }
	$autorizacion = $_SERVER["HTTP_AUTHORIZATION"] ?? "";
	if(preg_match('/^Bearer\s+(.+)$/i', $autorizacion, $coincidencias)){
		return trim($coincidencias[1]);
	}
	return "";
}

function identificarSQL($texto){
	return '"' . str_replace('"', '""', $texto) . '"';
}

function leerJson(){
	$contenido = file_get_contents("php://input");
	if($contenido === false || trim($contenido) === ""){
		throw new ErrorApi("Envía un cuerpo JSON");
	}
	if(strlen($contenido) > 1048576){
		throw new ErrorApi("El cuerpo supera el límite de 1 MB", 413);
	}
	$datos = json_decode($contenido, true);
	if(json_last_error() !== JSON_ERROR_NONE){
		throw new ErrorApi("El JSON enviado no es válido");
	}
	return $datos;
}

function comprobarTabla($db, $tabla){
	if($tabla === ""){
		throw new ErrorApi("Indica el parámetro tabla");
	}
	$consulta = $db->prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = :tabla AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'erin_%'");
	$consulta->execute([":tabla" => $tabla]);
	if(!$consulta->fetchColumn()){
		throw new ErrorApi("La tabla solicitada no existe o no está disponible", 404);
	}
	if(strtolower($tabla) === "usuarios"){
		throw new ErrorApi("La tabla usuarios no está disponible en esta API", 403);
	}
	$columnas = $db->query("PRAGMA table_info(" . identificarSQL($tabla) . ")")->fetchAll(PDO::FETCH_ASSOC);
	if(!$columnas){
		throw new ErrorApi("La tabla solicitada no está disponible", 404);
	}
	return array_column($columnas, "name");
}

function limpiarRegistro($datos, $columnas){
	if(!is_array($datos) || array_is_list($datos)){
		throw new ErrorApi("Cada registro debe ser un objeto JSON");
	}
	$limpios = [];
	foreach($datos as $campo => $valor){
		if($campo === "Identificador"){
			continue;
		}
		if(!in_array((string)$campo, $columnas, true)){
			throw new ErrorApi("El campo indicado no existe en la tabla");
		}
		$limpios[$campo] = $valor;
	}
	if(!$limpios){
		throw new ErrorApi("El registro no contiene campos para guardar");
	}
	return $limpios;
}

function insertarRegistro($db, $tabla, $datos){
	$campos = array_keys($datos);
	$nombres = array_map("identificarSQL", $campos);
	$marcadores = [];
	$valores = [];
	foreach($campos as $indice => $campo){
		$marcador = ":campo" . $indice;
		$marcadores[] = $marcador;
		$valores[$marcador] = $datos[$campo];
	}
	$sql = "INSERT INTO " . identificarSQL($tabla) . " (" . implode(", ", $nombres) . ") VALUES (" . implode(", ", $marcadores) . ")";
	$consulta = $db->prepare($sql);
	$consulta->execute($valores);
	return (int)$db->lastInsertId();
}

try{
	$claveEsperada = obtenerClaveApi();
	if(!hash_equals($claveEsperada, claveRecibida())){
		throw new ErrorApi("API key no válida", 401);
	}

	$accion = strtolower(trim($_GET["accion"] ?? ""));
	$tabla = trim($_GET["tabla"] ?? "");
	$acciones = ["selectone", "selectmany", "insertone", "insertmany"];
	if(!in_array($accion, $acciones, true)){
		throw new ErrorApi("Acción no válida", 400);
	}

	$metodoEsperado = in_array($accion, ["selectone", "selectmany"], true) ? "GET" : "POST";
	if(($_SERVER["REQUEST_METHOD"] ?? "GET") !== $metodoEsperado){
		throw new ErrorApi("La acción requiere el método " . $metodoEsperado, 405);
	}

	$baseDatos = dirname(__DIR__) . "/data/erin.sqlite";
	if(!is_file($baseDatos)){
		throw new ErrorApi("ERIN todavía no está instalado", 503);
	}
	$db = new PDO("sqlite:" . $baseDatos);
	$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
	$db->exec("PRAGMA foreign_keys = ON");
	$columnas = comprobarTabla($db, $tabla);
	if(!in_array("Identificador", $columnas, true)){
		throw new ErrorApi("La tabla no admite estas operaciones", 400);
	}
	$tablaSQL = identificarSQL($tabla);

	if($accion === "selectone"){
		$id = $_GET["id"] ?? "";
		if(!ctype_digit((string)$id) || (int)$id < 1){
			throw new ErrorApi("Indica un id numérico válido");
		}
		$consulta = $db->prepare("SELECT * FROM " . $tablaSQL . " WHERE " . identificarSQL("Identificador") . " = :id LIMIT 1");
		$consulta->execute([":id" => (int)$id]);
		$registro = $consulta->fetch(PDO::FETCH_ASSOC);
		if(!$registro){ throw new ErrorApi("Registro no encontrado", 404); }
		responderApi(["ok"=>true, "accion"=>$accion, "tabla"=>$tabla, "datos"=>$registro]);
	}

	if($accion === "selectmany"){
		$datos = $db->query("SELECT * FROM " . $tablaSQL . " ORDER BY " . identificarSQL("Identificador"))->fetchAll(PDO::FETCH_ASSOC);
		responderApi(["ok"=>true, "accion"=>$accion, "tabla"=>$tabla, "total"=>count($datos), "datos"=>$datos]);
	}

	$contentType = strtolower(trim(explode(";", $_SERVER["CONTENT_TYPE"] ?? "")[0]));
	if($contentType !== "application/json"){
		throw new ErrorApi("El Content-Type debe ser application/json", 415);
	}
	$entrada = leerJson();

	if($accion === "insertone"){
		$datos = limpiarRegistro($entrada, $columnas);
		$id = insertarRegistro($db, $tabla, $datos);
		responderApi(["ok"=>true, "accion"=>$accion, "tabla"=>$tabla, "Identificador"=>$id], 201);
	}

	if(!is_array($entrada) || !array_is_list($entrada) || count($entrada) === 0){
		throw new ErrorApi("Envía un array JSON con uno o más registros");
	}
	if(count($entrada) > 500){
		throw new ErrorApi("No se pueden insertar más de 500 registros en una petición", 413);
	}
	$db->beginTransaction();
	$identificadores = [];
	foreach($entrada as $registro){
		$datos = limpiarRegistro($registro, $columnas);
		$identificadores[] = insertarRegistro($db, $tabla, $datos);
	}
	$db->commit();
	responderApi(["ok"=>true, "accion"=>$accion, "tabla"=>$tabla, "total"=>count($identificadores), "Identificadores"=>$identificadores], 201);
}catch(Throwable $error){
	if(isset($db) && $db instanceof PDO && $db->inTransaction()){
		$db->rollBack();
	}
	if($error instanceof ErrorApi){
		responderApi(["ok"=>false, "error"=>$error->getMessage()], $error->codigoHttp());
	}
	if($error instanceof PDOException){
		$mensaje = $error->getMessage();
		if(str_contains($mensaje, "FOREIGN KEY constraint failed")){
			responderApi(["ok"=>false, "error"=>"La relación indicada no existe"], 400);
		}
		if(str_contains($mensaje, "UNIQUE constraint failed")){
			responderApi(["ok"=>false, "error"=>"El registro duplica un valor que debe ser único"], 409);
		}
	}
	responderApi(["ok"=>false, "error"=>"Error interno de la API"], 500);
}
