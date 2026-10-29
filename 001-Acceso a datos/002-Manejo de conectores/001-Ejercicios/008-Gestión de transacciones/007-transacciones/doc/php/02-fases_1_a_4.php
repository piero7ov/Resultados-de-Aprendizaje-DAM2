<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/conectores/php/007-conector_php.php';

// Los datos de este ejemplo quedan en una carpeta temporal independiente.
$carpeta = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pierodev_php_007_' . bin2hex(random_bytes(4));
$datos = $carpeta . DIRECTORY_SEPARATOR . 'datos';
mkdir($datos, 0777, true);
$configuracion = $carpeta . DIRECTORY_SEPARATOR . 'config.json';
file_put_contents($configuracion, json_encode([
    'instalacion' => str_replace('\\', '/', $datos),
    'tamanoRegistro' => 512,
], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));

$bd = new PierodevBBDD($configuracion);
$bd->crearBase('comercio');
$bd->usarBase('comercio');
$bd->crearTablaTipada('clientes', [
    'nombre' => 'TEXTO', 'email' => 'TEXTO', 'nacimiento' => 'FECHA', 'saldo' => 'DECIMAL',
]);
$bd->crearTablaTipada('pedidos', ['id_cliente' => 'ENTERO', 'total' => 'DECIMAL']);
$bd->insertar('clientes', ['Ana', 'ana@correo.com', '2026-01-10', '100.25']);
$bd->insertar('clientes', ['Luis', 'luis@correo.com', null, '50.50']);
$bd->insertar('pedidos', ['1', '120.00']);
$bd->insertar('pedidos', ['999', '20.00']);

$consultaEmail = "SELECCIONAR * DE clientes DONDE email = 'ana@correo.com'";
echo "Sin índice:\n", $bd->explicar($consultaEmail), "\n";
$bd->crearIndice('idx_email', 'clientes', 'email');
echo "Índices:\n";
print_r($bd->indices('clientes'));
echo $bd->explicar($consultaEmail), "\n";
echo "Consulta por índice:\n";
print_r($bd->consultar($consultaEmail));
echo "Fecha y NULL:\n";
echo json_encode($bd->consultar('SELECCIONAR nombre,nacimiento,saldo DE clientes'), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), "\n";
foreach (['LEFT', 'RIGHT', 'FULL', 'CROSS'] as $tipo) {
    $consulta = "SELECCIONAR c.nombre,p.total DE clientes c $tipo JOIN pedidos p";
    if ($tipo !== 'CROSS') $consulta .= ' EN c.id = p.id_cliente';
    echo "$tipo JOIN:\n";
    echo json_encode($bd->consultar($consulta), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR), "\n";
}

$bd->iniciarTransaccion();
$bd->insertar('clientes', ['Temporal', 'temp@correo.com', null, '1.00']);
$bd->deshacer();
echo "Tras DESHACER:\n";
print_r($bd->consultar('SELECCIONAR nombre DE clientes'));
$bd->iniciarTransaccion();
$bd->insertar('clientes', ['Confirmado', 'ok@correo.com', null, '1.00']);
$bd->confirmar();
echo "Tras CONFIRMAR:\n";
print_r($bd->consultar('SELECCIONAR nombre DE clientes'));
echo 'Eliminar índice: ', ($bd->eliminarIndice('idx_email', 'clientes') ? 'sí' : 'no'), "\n";
echo "Datos de demostración: $carpeta\n";
