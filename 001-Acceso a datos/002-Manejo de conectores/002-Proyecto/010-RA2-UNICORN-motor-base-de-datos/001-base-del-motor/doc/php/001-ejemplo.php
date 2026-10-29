<?php
declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/conectores/php/001-conector_php.php';

// La demostración usa una carpeta temporal y no modifica las bases instaladas.
$carpeta = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'unicorn_php_' . bin2hex(random_bytes(4));
$datos = $carpeta . DIRECTORY_SEPARATOR . 'datos';
mkdir($datos, 0777, true);
$configuracion = $carpeta . DIRECTORY_SEPARATOR . 'config.json';
file_put_contents($configuracion, json_encode([
    'instalacion' => str_replace('\\', '/', $datos),
    'tamanoRegistro' => 512,
], JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES));

$bd = new UnicornBBDD($configuracion);
$bd->crearBase('tienda');
$bd->usarBase('tienda');
$bd->crearTabla('productos', 'nombre,precio');
$bd->insertar('productos', ['Teclado', '25']);
$bd->insertar('productos', ['Monitor', '180']);

$bd->crearProcedimiento(
    'productos_caros',
    ['precio_minimo'],
    'SELECCIONAR nombre,precio DE productos DONDE precio > {precio_minimo}'
);

echo "Consulta: \n";
print_r($bd->consultar('SELECCIONAR * DE productos'));
echo "Procedimiento: \n";
print_r($bd->ejecutarProcedimiento('productos_caros', ['30']));
echo "Procedimientos disponibles: \n";
print_r($bd->listarProcedimientos());
echo "Datos de demostración: $carpeta\n";
