<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/instalacion/modelo.php';
require_once dirname(__DIR__) . '/nucleo/autenticacion.php';

function asegurar(bool $condicion, string $mensaje): void
{
    if(!$condicion){ throw new RuntimeException($mensaje); }
}

$datos = new ErinDatos('erin_prueba_027');
try{
    if($datos->instalado()){ $datos->eliminarBase(); }
    $datos->crearBase();
    $diagrama = leerDiagrama(dirname(__DIR__) . '/instalacion/presets/pequena/diagrama.json');
    crearModeloUnicorn($datos, $diagrama);
    crearTablasAcceso($datos);
    registrarVersionErin($datos);
    $administrador = $datos->insertar('erin_usuarios', [
        'nombre'=>'Prueba', 'usuario'=>'prueba027', 'email'=>'prueba@example.test',
        'clave'=>password_hash('prueba-segura', PASSWORD_DEFAULT), 'administrador'=>1, 'activo'=>1
    ]);
    $cantidad = importarDatosDemostracion(
        $datos,
        dirname(__DIR__) . '/instalacion/presets/pequena/datos-demostracion.sql',
        $diagrama
    );
    asegurar(count($datos->tablas(false)) === 12, 'El preset pequeño no ha creado sus 12 tablas.');
    asegurar($cantidad === 77, 'No se han importado los 77 registros de demostración.');
    asegurar(count($datos->listar('productos')) === 10, 'La tabla productos no contiene 10 registros.');
    $nuevo = $datos->insertar('categorias', ['empresa_id'=>1, 'nombre'=>'Prueba 027']);
    $datos->actualizar('categorias', $nuevo, ['nombre'=>'Prueba actualizada']);
    asegurar(($datos->obtener('categorias', $nuevo)['nombre'] ?? '') === 'Prueba actualizada', 'La actualización no se ha conservado.');
    $datos->eliminar('categorias', $nuevo);
    asegurar($datos->obtener('categorias', $nuevo) === null, 'La baja lógica no oculta el registro.');
    asegurar(($datos->obtener('erin_usuarios', $administrador)['activo'] ?? '0') === '1', 'El campo de negocio activo no se ha traducido correctamente.');

    $datos->eliminarBase();
    $datos->crearBase();
    $completo = leerDiagrama(dirname(__DIR__) . '/instalacion/presets/completo/diagrama.json');
    crearModeloUnicorn($datos, $completo);
    $cantidadCompleta = importarDatosDemostracion(
        $datos,
        dirname(__DIR__) . '/instalacion/datos-demostracion.sql',
        $completo
    );
    asegurar(count($datos->tablas(false)) === 80, 'El preset completo no ha creado sus 80 tablas.');
    asegurar($cantidadCompleta > 80, 'El preset completo no ha cargado sus datos.');
    echo "INTEGRACION ERIN 027: CORRECTA\n";
}finally{
    if($datos->instalado()){ $datos->eliminarBase(); }
}

