<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/conectores/php/002-conector_php.php';

header('Content-Type: text/plain; charset=utf-8');
$raiz = dirname(__DIR__, 2);
chdir($raiz);
$bd = new UnicornBBDD($raiz . '/config.json');
if (!$bd->usarBase('Erin-erp')) {
    throw new RuntimeException('Primero ejecuta scripts/002-cargar_erp.py');
}

$filas = $bd->consultar(
    'SELECCIONAR clientes.nombre,pedidos.total ' .
    'DE clientes JOIN pedidos EN clientes.id = pedidos.cliente_id ' .
    'ORDENAR POR pedidos.id LIMITE 5'
);
echo "Primeros pedidos con su cliente:\n";
print_r($filas);
