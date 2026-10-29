<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/conectores/php/003-conector_php.php';

header('Content-Type: text/plain; charset=utf-8');
$raiz = dirname(__DIR__, 2);
$origen = $raiz . '/datos/Erin-erp';
if (!is_dir($origen)) {
    throw new RuntimeException('Falta datos/Erin-erp en la version 003.');
}

$temporal = sys_get_temp_dir() . '/unicorn_erp_php_' . bin2hex(random_bytes(8));
$datos = $temporal . '/datos';
$copia = $datos . '/Erin-erp';
if (!mkdir($copia, 0777, true)) {
    throw new RuntimeException('No se pudo crear la copia temporal.');
}

try {
    $archivos = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($origen, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::SELF_FIRST
    );
    foreach ($archivos as $archivo) {
        $destino = $copia . '/' . substr($archivo->getPathname(), strlen($origen) + 1);
        if ($archivo->isDir()) {
            if (!mkdir($destino) && !is_dir($destino)) throw new RuntimeException('No se pudo copiar una carpeta.');
        } elseif (!copy($archivo->getPathname(), $destino)) {
            throw new RuntimeException('No se pudo copiar: ' . $archivo->getFilename());
        }
    }
    file_put_contents($temporal . '/config.json', json_encode([
        'instalacion' => str_replace('\\', '/', $datos),
        'tamanoRegistro' => 512,
    ], JSON_THROW_ON_ERROR));

    $bd = new UnicornBBDD($temporal . '/config.json');
    if (!$bd->usarBase('Erin-erp')) throw new RuntimeException('No se pudo abrir Erin-erp.');

    echo "Clientes:\n";
    print_r($bd->consultar('SELECCIONAR id,nombre,email DE clientes LIMITE 3'));
    echo "Productos:\n";
    print_r($bd->consultar('SELECCIONAR id,nombre,precio DE productos LIMITE 3'));
    echo "Pedidos con su cliente:\n";
    print_r($bd->consultar(
        'SELECCIONAR clientes.nombre,pedidos.total ' .
        'DE clientes JOIN pedidos EN clientes.id = pedidos.cliente_id LIMITE 3'
    ));
    echo "Resumen de pedidos:\n";
    print_r($bd->consultar(
        'SELECCIONAR CONTAR(*) COMO numero_pedidos,SUMA(total) COMO facturacion DE pedidos'
    ));

    $clienteId = $bd->insertar('clientes', ['1', 'Cliente Ejemplo PHP', 'ejemplo.php@clientes-ejemplo.test', '600000333']);
    echo "Cliente creado: $clienteId\n";
    if ($bd->actualizarDonde('clientes', 'telefono', '600111333', 'id', (string)$clienteId) !== 1) {
        throw new RuntimeException('No se pudo actualizar el cliente.');
    }
    print_r($bd->consultar("SELECCIONAR id,nombre,telefono DE clientes DONDE id = $clienteId"));

    $temporalId = $bd->insertar('clientes', ['1', 'Cliente Temporal PHP', 'temporal.php@clientes-ejemplo.test', '600222333']);
    if ($bd->eliminarDonde('clientes', 'id', (string)$temporalId) !== 1) {
        throw new RuntimeException('No se pudo dar de baja el cliente temporal.');
    }
    echo "Cliente temporal dado de baja: $temporalId\n";

    if (!$bd->iniciarTransaccion()) throw new RuntimeException('No se pudo iniciar la transaccion.');
    try {
        $pedidoId = $bd->insertar('pedidos', ['1', (string)$clienteId, '2026-10-12', 'pendiente', '49.90']);
        $bd->insertar('pedidos_lineas', [(string)$pedidoId, '1', '1', '49.90']);
        if (!$bd->confirmar()) throw new RuntimeException('No se pudo confirmar el pedido.');
    } catch (Throwable $error) {
        $bd->deshacer();
        throw $error;
    }
    echo "Pedido y linea confirmados: $pedidoId\n";

    if (!$bd->iniciarTransaccion()) throw new RuntimeException('No se pudo iniciar la transaccion de ejemplo.');
    $bd->insertar('clientes', ['1', 'Cliente Revertido PHP', 'revertido.php@clientes-ejemplo.test', '600333333']);
    if (!$bd->deshacer()) throw new RuntimeException('No se pudo deshacer la transaccion.');
    echo "Cliente revertido:\n";
    print_r($bd->consultar("SELECCIONAR id,nombre DE clientes DONDE email = 'revertido.php@clientes-ejemplo.test'"));

    $procedimiento = 'pedidos_de_cliente_demo_php';
    if (!$bd->crearProcedimiento($procedimiento, ['cliente'],
        'SELECCIONAR id,total DE pedidos DONDE cliente_id = {cliente}')) {
        throw new RuntimeException('No se pudo crear el procedimiento.');
    }
    echo "Procedimiento:\n";
    print_r($bd->ejecutarProcedimiento($procedimiento, [(string)$clienteId]));
    echo "La copia temporal se elimina al terminar; la base original no cambia.\n";
} finally {
    $bd = null; // Cierra la conexion nativa antes de borrar la copia.
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
