<?php
declare(strict_types=1);

require_once __DIR__ . '/unicornbbdd/UnicornBBDD.php';

final class ErinDatos
{
    public const BASE = 'erin_erp';
    private UnicornBBDD $unicorn;
    private string $base;
    private bool $baseSeleccionada = false;

    public function __construct(string $base = self::BASE)
    {
        if(!preg_match('/^[a-zA-Z][a-zA-Z0-9_-]{0,49}$/', $base)){
            throw new InvalidArgumentException('El nombre de la base de datos no es válido.');
        }
        $this->base = $base;
        $raiz = dirname(__DIR__, 2);
        $repositorio = dirname($raiz, 4);
        $runtime = $repositorio . '/.runtime/erin-erp-027';
        $datos = $runtime . '/datos';
        $configuracion = $runtime . '/config.json';
        if(!is_dir($datos) && !mkdir($datos, 0777, true) && !is_dir($datos)){
            throw new RuntimeException('No se ha podido crear el directorio de datos de UnicornBBDD.');
        }
        $proteccion = "Require all denied\n";
        if(!is_file($runtime . '/.htaccess') && file_put_contents($runtime . '/.htaccess', $proteccion, LOCK_EX) === false){
            throw new RuntimeException('No se ha podido proteger el directorio de datos de UnicornBBDD.');
        }
        $contenido = json_encode([
            'instalacion' => str_replace('\\', '/', $datos),
            'tamanoRegistro' => 2048
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL;
        if(!is_file($configuracion) || file_get_contents($configuracion) !== $contenido){
            if(file_put_contents($configuracion, $contenido, LOCK_EX) === false){
                throw new RuntimeException('No se ha podido guardar la configuración de UnicornBBDD.');
            }
        }
        $this->unicorn = new UnicornBBDD($configuracion, __DIR__ . '/unicornbbdd/unicornbbdd.dll');
    }

    private function campoFisico(string $campo): string
    {
        return match($campo){
            'Identificador' => 'id',
            'activo' => 'erin_activo',
            default => $campo
        };
    }

    private function campoVisible(string $campo): string
    {
        return match($campo){
            'id' => 'Identificador',
            'erin_activo' => 'activo',
            default => $campo
        };
    }

    private function tipoFisico(string $tipo): string
    {
        return match(strtoupper($tipo)){
            'INTEGER', 'ENTERO' => 'ENTERO',
            'REAL', 'NUMERIC', 'DECIMAL' => 'DECIMAL',
            'BOOLEAN', 'BOOLEANO' => 'BOOLEANO',
            'DATE', 'FECHA' => 'FECHA',
            'TEXT', 'BLOB', 'TEXTO' => 'TEXTO',
            default => throw new InvalidArgumentException("Tipo no compatible con UnicornBBDD: $tipo")
        };
    }

    private function tipoVisible(string $tipo): string
    {
        return match(strtoupper($tipo)){
            'ENTERO', 'BOOLEANO' => 'INTEGER',
            'DECIMAL' => 'REAL',
            default => 'TEXT'
        };
    }

    private function datosFisicos(array $datos): array
    {
        $resultado = [];
        foreach($datos as $campo => $valor){
            if($campo === 'Identificador'){ continue; }
            if(!is_null($valor) && !is_scalar($valor)){
                throw new InvalidArgumentException('Los valores deben ser escalares o nulos.');
            }
            $resultado[$this->campoFisico((string)$campo)] = is_bool($valor)
                ? ($valor ? '1' : '0')
                : ($valor === null ? null : (string)$valor);
        }
        return $resultado;
    }

    private function registroVisible(array $registro): array
    {
        $resultado = [];
        foreach($registro as $campo => $valor){
            if($campo === 'activo'){ continue; }
            $resultado[$this->campoVisible((string)$campo)] = $valor;
        }
        return $resultado;
    }

    public function instalado(): bool
    {
        return in_array($this->base, $this->unicorn->listarBases(), true);
    }

    public function crearBase(): void
    {
        if(!$this->instalado() && !$this->unicorn->crearBase($this->base)){
            throw new RuntimeException('No se ha podido crear la base de datos de ERIN.');
        }
        $this->seleccionarBase();
    }

    public function eliminarBase(): void
    {
        if($this->instalado() && !$this->unicorn->eliminarBase($this->base)){
            throw new RuntimeException('No se ha podido eliminar la base de datos de ERIN.');
        }
        $this->baseSeleccionada = false;
    }

    public function seleccionarBase(): void
    {
        if(!$this->baseSeleccionada){
            if(!$this->unicorn->usarBase($this->base)){
                throw new RuntimeException('La base de datos de ERIN no está instalada.');
            }
            $this->baseSeleccionada = true;
        }
    }

    public function tablas(bool $incluirInternas = true): array
    {
        $this->seleccionarBase();
        $tablas = $this->unicorn->listarTablas();
        if(!$incluirInternas){
            $tablas = array_values(array_filter($tablas, fn($tabla) => !str_starts_with($tabla, 'erin_')));
        }
        sort($tablas, SORT_NATURAL | SORT_FLAG_CASE);
        return $tablas;
    }

    public function existeTabla(string $tabla): bool
    {
        return in_array($tabla, $this->tablas(), true);
    }

    public function crearTabla(string $tabla, array $columnas): void
    {
        $this->seleccionarBase();
        $fisicas = [];
        foreach($columnas as $columna => $tipo){
            if(in_array($columna, ['Identificador', 'id'], true)){ continue; }
            $fisicas[$this->campoFisico((string)$columna)] = $this->tipoFisico((string)$tipo);
        }
        if(!$this->unicorn->crearTablaTipada($tabla, $fisicas)){
            throw new RuntimeException("No se ha podido crear la tabla '$tabla'.");
        }
    }

    public function eliminarTabla(string $tabla): void
    {
        $this->seleccionarBase();
        if(!$this->unicorn->eliminarTabla($tabla)){
            throw new RuntimeException("No se ha podido eliminar la tabla '$tabla'.");
        }
    }

    public function estructura(string $tabla): array
    {
        $this->seleccionarBase();
        $columnas = $this->unicorn->esquema($tabla);
        $tipos = $this->unicorn->tipos($tabla);
        $foraneas = [];
        foreach($this->unicorn->clavesForaneas($tabla) as $foranea){
            $foraneas[$foranea['columna']] = $foranea;
        }
        $estructura = [];
        foreach($columnas as $indice => $columna){
            if($columna === 'activo'){ continue; }
            $relacion = $foraneas[$columna] ?? null;
            $estructura[] = [
                'cid' => $indice,
                'name' => $this->campoVisible($columna),
                'type' => $this->tipoVisible($tipos[$columna] ?? 'TEXTO'),
                'notnull' => in_array('NO_NULO', $this->unicorn->restricciones($tabla, $columna), true) ? 1 : 0,
                'dflt_value' => null,
                'pk' => $columna === 'id' ? 1 : 0,
                'fk' => $relacion === null ? null : [
                    'tabla' => $relacion['tabla'] ?? $relacion['referenciada'] ?? null,
                    'campo' => $this->campoVisible($relacion['columnaReferenciada'] ?? 'id')
                ]
            ];
        }
        return $estructura;
    }

    public function anadirClaveForanea(string $tabla, string $columna, string $referenciada, string $campo = 'Identificador'): void
    {
        $this->seleccionarBase();
        if(!$this->unicorn->anadirClaveForanea($tabla, $this->campoFisico($columna), $referenciada, $this->campoFisico($campo))){
            throw new RuntimeException("No se ha podido crear la relación de '$tabla.$columna'.");
        }
    }

    public function hacerUnico(string $tabla, string $columna): void
    {
        $this->seleccionarBase();
        if(!$this->unicorn->establecerUnico($tabla, $this->campoFisico($columna))){
            throw new RuntimeException("No se ha podido hacer único '$tabla.$columna'.");
        }
    }

    public function listar(string $tabla): array
    {
        $this->seleccionarBase();
        return array_map(fn($fila) => $this->registroVisible($fila), $this->unicorn->listar($tabla));
    }

    public function obtener(string $tabla, int $identificador): ?array
    {
        $this->seleccionarBase();
        $fila = $this->unicorn->seleccionar($tabla, $identificador);
        return $fila === [] ? null : $this->registroVisible($fila);
    }

    public function buscar(string $tabla, string $columna, string $valor): array
    {
        $this->seleccionarBase();
        return array_map(
            fn($fila) => $this->registroVisible($fila),
            $this->unicorn->buscar($tabla, $this->campoFisico($columna), $valor)
        );
    }

    public function insertar(string $tabla, array $datos): int
    {
        $this->seleccionarBase();
        $datos = $this->datosFisicos($datos);
        return $this->unicorn->insertarColumnas($tabla, array_keys($datos), array_values($datos));
    }

    public function actualizar(string $tabla, int $identificador, array $datos): int
    {
        $this->seleccionarBase();
        $datos = $this->datosFisicos($datos);
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
        if(!$this->unicorn->iniciarTransaccion()){ throw new RuntimeException('No se ha podido iniciar la transacción.'); }
    }

    public function confirmar(): void
    {
        if(!$this->unicorn->confirmar()){ throw new RuntimeException('No se ha podido confirmar la transacción.'); }
    }

    public function deshacer(): void
    {
        if(!$this->unicorn->deshacer()){ throw new RuntimeException('No se ha podido deshacer la transacción.'); }
    }
}

