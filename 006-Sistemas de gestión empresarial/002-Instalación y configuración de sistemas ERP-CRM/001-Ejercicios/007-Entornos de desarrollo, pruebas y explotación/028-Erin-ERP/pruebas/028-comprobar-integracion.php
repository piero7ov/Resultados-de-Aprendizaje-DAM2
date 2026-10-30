<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/instalacion/migracion.php';

function asegurar(bool $condicion, string $mensaje): void
{
    if(!$condicion){ throw new RuntimeException($mensaje); }
}

$datos = new ErinDatos('erin_prueba_028');
$migrada = null;
$archivosTemporales = [];
try{
    if($datos->instalado()){ $datos->eliminarBase(); }
    $datos->crearBase();
    $diagrama = leerDiagrama(dirname(__DIR__) . '/instalacion/presets/pequena/diagrama.json');
    $modelo = crearModeloUnicorn($datos, $diagrama, false);
    crearTablasAcceso($datos);
    registrarVersionErin($datos);
    $administrador = $datos->insertar('erin_usuarios', [
        'Identificador'=>7, 'nombre'=>'Prueba', 'usuario'=>'prueba028', 'email'=>'prueba@example.test',
        'clave'=>password_hash('prueba-segura', PASSWORD_DEFAULT), 'administrador'=>1, 'activo'=>1
    ]);
    $cantidad = importarDatosDemostracion(
        $datos,
        dirname(__DIR__) . '/instalacion/presets/pequena/datos-demostracion.sql',
        $diagrama,
        false
    );
    crearRelacionesUnicorn($datos, $modelo);
    comprobarIntegridadModelo($datos, $diagrama);

    asegurar(count($datos->tablas(false)) === 12, 'El preset pequeño no ha creado sus 12 tablas.');
    asegurar($cantidad === 77, 'No se han importado los 77 registros de demostración.');
    asegurar(count($datos->listar('productos')) === 10, 'La tabla productos no contiene 10 registros.');
    $restriccionesCodigo = $datos->restricciones('productos', 'codigo');
    asegurar(!empty($restriccionesCodigo['noNulo']) && !empty($restriccionesCodigo['unico']), 'No se han aplicado las restricciones del código de producto.');
    asegurar(in_array('idx_productos_codigo', $datos->indices('productos'), true), 'No se ha creado el índice del código de producto.');
    $pedidoConDefecto = $datos->insertar('pedidos', ['empresa_id'=>1, 'cliente_id'=>1, 'fecha'=>'2026-10-13', 'total'=>10]);
    asegurar(($datos->obtener('pedidos', $pedidoConDefecto)['estado'] ?? '') === 'pendiente', 'No se ha aplicado el valor por defecto declarado.');
    $datos->eliminar('pedidos', $pedidoConDefecto);
    asegurar($administrador === 7, 'No se ha conservado el identificador explícito del administrador.');
    $nuevo = $datos->insertar('categorias', ['empresa_id'=>1, 'nombre'=>'Prueba 028']);
    asegurar($nuevo === 5, 'El siguiente identificador empresarial no es estable.');
    $datos->actualizar('categorias', $nuevo, ['nombre'=>'Prueba actualizada']);
    asegurar(($datos->obtener('categorias', $nuevo)['nombre'] ?? '') === 'Prueba actualizada', 'La actualización no se ha conservado.');
    $datos->eliminar('categorias', $nuevo);
    asegurar($datos->obtener('categorias', $nuevo) === null, 'La baja lógica no oculta el registro.');

    $resultado = migrarBaseErin($datos, $diagrama, false);
    $archivosTemporales = [$resultado['copia'], $resultado['manifiesto']];
    $migrada = new ErinDatos($resultado['nueva']);
    asegurar($migrada->instalado(), 'La migración no ha creado la base validada.');
    asegurar(count($migrada->listar('productos')) === 10, 'La migración no conserva los productos.');
    asegurar(($migrada->obtener('erin_usuarios', 7)['usuario'] ?? '') === 'prueba028', 'La migración no conserva el identificador del usuario.');
    comprobarIntegridadModelo($migrada, $diagrama);
    echo "INTEGRACION ERIN 028: CORRECTA\n";
}finally{
    if($migrada instanceof ErinDatos && $migrada->instalado()){ $migrada->eliminarBase(); }
    if($datos->instalado()){ $datos->eliminarBase(); }
    foreach($archivosTemporales as $archivo){ if(is_file($archivo)){ unlink($archivo); } }
}
