<?php
declare(strict_types=1);

final class UnicornBBDD
{
    private FFI $biblioteca;
    private ?FFI\CData $conexion = null;

    public function __construct(string $configuracion, ?string $rutaBiblioteca = null)
    {
        if (!extension_loaded('FFI')) {
            throw new RuntimeException('Activa la extension FFI de PHP para usar el conector.');
        }
        $rutaBiblioteca ??= dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'bin' . DIRECTORY_SEPARATOR . 'unicornbbdd.dll';
        if (!is_file($rutaBiblioteca)) {
            throw new RuntimeException('No se encuentra la biblioteca: ' . $rutaBiblioteca);
        }
        // FFI en Windows no carga de forma fiable una DLL desde rutas con caracteres Unicode.
        $copiaAscii = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'unicornbbdd-' . substr(hash_file('sha256', $rutaBiblioteca), 0, 16) . '.dll';
        if (!is_file($copiaAscii) && !copy($rutaBiblioteca, $copiaAscii)) {
            throw new RuntimeException('No se ha podido preparar la DLL para PHP.');
        }
        $declaraciones = <<<'C'
            typedef struct ConexionPHP ConexionPHP;
            ConexionPHP* unicorn_abrir(const char* configuracion);
            void unicorn_cerrar(ConexionPHP* conexion);
            const char* unicorn_error(ConexionPHP* conexion);
            void unicorn_liberar(char* texto);
            int unicorn_crear_base(ConexionPHP* conexion, const char* nombre);
            int unicorn_usar_base(ConexionPHP* conexion, const char* nombre);
            char* unicorn_configuracion(ConexionPHP* conexion);
            char* unicorn_listar_bases(ConexionPHP* conexion);
            char* unicorn_listar_tablas(ConexionPHP* conexion);
            int unicorn_crear_tabla(ConexionPHP* conexion, const char* nombre, const char* esquema);
            int unicorn_crear_tabla_tipada(ConexionPHP* conexion, const char* nombre, const char* esquema);
            long long unicorn_insertar(ConexionPHP* conexion, const char* tabla, const char* const* valores, size_t cantidad);
            long long unicorn_insertar_columnas(ConexionPHP* conexion, const char* tabla, const char* const* columnas, size_t cantidadColumnas, const char* const* valores, size_t cantidadValores);
            long long unicorn_insertar_desde(ConexionPHP* conexion, const char* destino, const char* origen);
            char* unicorn_seleccionar(ConexionPHP* conexion, const char* tabla, long long id);
            char* unicorn_listar(ConexionPHP* conexion, const char* tabla);
            char* unicorn_buscar(ConexionPHP* conexion, const char* tabla, const char* columna, const char* valor);
            int unicorn_actualizar(ConexionPHP* conexion, const char* tabla, long long id, const char* const* valores, size_t cantidad);
            int unicorn_eliminar(ConexionPHP* conexion, const char* tabla, long long id);
            char* unicorn_consultar(ConexionPHP* conexion, const char* consulta);
            char* unicorn_explicar(ConexionPHP* conexion, const char* consulta);
            int unicorn_crear_indice(ConexionPHP* conexion, const char* nombre, const char* tabla, const char* columna);
            char* unicorn_indices(ConexionPHP* conexion, const char* tabla);
            char* unicorn_listar_indices(ConexionPHP* conexion);
            int unicorn_eliminar_indice(ConexionPHP* conexion, const char* nombre);
            int unicorn_eliminar_indice_tabla(ConexionPHP* conexion, const char* nombre, const char* tabla);
            int unicorn_iniciar_transaccion(ConexionPHP* conexion);
            int unicorn_confirmar(ConexionPHP* conexion);
            int unicorn_deshacer(ConexionPHP* conexion);
            long long unicorn_actualizar_donde(ConexionPHP* conexion, const char* tabla, const char* columna, const char* valor, const char* columnaDonde, const char* valorDonde);
            long long unicorn_actualizar_campos(ConexionPHP* conexion, const char* tabla, const char* const* columnas, const char* const* valores, size_t cantidad, const char* columnaDonde, const char* valorDonde);
            long long unicorn_eliminar_donde(ConexionPHP* conexion, const char* tabla, const char* columnaDonde, const char* valorDonde);
            int unicorn_anadir_fk(ConexionPHP* conexion, const char* tabla, const char* columna, const char* referenciada, const char* columnaReferenciada);
            char* unicorn_esquema(ConexionPHP* conexion, const char* tabla);
            char* unicorn_tipos(ConexionPHP* conexion, const char* tabla);
            char* unicorn_clave_primaria(ConexionPHP* conexion, const char* tabla);
            char* unicorn_claves_foraneas(ConexionPHP* conexion, const char* tabla);
            char* unicorn_restricciones(ConexionPHP* conexion, const char* tabla, const char* columna);
            int unicorn_alterar_anadir(ConexionPHP* conexion, const char* tabla, const char* columna);
            int unicorn_alterar_eliminar_columna(ConexionPHP* conexion, const char* tabla, const char* columna);
            int unicorn_alterar_renombrar_columna(ConexionPHP* conexion, const char* tabla, const char* anterior, const char* nuevo);
            int unicorn_alterar_renombrar_tabla(ConexionPHP* conexion, const char* anterior, const char* nuevo);
            int unicorn_truncar_tabla(ConexionPHP* conexion, const char* tabla);
            int unicorn_eliminar_tabla(ConexionPHP* conexion, const char* tabla);
            int unicorn_eliminar_base(ConexionPHP* conexion, const char* nombre);
            int unicorn_compactar(ConexionPHP* conexion, const char* tabla);
            int unicorn_no_nulo(ConexionPHP* conexion, const char* tabla, const char* columna);
            int unicorn_unico(ConexionPHP* conexion, const char* tabla, const char* columna);
            int unicorn_por_defecto(ConexionPHP* conexion, const char* tabla, const char* columna, const char* valor);
            int unicorn_crear_vista(ConexionPHP* conexion, const char* nombre, const char* consulta);
            int unicorn_eliminar_vista(ConexionPHP* conexion, const char* nombre);
            char* unicorn_listar_vistas(ConexionPHP* conexion);
            int unicorn_crear_procedimiento(ConexionPHP* conexion, const char* nombre, const char* const* parametros, size_t cantidad, const char* cuerpo);
            char* unicorn_listar_procedimientos(ConexionPHP* conexion);
            int unicorn_eliminar_procedimiento(ConexionPHP* conexion, const char* nombre);
            char* unicorn_ejecutar_procedimiento(ConexionPHP* conexion, const char* nombre, const char* const* argumentos, size_t cantidad);
            C;
        $this->biblioteca = FFI::cdef($declaraciones, $copiaAscii);
        $this->conexion = $this->biblioteca->unicorn_abrir($configuracion);
        if ($this->conexion === null || FFI::isNull($this->conexion)) {
            throw new RuntimeException($this->errorNativo(null));
        }
    }

    public function __destruct()
    {
        if ($this->conexion !== null && !FFI::isNull($this->conexion)) {
            $this->biblioteca->unicorn_cerrar($this->conexion);
        }
    }

    private function errorNativo(?FFI\CData $conexion): string
    {
        $valor = $this->biblioteca->unicorn_error($conexion);
        $mensaje = is_string($valor) ? $valor : FFI::string($valor);
        return $mensaje !== '' ? $mensaje : 'Operacion rechazada: revisa tipos, restricciones y relaciones.';
    }

    private function comprobar(int $resultado): bool
    {
        if ($resultado < 0) {
            throw new RuntimeException($this->errorNativo($this->conexion));
        }
        return $resultado === 1;
    }

    private function comprobarCantidad(int $resultado): int
    {
        if ($resultado < 0) {
            throw new RuntimeException($this->errorNativo($this->conexion));
        }
        return $resultado;
    }

    private function leerJson(FFI\CData $puntero): array
    {
        if (FFI::isNull($puntero)) {
            throw new RuntimeException($this->errorNativo($this->conexion));
        }
        try {
            return json_decode(FFI::string($puntero), true, 512, JSON_THROW_ON_ERROR);
        } finally {
            $this->biblioteca->unicorn_liberar($puntero);
        }
    }

    private function leerTexto(FFI\CData $puntero): string
    {
        if (FFI::isNull($puntero)) {
            throw new RuntimeException($this->errorNativo($this->conexion));
        }
        try {
            return FFI::string($puntero);
        } finally {
            $this->biblioteca->unicorn_liberar($puntero);
        }
    }

    private function prepararLista(array $valores): array
    {
        $cantidad = count($valores);
        $punteros = FFI::new('const char*[' . max(1, $cantidad) . ']');
        $cadenas = [];
        foreach (array_values($valores) as $indice => $valor) {
            if ($valor === null) {
                $punteros[$indice] = FFI::cast('char*', 0);
                continue;
            }
            if (!is_string($valor)) {
                throw new InvalidArgumentException('Los valores deben ser cadenas o null.');
            }
            $cadenas[$indice] = FFI::new('char[' . (strlen($valor) + 1) . ']');
            FFI::memcpy($cadenas[$indice], $valor, strlen($valor));
            $punteros[$indice] = FFI::cast('char*', $cadenas[$indice]);
        }
        return [$punteros, $cadenas, $cantidad];
    }

    public function crearBase(string $nombre): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_crear_base($this->conexion, $nombre));
    }

    public function usarBase(string $nombre): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_usar_base($this->conexion, $nombre));
    }

    public function configuracion(): array
    {
        return $this->leerJson($this->biblioteca->unicorn_configuracion($this->conexion));
    }

    public function listarBases(): array
    {
        return $this->leerJson($this->biblioteca->unicorn_listar_bases($this->conexion));
    }

    public function listarTablas(): array
    {
        return $this->leerJson($this->biblioteca->unicorn_listar_tablas($this->conexion));
    }

    public function crearTabla(string $nombre, string $esquema): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_crear_tabla($this->conexion, $nombre, $esquema));
    }

    public function crearTablaTipada(string $nombre, array $columnas): bool
    {
        $definiciones = [];
        foreach ($columnas as $columna => $tipo) {
            if (!is_string($columna) || !is_string($tipo)) {
                throw new InvalidArgumentException('Se espera [columna => tipo].');
            }
            $definiciones[] = $columna . ':' . $tipo;
        }
        return $this->comprobar($this->biblioteca->unicorn_crear_tabla_tipada(
            $this->conexion, $nombre, implode(',', $definiciones)
        ));
    }

    public function insertar(string $tabla, array $valores): int
    {
        [$punteros, $cadenas, $cantidad] = $this->prepararLista($valores);
        $resultado = $this->biblioteca->unicorn_insertar($this->conexion, $tabla, $punteros, $cantidad);
        if ($resultado < 0) {
            throw new RuntimeException($this->errorNativo($this->conexion));
        }
        return $resultado;
    }

    public function insertarColumnas(string $tabla, array $columnas, array $valores): int
    {
        [$punterosColumnas, $cadenasColumnas, $cantidadColumnas] = $this->prepararLista($columnas);
        [$punterosValores, $cadenasValores, $cantidadValores] = $this->prepararLista($valores);
        if ($cantidadColumnas !== $cantidadValores) {
            throw new InvalidArgumentException('Debe indicarse un valor por cada columna.');
        }
        return $this->comprobarCantidad($this->biblioteca->unicorn_insertar_columnas(
            $this->conexion, $tabla, $punterosColumnas, $cantidadColumnas,
            $punterosValores, $cantidadValores
        ));
    }

    public function insertarDesde(string $destino, string $origen): int
    {
        return $this->comprobarCantidad(
            $this->biblioteca->unicorn_insertar_desde($this->conexion, $destino, $origen)
        );
    }

    public function seleccionar(string $tabla, int $identificador): array
    {
        return $this->leerJson($this->biblioteca->unicorn_seleccionar($this->conexion, $tabla, $identificador));
    }

    public function listar(string $tabla): array
    {
        return $this->leerJson($this->biblioteca->unicorn_listar($this->conexion, $tabla));
    }

    public function buscar(string $tabla, string $columna, string $valor): array
    {
        return $this->leerJson($this->biblioteca->unicorn_buscar($this->conexion, $tabla, $columna, $valor));
    }

    public function actualizar(string $tabla, int $identificador, array $valores): bool
    {
        [$punteros, $cadenas, $cantidad] = $this->prepararLista($valores);
        return $this->comprobar(
            $this->biblioteca->unicorn_actualizar($this->conexion, $tabla, $identificador, $punteros, $cantidad)
        );
    }

    public function eliminar(string $tabla, int $identificador): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_eliminar($this->conexion, $tabla, $identificador));
    }

    public function consultar(string $consulta): array
    {
        return $this->leerJson($this->biblioteca->unicorn_consultar($this->conexion, $consulta));
    }

    public function explicar(string $consulta): string
    {
        return $this->leerTexto($this->biblioteca->unicorn_explicar($this->conexion, $consulta));
    }

    public function crearIndice(string $nombre, string $tabla, string $columna): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_crear_indice($this->conexion, $nombre, $tabla, $columna));
    }

    public function indices(string $tabla): array
    {
        return $this->leerJson($this->biblioteca->unicorn_indices($this->conexion, $tabla));
    }

    public function listarIndices(): array
    {
        return $this->leerJson($this->biblioteca->unicorn_listar_indices($this->conexion));
    }

    public function eliminarIndice(string $nombre, ?string $tabla = null): bool
    {
        return $this->comprobar($tabla === null
            ? $this->biblioteca->unicorn_eliminar_indice($this->conexion, $nombre)
            : $this->biblioteca->unicorn_eliminar_indice_tabla($this->conexion, $nombre, $tabla));
    }

    public function iniciarTransaccion(): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_iniciar_transaccion($this->conexion));
    }

    public function confirmar(): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_confirmar($this->conexion));
    }

    public function deshacer(): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_deshacer($this->conexion));
    }

    public function actualizarDonde(string $tabla, string $columna, ?string $valor, string $columnaDonde = '', string $valorDonde = ''): int
    {
        $resultado = $this->biblioteca->unicorn_actualizar_donde($this->conexion, $tabla, $columna, $valor, $columnaDonde, $valorDonde);
        if ($resultado < 0) throw new RuntimeException($this->errorNativo($this->conexion));
        return $resultado;
    }

    public function actualizarCampos(string $tabla, array $cambios, string $columnaDonde = '', string $valorDonde = ''): int
    {
        if ($cambios === []) {
            throw new InvalidArgumentException('Debe indicarse al menos un campo para actualizar.');
        }
        [$punterosColumnas, $cadenasColumnas, $cantidad] = $this->prepararLista(array_keys($cambios));
        [$punterosValores, $cadenasValores] = $this->prepararLista(array_values($cambios));
        return $this->comprobarCantidad($this->biblioteca->unicorn_actualizar_campos(
            $this->conexion, $tabla, $punterosColumnas, $punterosValores, $cantidad,
            $columnaDonde, $valorDonde
        ));
    }

    public function eliminarDonde(string $tabla, string $columnaDonde = '', string $valorDonde = ''): int
    {
        $resultado = $this->biblioteca->unicorn_eliminar_donde($this->conexion, $tabla, $columnaDonde, $valorDonde);
        if ($resultado < 0) throw new RuntimeException($this->errorNativo($this->conexion));
        return $resultado;
    }

    public function anadirClaveForanea(string $tabla, string $columna, string $referenciada, string $columnaReferenciada = 'id'): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_anadir_fk($this->conexion, $tabla, $columna, $referenciada, $columnaReferenciada));
    }

    public function esquema(string $tabla): array
    {
        return $this->leerJson($this->biblioteca->unicorn_esquema($this->conexion, $tabla));
    }

    public function tipos(string $tabla): array
    {
        return $this->leerJson($this->biblioteca->unicorn_tipos($this->conexion, $tabla));
    }

    public function clavePrimaria(string $tabla): string
    {
        return $this->leerTexto($this->biblioteca->unicorn_clave_primaria($this->conexion, $tabla));
    }

    public function clavesForaneas(string $tabla): array
    {
        return $this->leerJson($this->biblioteca->unicorn_claves_foraneas($this->conexion, $tabla));
    }

    public function restricciones(string $tabla, string $columna): array
    {
        return $this->leerJson($this->biblioteca->unicorn_restricciones($this->conexion, $tabla, $columna));
    }

    public function alterarAnadirColumna(string $tabla, string $columna): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_alterar_anadir($this->conexion, $tabla, $columna));
    }

    public function alterarEliminarColumna(string $tabla, string $columna): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_alterar_eliminar_columna($this->conexion, $tabla, $columna));
    }

    public function alterarRenombrarColumna(string $tabla, string $anterior, string $nuevo): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_alterar_renombrar_columna(
            $this->conexion, $tabla, $anterior, $nuevo
        ));
    }

    public function alterarRenombrarTabla(string $anterior, string $nuevo): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_alterar_renombrar_tabla($this->conexion, $anterior, $nuevo));
    }

    public function truncarTabla(string $tabla): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_truncar_tabla($this->conexion, $tabla));
    }

    public function eliminarTabla(string $tabla): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_eliminar_tabla($this->conexion, $tabla));
    }

    public function eliminarBase(string $nombre): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_eliminar_base($this->conexion, $nombre));
    }

    public function compactar(string $tabla): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_compactar($this->conexion, $tabla));
    }

    public function establecerNoNulo(string $tabla, string $columna): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_no_nulo($this->conexion, $tabla, $columna));
    }

    public function establecerUnico(string $tabla, string $columna): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_unico($this->conexion, $tabla, $columna));
    }

    public function establecerPorDefecto(string $tabla, string $columna, string $valor): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_por_defecto($this->conexion, $tabla, $columna, $valor));
    }

    public function crearVista(string $nombre, string $consulta): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_crear_vista($this->conexion, $nombre, $consulta));
    }

    public function eliminarVista(string $nombre): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_eliminar_vista($this->conexion, $nombre));
    }

    public function listarVistas(): array
    {
        return $this->leerJson($this->biblioteca->unicorn_listar_vistas($this->conexion));
    }

    public function crearProcedimiento(string $nombre, array $parametros, string $cuerpo): bool
    {
        [$punteros, $cadenas, $cantidad] = $this->prepararLista($parametros);
        return $this->comprobar($this->biblioteca->unicorn_crear_procedimiento(
            $this->conexion, $nombre, $punteros, $cantidad, $cuerpo
        ));
    }

    public function ejecutarProcedimiento(string $nombre, array $argumentos): array
    {
        [$punteros, $cadenas, $cantidad] = $this->prepararLista($argumentos);
        return $this->leerJson($this->biblioteca->unicorn_ejecutar_procedimiento(
            $this->conexion, $nombre, $punteros, $cantidad
        ));
    }

    public function listarProcedimientos(): array
    {
        return $this->leerJson($this->biblioteca->unicorn_listar_procedimientos($this->conexion));
    }

    public function eliminarProcedimiento(string $nombre): bool
    {
        return $this->comprobar($this->biblioteca->unicorn_eliminar_procedimiento($this->conexion, $nombre));
    }
}
