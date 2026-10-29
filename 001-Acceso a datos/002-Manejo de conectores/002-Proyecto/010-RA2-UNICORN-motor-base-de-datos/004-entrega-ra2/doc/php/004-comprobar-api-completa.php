<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/conectores/php/004-conector_php.php';

header('Content-Type: text/plain; charset=utf-8');

function asegurar(bool $condicion, string $mensaje): void
{
    if (!$condicion) throw new RuntimeException($mensaje);
}

$temporal = dirname(__DIR__, 2) . '/datos/.prueba_api_php_' . bin2hex(random_bytes(8));
$datos = $temporal . '/datos';
if (!mkdir($datos, 0777, true)) throw new RuntimeException('No se pudo crear el entorno temporal.');
file_put_contents($temporal . '/config.json', json_encode([
    'instalacion' => str_replace('\\', '/', $datos),
    'tamanoRegistro' => 512,
], JSON_THROW_ON_ERROR));

try {
    $bd = new UnicornBBDD($temporal . '/config.json');
    asegurar($bd->configuracion()['tamanoRegistro'] === 512, 'Configuración incorrecta.');
    asegurar($bd->listarBases() === [], 'La instalación temporal no está vacía.');
    asegurar($bd->crearBase('prueba_php'), 'No se creó la base.');
    asegurar(in_array('prueba_php', $bd->listarBases(), true), 'La base no aparece en el listado.');
    asegurar($bd->usarBase('prueba_php'), 'No se seleccionó la base.');

    asegurar($bd->crearTablaTipada('familias', ['nombre' => 'TEXTO']), 'No se creó familias.');
    asegurar($bd->crearTablaTipada('productos', [
        'familia_id' => 'ENTERO', 'nombre' => 'TEXTO', 'precio' => 'DECIMAL'
    ]), 'No se creó productos.');
    asegurar($bd->crearTablaTipada('productos_copia', [
        'familia_id' => 'ENTERO', 'nombre' => 'TEXTO', 'precio' => 'DECIMAL'
    ]), 'No se creó productos_copia.');
    asegurar($bd->crearTabla('eventos', 'nombre'), 'No se creó la tabla sin tipos explícitos.');
    asegurar($bd->listarTablas() === ['eventos', 'familias', 'productos', 'productos_copia'], 'Listado de tablas incorrecto.');
    asegurar($bd->esquema('productos') === ['id', 'activo', 'familia_id', 'nombre', 'precio'], 'Esquema incorrecto.');
    asegurar($bd->tipos('productos')['precio'] === 'DECIMAL', 'Tipo incorrecto.');
    asegurar($bd->clavePrimaria('productos') === 'id', 'Clave primaria incorrecta.');

    asegurar($bd->anadirClaveForanea('productos', 'familia_id', 'familias'), 'No se añadió la FK.');
    asegurar($bd->establecerNoNulo('productos', 'nombre'), 'No se añadió NO NULO.');
    asegurar($bd->establecerUnico('productos', 'nombre'), 'No se añadió UNICO.');
    asegurar($bd->establecerPorDefecto('productos', 'precio', '0'), 'No se añadió POR DEFECTO.');
    asegurar($bd->clavesForaneas('productos')[0]['tabla'] === 'familias', 'FK incorrecta.');
    $restricciones = $bd->restricciones('productos', 'nombre');
    asegurar($restricciones['noNulo'] && $restricciones['unico'], 'Restricciones incorrectas.');

    $familia = $bd->insertarColumnas('familias', ['nombre'], ['Informática']);
    $producto = $bd->insertarColumnas('productos', ['familia_id', 'nombre'], [(string)$familia, 'Teclado']);
    asegurar($bd->seleccionar('productos', $producto)['nombre'] === 'Teclado', 'Selección incorrecta.');
    asegurar(count($bd->listar('productos')) === 1, 'Listado de registros incorrecto.');
    asegurar(count($bd->buscar('productos', 'nombre', 'Teclado')) === 1, 'Búsqueda incorrecta.');
    asegurar($bd->actualizarCampos('productos', ['nombre' => 'Teclado mecánico', 'precio' => '49.90'], 'id', (string)$producto) === 1, 'Actualización múltiple incorrecta.');
    asegurar($bd->actualizarDonde('productos', 'precio', '45.00', 'id', (string)$producto) === 1, 'Actualización de un campo incorrecta.');
    asegurar($bd->actualizar('productos', $producto, [(string)$familia, 'Teclado mecánico', '49.90']), 'Actualización por identificador incorrecta.');
    asegurar($bd->consultar('SELECCIONAR nombre,precio DE productos DONDE id = ' . $producto)[0]['precio'] === '49.90', 'Consulta incorrecta.');
    asegurar($bd->explicar('SELECCIONAR nombre DE productos') !== '', 'Explicación de consulta vacía.');

    $evento = $bd->insertar('eventos', ['Presentación']);
    asegurar($evento > 0, 'Inserción posicional incorrecta.');
    asegurar($bd->eliminarDonde('eventos', 'id', (string)$evento) === 1, 'Eliminación condicional incorrecta.');

    asegurar($bd->crearIndice('idx_producto_nombre', 'productos', 'nombre'), 'No se creó el índice.');
    asegurar(in_array('idx_producto_nombre', $bd->listarIndices(), true), 'El índice no aparece en el listado global.');
    asegurar(in_array('idx_producto_nombre', $bd->indices('productos'), true), 'El índice no aparece en su tabla.');
    asegurar($bd->eliminarIndice('idx_producto_nombre', 'productos'), 'No se eliminó el índice.');

    asegurar($bd->iniciarTransaccion(), 'No se inició la transacción.');
    $bd->insertarColumnas('familias', ['nombre'], ['Temporal']);
    asegurar($bd->deshacer(), 'No se deshizo la transacción.');
    asegurar(count($bd->buscar('familias', 'nombre', 'Temporal')) === 0, 'La transacción no se deshizo.');
    asegurar($bd->iniciarTransaccion(), 'No se inició la segunda transacción.');
    $bd->insertarColumnas('familias', ['nombre'], ['Confirmada']);
    asegurar($bd->confirmar(), 'No se confirmó la transacción.');
    asegurar(count($bd->buscar('familias', 'nombre', 'Confirmada')) === 1, 'La transacción no se confirmó.');

    asegurar($bd->crearVista('productos_activos', 'SELECCIONAR id,nombre DE productos'), 'No se creó la vista.');
    asegurar(in_array('productos_activos', $bd->listarVistas(), true), 'La vista no aparece.');
    asegurar($bd->eliminarVista('productos_activos'), 'No se eliminó la vista.');
    asegurar($bd->crearProcedimiento('buscar_producto', ['producto'], 'SELECCIONAR id,nombre DE productos DONDE id = {producto}'), 'No se creó el procedimiento.');
    asegurar(in_array('buscar_producto', $bd->listarProcedimientos(), true), 'El procedimiento no aparece.');
    asegurar(count($bd->ejecutarProcedimiento('buscar_producto', [(string)$producto])['filas']) === 1, 'Procedimiento incorrecto.');
    asegurar($bd->eliminarProcedimiento('buscar_producto'), 'No se eliminó el procedimiento.');

    asegurar($bd->insertarDesde('productos_copia', 'productos') === 1, 'Inserción desde tabla incorrecta.');
    asegurar($bd->alterarAnadirColumna('productos_copia', 'observaciones'), 'No se añadió la columna.');
    asegurar($bd->alterarRenombrarColumna('productos_copia', 'observaciones', 'notas'), 'No se renombró la columna.');
    asegurar($bd->alterarEliminarColumna('productos_copia', 'notas'), 'No se eliminó la columna.');
    asegurar($bd->alterarRenombrarTabla('productos_copia', 'copia_productos'), 'No se renombró la tabla.');
    asegurar($bd->compactar('productos'), 'No se compactó la tabla.');
    asegurar($bd->eliminar('productos', $producto), 'No se hizo el borrado lógico.');
    asegurar($bd->truncarTabla('copia_productos'), 'No se truncó la tabla.');
    asegurar($bd->eliminarTabla('copia_productos'), 'No se eliminó la tabla.');

    $bd = null;
    $bd = new UnicornBBDD($temporal . '/config.json');
    asegurar($bd->eliminarBase('prueba_php'), 'No se eliminó la base.');
    echo "API PHP COMPLETA: CORRECTA\n";
} finally {
    $bd = null;
    if (is_dir($temporal)) {
        $archivos = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($temporal, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($archivos as $archivo) {
            if ($archivo->isDir()) rmdir($archivo->getPathname());
            else unlink($archivo->getPathname());
        }
        rmdir($temporal);
    }
}
