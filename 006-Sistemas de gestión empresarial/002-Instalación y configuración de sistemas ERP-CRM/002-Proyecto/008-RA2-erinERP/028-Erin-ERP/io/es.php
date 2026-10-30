<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once dirname(__DIR__) . '/nucleo/datos/ErinDatos.php';

class ErrorApi extends RuntimeException{
  private $codigoHttp;
  public function __construct($mensaje, $codigoHttp = 400){ parent::__construct($mensaje); $this->codigoHttp = $codigoHttp; }
  public function codigoHttp(){ return $this->codigoHttp; }
}
function responderApi($datos, $codigo = 200){ http_response_code($codigo); echo json_encode($datos, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit; }
function obtenerClaveApi(){
  $clave = getenv('ERIN_API_KEY');
  if($clave !== false && trim($clave) !== ''){ return trim($clave); }
  $archivo = __DIR__ . '/.env';
  if(!is_file($archivo)){ throw new ErrorApi('La API no está configurada', 503); }
  $configuracion = parse_ini_file($archivo, false, INI_SCANNER_RAW);
  if(!is_array($configuracion) || trim($configuracion['ERIN_API_KEY'] ?? '') === ''){ throw new ErrorApi('La API no está configurada', 503); }
  return trim($configuracion['ERIN_API_KEY']);
}
function claveRecibida(){
  if(isset($_SERVER['HTTP_X_API_KEY'])){ return trim($_SERVER['HTTP_X_API_KEY']); }
  if(preg_match('/^Bearer\s+(.+)$/i', $_SERVER['HTTP_AUTHORIZATION'] ?? '', $coincidencias)){ return trim($coincidencias[1]); }
  return '';
}
function leerJson(){
  $contenido = file_get_contents('php://input');
  if($contenido === false || trim($contenido) === ''){ throw new ErrorApi('Envía un cuerpo JSON'); }
  if(strlen($contenido) > 1048576){ throw new ErrorApi('El cuerpo supera el límite de 1 MB', 413); }
  try{ return json_decode($contenido, true, 512, JSON_THROW_ON_ERROR); }
  catch(JsonException){ throw new ErrorApi('El JSON enviado no es válido'); }
}
function comprobarTabla(ErinDatos $datos, $tabla){
  if($tabla === ''){ throw new ErrorApi('Indica el parámetro tabla'); }
  if(str_starts_with($tabla, 'erin_') || !$datos->existeTabla($tabla)){ throw new ErrorApi('La tabla solicitada no existe o no está disponible', 404); }
  if(strtolower($tabla) === 'usuarios'){ throw new ErrorApi('La tabla usuarios no está disponible en esta API', 403); }
  return array_column($datos->estructura($tabla), 'name');
}
function limpiarRegistro($entrada, $columnas){
  if(!is_array($entrada) || array_is_list($entrada)){ throw new ErrorApi('Cada registro debe ser un objeto JSON'); }
  $limpios = [];
  foreach($entrada as $campo => $valor){
    if($campo === 'Identificador'){ continue; }
    if(!in_array((string)$campo, $columnas, true)){ throw new ErrorApi('El campo indicado no existe en la tabla'); }
    $limpios[$campo] = $valor;
  }
  if(!$limpios){ throw new ErrorApi('El registro no contiene campos para guardar'); }
  return $limpios;
}

$datos = null;
$transaccion = false;
try{
  if(!hash_equals(obtenerClaveApi(), claveRecibida())){ throw new ErrorApi('API key no válida', 401); }
  $accion = strtolower(trim($_GET['accion'] ?? ''));
  $tabla = trim($_GET['tabla'] ?? '');
  if(!in_array($accion, ['selectone','selectmany','insertone','insertmany','updateone','deleteone'], true)){ throw new ErrorApi('Acción no válida'); }
  $metodo = match($accion){ 'selectone','selectmany'=>'GET', 'updateone'=>'PUT', 'deleteone'=>'DELETE', default=>'POST' };
  if(($_SERVER['REQUEST_METHOD'] ?? 'GET') !== $metodo){ throw new ErrorApi("La acción requiere el método $metodo", 405); }
  $datos = new ErinDatos();
  if(!$datos->instalado()){ throw new ErrorApi('ERIN todavía no está instalado', 503); }
  $columnas = comprobarTabla($datos, $tabla);

  if($accion === 'selectone'){
    $id = $_GET['id'] ?? '';
    if(!ctype_digit((string)$id) || (int)$id < 1){ throw new ErrorApi('Indica un id numérico válido'); }
    $registro = $datos->obtener($tabla, (int)$id);
    if(!$registro){ throw new ErrorApi('Registro no encontrado', 404); }
    responderApi(['ok'=>true, 'accion'=>$accion, 'tabla'=>$tabla, 'datos'=>$registro]);
  }
  if($accion === 'selectmany'){
    $campo = trim($_GET['campo'] ?? '');
    if($campo !== '' && !in_array($campo, $columnas, true)){ throw new ErrorApi('El campo de filtro no existe'); }
    $filas = $campo === '' ? $datos->listar($tabla) : $datos->buscar($tabla, $campo, (string)($_GET['valor'] ?? ''));
    usort($filas, fn($a,$b)=>(int)$a['Identificador']<=>(int)$b['Identificador']);
    $limite = filter_var($_GET['limite'] ?? 100, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>500]]);
    $pagina = filter_var($_GET['pagina'] ?? 1, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1]]);
    if($limite === false || $pagina === false){ throw new ErrorApi('Página o límite no válido'); }
    $total = count($filas);
    $filas = array_slice($filas, ($pagina - 1) * $limite, $limite);
    responderApi(['ok'=>true, 'accion'=>$accion, 'tabla'=>$tabla, 'total'=>$total, 'pagina'=>$pagina, 'limite'=>$limite, 'datos'=>$filas]);
  }
  if($accion === 'deleteone'){
    $id = $_GET['id'] ?? '';
    if(!ctype_digit((string)$id) || (int)$id < 1){ throw new ErrorApi('Indica un id numérico válido'); }
    if(!$datos->obtener($tabla, (int)$id)){ throw new ErrorApi('Registro no encontrado', 404); }
    $datos->eliminar($tabla, (int)$id);
    responderApi(['ok'=>true, 'accion'=>$accion, 'tabla'=>$tabla, 'Identificador'=>(int)$id]);
  }
  $contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
  if($contentType !== 'application/json'){ throw new ErrorApi('El Content-Type debe ser application/json', 415); }
  $entrada = leerJson();
  if($accion === 'updateone'){
    $id = $_GET['id'] ?? '';
    if(!ctype_digit((string)$id) || (int)$id < 1){ throw new ErrorApi('Indica un id numérico válido'); }
    if(!$datos->obtener($tabla, (int)$id)){ throw new ErrorApi('Registro no encontrado', 404); }
    $datos->actualizar($tabla, (int)$id, limpiarRegistro($entrada, $columnas));
    responderApi(['ok'=>true, 'accion'=>$accion, 'tabla'=>$tabla, 'Identificador'=>(int)$id]);
  }
  if($accion === 'insertone'){
    $id = $datos->insertar($tabla, limpiarRegistro($entrada, $columnas));
    responderApi(['ok'=>true, 'accion'=>$accion, 'tabla'=>$tabla, 'Identificador'=>$id], 201);
  }
  if(!is_array($entrada) || !array_is_list($entrada) || !$entrada){ throw new ErrorApi('Envía un array JSON con uno o más registros'); }
  if(count($entrada) > 500){ throw new ErrorApi('No se pueden insertar más de 500 registros en una petición', 413); }
  $datos->iniciarTransaccion(); $transaccion = true;
  $ids = [];
  foreach($entrada as $registro){ $ids[] = $datos->insertar($tabla, limpiarRegistro($registro, $columnas)); }
  $datos->confirmar(); $transaccion = false;
  responderApi(['ok'=>true, 'accion'=>$accion, 'tabla'=>$tabla, 'total'=>count($ids), 'Identificadores'=>$ids], 201);
}catch(Throwable $error){
  if($transaccion && $datos instanceof ErinDatos){ try{ $datos->deshacer(); }catch(Throwable){} }
  if($error instanceof ErrorApi){ responderApi(['ok'=>false, 'error'=>$error->getMessage()], $error->codigoHttp()); }
  responderApi(['ok'=>false, 'error'=>'Error interno de la API'], 500);
}

