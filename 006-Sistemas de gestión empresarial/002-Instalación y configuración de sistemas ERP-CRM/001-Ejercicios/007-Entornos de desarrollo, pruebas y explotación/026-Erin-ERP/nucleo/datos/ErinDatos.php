<?php
declare(strict_types=1);

require_once __DIR__ . '/unicornbbdd/UnicornBBDD.php';

final class ErinDatos
{
    public const BASE = 'erin_erp';

    private UnicornBBDD $unicorn;
    private bool $baseSeleccionada = false;

    public function __construct()
    {
        $raiz = dirname(__DIR__, 2);
        $repositorio = dirname($raiz, 4);
        $directorioRuntime = $repositorio . '/.runtime/erin-erp-026';
        $directorioDatos = $directorioRuntime . '/datos';
        $archivoConfiguracion = $directorioRuntime . '/config.json';
        $biblioteca = __DIR__ . '/unicornbbdd/unicornbbdd.dll';

        if (!is_dir($directorioDatos) && !mkdir($directorioDatos, 0777, true) && !is_dir($directorioDatos)) {
            throw new RuntimeException('No se ha podido crear el directorio de datos de UnicornBBDD.');
        }

        $configuracion = json_encode([
            'instalacion' => str_replace('\\', '/', $directorioDatos),
            'tamanoRegistro' => 512,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL;

        if (!is_file($archivoConfiguracion) || file_get_contents($archivoConfiguracion) !== $configuracion) {
            if (file_put_contents($archivoConfiguracion, $configuracion, LOCK_EX) === false) {
                throw new RuntimeException('No se ha podido guardar la configuración de UnicornBBDD.');
            }
        }

        $this->unicorn = new UnicornBBDD($archivoConfiguracion, $biblioteca);
    }

    public function instalado(): bool
    {
        return in_array(self::BASE, $this->unicorn->listarBases(), true);
    }

    public function crearBase(): void
    {
        if (!$this->instalado() && !$this->unicorn->crearBase(self::BASE)) {
            throw new RuntimeException('No se ha podido crear la base de datos de ERIN.');
        }
        $this->seleccionarBase();
    }

    public function seleccionarBase(): void
    {
        if (!$this->baseSeleccionada) {
            if (!$this->unicorn->usarBase(self::BASE)) {
                throw new RuntimeException('La base de datos de ERIN no está instalada.');
            }
            $this->baseSeleccionada = true;
        }
    }

    public function tablas(): array
    {
        $this->seleccionarBase();
        return $this->unicorn->listarTablas();
    }

    public function existeTabla(string $tabla): bool
    {
        return in_array($tabla, $this->tablas(), true);
    }

    public function crearTabla(string $tabla, array $columnas): void
    {
        $this->seleccionarBase();
        if (!$this->unicorn->crearTablaTipada($tabla, $columnas)) {
            throw new RuntimeException("No se ha podido crear la tabla '$tabla'.");
        }
    }

    public function eliminarTabla(string $tabla): void
    {
        $this->seleccionarBase();
        if (!$this->unicorn->eliminarTabla($tabla)) {
            throw new RuntimeException("No se ha podido eliminar la tabla '$tabla'.");
        }
    }

    public function estructura(string $tabla): array
    {
        $this->seleccionarBase();
        $columnas = $this->unicorn->esquema($tabla);
        $tipos = $this->unicorn->tipos($tabla);
        $primaria = $this->unicorn->clavePrimaria($tabla);
        $foraneas = [];
        foreach ($this->unicorn->clavesForaneas($tabla) as $foranea) {
            $foraneas[$foranea['columna']] = $foranea;
        }

        $estructura = [];
        foreach ($columnas as $columna) {
            $estructura[] = [
                'nombre' => $columna,
                'tipo' => $tipos[$columna] ?? 'TEXTO',
                'primaria' => $columna === $primaria,
                'foranea' => $foraneas[$columna] ?? null,
                'restricciones' => $this->unicorn->restricciones($tabla, $columna),
            ];
        }
        return $estructura;
    }

    public function clavesForaneas(string $tabla): array
    {
        $this->seleccionarBase();
        return $this->unicorn->clavesForaneas($tabla);
    }

    public function anadirClaveForanea(
        string $tabla,
        string $columna,
        string $tablaReferenciada,
        string $columnaReferenciada = 'id'
    ): void {
        $this->seleccionarBase();
        if (!$this->unicorn->anadirClaveForanea($tabla, $columna, $tablaReferenciada, $columnaReferenciada)) {
            throw new RuntimeException("No se ha podido crear la relación de '$tabla.$columna'.");
        }
    }

    public function listar(string $tabla): array
    {
        $this->seleccionarBase();
        return $this->unicorn->listar($tabla);
    }

    public function obtener(string $tabla, int $identificador): ?array
    {
        $this->seleccionarBase();
        $registro = $this->unicorn->seleccionar($tabla, $identificador);
        return $registro === [] ? null : $registro;
    }

    public function buscar(string $tabla, string $columna, string $valor): array
    {
        $this->seleccionarBase();
        return $this->unicorn->buscar($tabla, $columna, $valor);
    }

    public function consultar(string $sentencia): array
    {
        $this->seleccionarBase();
        return $this->unicorn->consultar($sentencia);
    }

    public function insertar(string $tabla, array $datos): int
    {
        $this->seleccionarBase();
        return $this->unicorn->insertarColumnas($tabla, array_keys($datos), array_values($datos));
    }

    public function actualizar(string $tabla, int $identificador, array $datos): int
    {
        $this->seleccionarBase();
        return $this->unicorn->actualizarCampos($tabla, $datos, 'id', (string)$identificador);
    }

    public function eliminar(string $tabla, int $identificador): int
    {
        $this->seleccionarBase();
        return $this->unicorn->eliminarDonde($tabla, 'id', (string)$identificador);
    }

    public function iniciarTransaccion(): void
    {
        $this->seleccionarBase();
        if (!$this->unicorn->iniciarTransaccion()) {
            throw new RuntimeException('No se ha podido iniciar la transacción.');
        }
    }

    public function confirmar(): void
    {
        if (!$this->unicorn->confirmar()) {
            throw new RuntimeException('No se ha podido confirmar la transacción.');
        }
    }

    public function deshacer(): void
    {
        if (!$this->unicorn->deshacer()) {
            throw new RuntimeException('No se ha podido deshacer la transacción.');
        }
    }
}
