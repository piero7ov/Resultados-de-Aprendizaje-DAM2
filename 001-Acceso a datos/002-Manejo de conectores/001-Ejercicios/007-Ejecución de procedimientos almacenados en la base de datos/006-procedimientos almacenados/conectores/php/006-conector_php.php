<?php
declare(strict_types=1);

final class PierodevBBDD
{
    private FFI $biblioteca;
    private FFI\CData $conexion;

    public function __construct(string $configuracion, ?string $rutaBiblioteca = null)
    {
        if (!extension_loaded('FFI')) {
            throw new RuntimeException('Activa la extension FFI de PHP para usar el conector.');
        }
        $rutaBiblioteca ??= dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'pierodevbbdd.dll';
        if (!is_file($rutaBiblioteca)) {
            throw new RuntimeException('No se encuentra la biblioteca: ' . $rutaBiblioteca);
        }
        // FFI en Windows no carga de forma fiable una DLL desde rutas con caracteres Unicode.
        $copiaAscii = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'pierodevbbdd-' . substr(hash_file('sha256', $rutaBiblioteca), 0, 16) . '.dll';
        if (!is_file($copiaAscii) && !copy($rutaBiblioteca, $copiaAscii)) {
            throw new RuntimeException('No se ha podido preparar la DLL para PHP.');
        }
        $declaraciones = <<<'C'
            typedef struct ConexionPHP ConexionPHP;
            ConexionPHP* pierodev_abrir(const char* configuracion);
            void pierodev_cerrar(ConexionPHP* conexion);
            const char* pierodev_error(ConexionPHP* conexion);
            void pierodev_liberar(char* texto);
            int pierodev_crear_base(ConexionPHP* conexion, const char* nombre);
            int pierodev_usar_base(ConexionPHP* conexion, const char* nombre);
            int pierodev_crear_tabla(ConexionPHP* conexion, const char* nombre, const char* esquema);
            long long pierodev_insertar(ConexionPHP* conexion, const char* tabla, const char* const* valores, size_t cantidad);
            char* pierodev_consultar(ConexionPHP* conexion, const char* consulta);
            int pierodev_crear_procedimiento(ConexionPHP* conexion, const char* nombre, const char* const* parametros, size_t cantidad, const char* cuerpo);
            char* pierodev_listar_procedimientos(ConexionPHP* conexion);
            int pierodev_eliminar_procedimiento(ConexionPHP* conexion, const char* nombre);
            char* pierodev_ejecutar_procedimiento(ConexionPHP* conexion, const char* nombre, const char* const* argumentos, size_t cantidad);
            C;
        $this->biblioteca = FFI::cdef($declaraciones, $copiaAscii);
        $this->conexion = $this->biblioteca->pierodev_abrir($configuracion);
        if (FFI::isNull($this->conexion)) {
            throw new RuntimeException(FFI::string($this->biblioteca->pierodev_error(null)));
        }
    }

    public function __destruct()
    {
        if (isset($this->conexion) && !FFI::isNull($this->conexion)) {
            $this->biblioteca->pierodev_cerrar($this->conexion);
        }
    }

    private function comprobar(int $resultado): bool
    {
        if ($resultado < 0) {
            throw new RuntimeException(FFI::string($this->biblioteca->pierodev_error($this->conexion)));
        }
        return $resultado === 1;
    }

    private function leerJson(FFI\CData $puntero): array
    {
        if (FFI::isNull($puntero)) {
            throw new RuntimeException(FFI::string($this->biblioteca->pierodev_error($this->conexion)));
        }
        try {
            return json_decode(FFI::string($puntero), true, 512, JSON_THROW_ON_ERROR);
        } finally {
            $this->biblioteca->pierodev_liberar($puntero);
        }
    }

    private function prepararLista(array $valores): array
    {
        $cantidad = count($valores);
        $punteros = FFI::new('const char*[' . max(1, $cantidad) . ']');
        $cadenas = [];
        foreach (array_values($valores) as $indice => $valor) {
            if (!is_string($valor)) {
                throw new InvalidArgumentException('Todos los valores deben ser cadenas.');
            }
            $cadenas[$indice] = FFI::new('char[' . (strlen($valor) + 1) . ']');
            FFI::memcpy($cadenas[$indice], $valor, strlen($valor));
            $punteros[$indice] = FFI::cast('char*', $cadenas[$indice]);
        }
        return [$punteros, $cadenas, $cantidad];
    }

    public function crearBase(string $nombre): bool
    {
        return $this->comprobar($this->biblioteca->pierodev_crear_base($this->conexion, $nombre));
    }

    public function usarBase(string $nombre): bool
    {
        return $this->comprobar($this->biblioteca->pierodev_usar_base($this->conexion, $nombre));
    }

    public function crearTabla(string $nombre, string $esquema): bool
    {
        return $this->comprobar($this->biblioteca->pierodev_crear_tabla($this->conexion, $nombre, $esquema));
    }

    public function insertar(string $tabla, array $valores): int
    {
        [$punteros, $cadenas, $cantidad] = $this->prepararLista($valores);
        $resultado = $this->biblioteca->pierodev_insertar($this->conexion, $tabla, $punteros, $cantidad);
        if ($resultado < 0) {
            throw new RuntimeException(FFI::string($this->biblioteca->pierodev_error($this->conexion)));
        }
        return $resultado;
    }

    public function consultar(string $consulta): array
    {
        return $this->leerJson($this->biblioteca->pierodev_consultar($this->conexion, $consulta));
    }

    public function crearProcedimiento(string $nombre, array $parametros, string $cuerpo): bool
    {
        [$punteros, $cadenas, $cantidad] = $this->prepararLista($parametros);
        return $this->comprobar($this->biblioteca->pierodev_crear_procedimiento(
            $this->conexion, $nombre, $punteros, $cantidad, $cuerpo
        ));
    }

    public function ejecutarProcedimiento(string $nombre, array $argumentos): array
    {
        [$punteros, $cadenas, $cantidad] = $this->prepararLista($argumentos);
        return $this->leerJson($this->biblioteca->pierodev_ejecutar_procedimiento(
            $this->conexion, $nombre, $punteros, $cantidad
        ));
    }

    public function listarProcedimientos(): array
    {
        return $this->leerJson($this->biblioteca->pierodev_listar_procedimientos($this->conexion));
    }

    public function eliminarProcedimiento(string $nombre): bool
    {
        return $this->comprobar($this->biblioteca->pierodev_eliminar_procedimiento($this->conexion, $nombre));
    }
}
