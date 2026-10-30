<?php
declare(strict_types=1);

require_once __DIR__ . '/unicornbbdd/UnicornBBDD.php';

final class ErinDatos
{
    public const BASE = 'erin_erp';

    private UnicornBBDD $unicorn;
    private string $base;
    private string $runtime;
    private string $archivoBaseActiva;
    private bool $usaBaseActiva;
    private bool $baseSeleccionada = false;
    private bool $transaccionActiva = false;
    private $bloqueo = null;

    public function __construct(string $base = self::BASE)
    {
        if(!preg_match('/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/', $base)){
            throw new InvalidArgumentException('El nombre de la base de datos no es válido.');
        }
        $this->usaBaseActiva = $base === self::BASE;
        $raiz = dirname(__DIR__, 2);
        $repositorio = dirname($raiz, 4);
        $this->runtime = $repositorio . '/.runtime/erin-erp-028';
        $directorioDatos = $this->runtime . '/datos';
        $configuracion = $this->runtime . '/config.json';
        $this->archivoBaseActiva = $this->runtime . '/base-activa.json';

        if(!is_dir($directorioDatos) && !mkdir($directorioDatos, 0777, true) && !is_dir($directorioDatos)){
            throw new RuntimeException('No se ha podido crear el directorio de datos de UnicornBBDD.');
        }
        if(!is_file($this->runtime . '/.htaccess') && file_put_contents($this->runtime . '/.htaccess', "Require all denied\n", LOCK_EX) === false){
            throw new RuntimeException('No se ha podido proteger el directorio de datos de UnicornBBDD.');
        }
        $contenido = json_encode([
            'instalacion' => str_replace('\\', '/', $directorioDatos),
            'tamanoRegistro' => 4096
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL;
        if(!is_file($configuracion) || file_get_contents($configuracion) !== $contenido){
            if(file_put_contents($configuracion, $contenido, LOCK_EX) === false){
                throw new RuntimeException('No se ha podido guardar la configuración de UnicornBBDD.');
            }
        }
        $this->unicorn = new UnicornBBDD($configuracion, __DIR__ . '/unicornbbdd/unicornbbdd.dll');
        $this->base = $this->usaBaseActiva ? $this->leerBaseActiva() : $base;
    }

    public function __destruct()
    {
        $this->liberarBloqueo();
    }

    private function leerBaseActiva(): string
    {
        if(!is_file($this->archivoBaseActiva)){ return self::BASE; }
        $datos = json_decode((string)file_get_contents($this->archivoBaseActiva), true);
        $base = $datos['base'] ?? self::BASE;
        return is_string($base) && preg_match('/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/', $base) ? $base : self::BASE;
    }

    private function bloquearEscritura(): void
    {
        if(is_resource($this->bloqueo)){ return; }
        $this->bloqueo = fopen($this->runtime . '/escritura.lock', 'c+');
        if($this->bloqueo === false || !flock($this->bloqueo, LOCK_EX)){
            throw new RuntimeException('No se ha podido bloquear la escritura de UnicornBBDD.');
        }
    }

    private function liberarBloqueo(): void
    {
        if(is_resource($this->bloqueo)){
            flock($this->bloqueo, LOCK_UN);
            fclose($this->bloqueo);
        }
        $this->bloqueo = null;
    }

    private function escritura(callable $operacion): mixed
    {
        $propio = !$this->transaccionActiva && !is_resource($this->bloqueo);
        if($propio){ $this->bloquearEscritura(); }
        try{ return $operacion(); }
        finally{ if($propio){ $this->liberarBloqueo(); } }
    }

    private function campoFisico(string $campo): string
    {
        return match($campo){
            'Identificador' => 'erin_identificador',
            'activo' => 'erin_activo',
            default => $campo
        };
    }

    private function campoVisible(string $campo): ?string
    {
        return match($campo){
            'id', 'activo' => null,
            'erin_identificador' => 'Identificador',
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

    private function valorFisico(mixed $valor): ?string
    {
        if($valor === null){ return null; }
        if(is_bool($valor)){ return $valor ? '1' : '0'; }
        if(is_scalar($valor)){ return (string)$valor; }
        throw new InvalidArgumentException('Los valores deben ser escalares o nulos.');
    }

    private function datosFisicos(array $datos): array
    {
        $resultado = [];
        foreach($datos as $campo=>$valor){
            $resultado[$this->campoFisico((string)$campo)] = $this->valorFisico($valor);
        }
        return $resultado;
    }

    private function registroVisible(array $registro): array
    {
        $resultado = [];
        foreach($registro as $campo=>$valor){
            $visible = $this->campoVisible((string)$campo);
            if($visible !== null){ $resultado[$visible] = $valor; }
        }
        return $resultado;
    }

    private function siguienteIdentificador(string $tabla): int
    {
        $maximo = 0;
        foreach($this->unicorn->listar($tabla) as $fila){
            $maximo = max($maximo, (int)($fila['erin_identificador'] ?? 0));
        }
        return $maximo + 1;
    }

    public function baseActual(): string
    {
        return $this->base;
    }

    public function rutaRuntime(): string
    {
        return $this->runtime;
    }

    public function rutaConfiguracion(): string
    {
        return $this->runtime . '/config.json';
    }

    public function basesDisponibles(): array
    {
        return $this->unicorn->listarBases();
    }

    public function activarBase(string $base): void
    {
        if(!in_array($base, $this->basesDisponibles(), true)){ throw new RuntimeException("La base '$base' no existe."); }
        $contenido = json_encode(['base'=>$base, 'activada'=>date(DATE_ATOM)], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . PHP_EOL;
        $this->escritura(function() use($contenido){
            if(file_put_contents($this->archivoBaseActiva, $contenido, LOCK_EX) === false){
                throw new RuntimeException('No se ha podido activar la base de datos.');
            }
        });
        $this->base = $base;
        $this->baseSeleccionada = false;
    }

    public function instalado(): bool
    {
        return in_array($this->base, $this->basesDisponibles(), true);
    }

    public function crearBase(): void
    {
        $this->escritura(function(){
            if(!$this->instalado() && !$this->unicorn->crearBase($this->base)){
                throw new RuntimeException('No se ha podido crear la base de datos de ERIN.');
            }
        });
        $this->seleccionarBase();
        if($this->usaBaseActiva){ $this->activarBase($this->base); }
    }

    public function eliminarBase(): void
    {
        $this->escritura(function(){
            if($this->instalado() && !$this->unicorn->eliminarBase($this->base)){
                throw new RuntimeException('No se ha podido eliminar la base de datos de ERIN.');
            }
        });
        $this->baseSeleccionada = false;
    }

    public function seleccionarBase(): void
    {
        if(!$this->baseSeleccionada){
            if(!$this->unicorn->usarBase($this->base)){
                throw new RuntimeException("La base de datos '{$this->base}' no está instalada.");
            }
            $this->baseSeleccionada = true;
        }
    }

    public function tablas(bool $incluirInternas = true): array
    {
        $this->seleccionarBase();
        $tablas = $this->unicorn->listarTablas();
        if(!$incluirInternas){
            $tablas = array_values(array_filter($tablas, fn($tabla)=>!str_starts_with($tabla, 'erin_')));
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
        $fisicas = ['erin_identificador'=>'ENTERO'];
        foreach($columnas as $columna=>$tipo){
            if(in_array($columna, ['Identificador','id'], true)){ continue; }
            $fisicas[$this->campoFisico((string)$columna)] = $this->tipoFisico((string)$tipo);
        }
        $this->escritura(function() use($tabla,$fisicas){
            if(!$this->unicorn->crearTablaTipada($tabla, $fisicas)){ throw new RuntimeException("No se ha podido crear la tabla '$tabla'."); }
            if(!$this->unicorn->establecerUnico($tabla, 'erin_identificador')){ throw new RuntimeException("No se ha podido proteger el identificador de '$tabla'."); }
        });
    }

    public function eliminarTabla(string $tabla): void
    {
        $this->seleccionarBase();
        $this->escritura(function() use($tabla){
            if(!$this->unicorn->eliminarTabla($tabla)){ throw new RuntimeException("No se ha podido eliminar la tabla '$tabla'."); }
        });
    }

    public function estructura(string $tabla): array
    {
        $this->seleccionarBase();
        $columnas = $this->unicorn->esquema($tabla);
        $tipos = $this->unicorn->tipos($tabla);
        $foraneas = [];
        foreach($this->unicorn->clavesForaneas($tabla) as $foranea){ $foraneas[$foranea['columna']] = $foranea; }
        $estructura = [];
        foreach($columnas as $indice=>$columna){
            $nombre = $this->campoVisible($columna);
            if($nombre === null){ continue; }
            $relacion = $foraneas[$columna] ?? null;
            $restricciones = $this->unicorn->restricciones($tabla, $columna);
            $estructura[] = [
                'cid'=>$indice,
                'name'=>$nombre,
                'type'=>$this->tipoVisible($tipos[$columna] ?? 'TEXTO'),
                'notnull'=>!empty($restricciones['noNulo']) ? 1 : 0,
                'unique'=>!empty($restricciones['unico']) ? 1 : 0,
                'dflt_value'=>!empty($restricciones['tieneDefecto']) ? ($restricciones['valorDefecto'] ?? null) : null,
                'pk'=>$columna === 'erin_identificador' ? 1 : 0,
                'fk'=>$relacion === null ? null : [
                    'tabla'=>$relacion['tabla'] ?? null,
                    'campo'=>$this->campoVisible($relacion['columnaReferenciada'] ?? 'erin_identificador')
                ]
            ];
        }
        return $estructura;
    }

    public function anadirClaveForanea(string $tabla, string $columna, string $referenciada, string $campo = 'Identificador'): void
    {
        $this->seleccionarBase();
        $this->escritura(function() use($tabla,$columna,$referenciada,$campo){
            if(!$this->unicorn->anadirClaveForanea($tabla, $this->campoFisico($columna), $referenciada, $this->campoFisico($campo))){
                throw new RuntimeException("No se ha podido crear la relación de '$tabla.$columna'.");
            }
        });
    }

    public function hacerUnico(string $tabla, string $columna): void
    {
        $this->seleccionarBase();
        $this->escritura(function() use($tabla,$columna){
            if(!$this->unicorn->establecerUnico($tabla, $this->campoFisico($columna))){
                throw new RuntimeException("No se ha podido hacer único '$tabla.$columna'.");
            }
        });
    }

    public function hacerNoNulo(string $tabla, string $columna): void
    {
        $this->seleccionarBase();
        $this->escritura(function() use($tabla,$columna){
            if(!$this->unicorn->establecerNoNulo($tabla, $this->campoFisico($columna))){
                throw new RuntimeException("No se ha podido hacer obligatorio '$tabla.$columna'.");
            }
        });
    }

    public function establecerPorDefecto(string $tabla, string $columna, string $valor): void
    {
        $this->seleccionarBase();
        $this->escritura(function() use($tabla,$columna,$valor){
            if(!$this->unicorn->establecerPorDefecto($tabla, $this->campoFisico($columna), $valor)){
                throw new RuntimeException("No se ha podido establecer el valor por defecto de '$tabla.$columna'.");
            }
        });
    }

    public function crearIndice(string $tabla, string $columna): string
    {
        $this->seleccionarBase();
        $nombre = 'idx_' . $tabla . '_' . $columna;
        $this->escritura(function() use($nombre,$tabla,$columna){
            if(!$this->unicorn->crearIndice($nombre, $tabla, $this->campoFisico($columna))){
                throw new RuntimeException("No se ha podido crear el índice de '$tabla.$columna'.");
            }
        });
        return $nombre;
    }

    public function restricciones(string $tabla, string $columna): array
    {
        $this->seleccionarBase();
        return $this->unicorn->restricciones($tabla, $this->campoFisico($columna));
    }

    public function indices(string $tabla): array
    {
        $this->seleccionarBase();
        return $this->unicorn->indices($tabla);
    }

    public function listar(string $tabla): array
    {
        $this->seleccionarBase();
        return array_map(fn($fila)=>$this->registroVisible($fila), $this->unicorn->listar($tabla));
    }

    public function obtener(string $tabla, int $identificador): ?array
    {
        $filas = $this->buscar($tabla, 'Identificador', (string)$identificador);
        return $filas[0] ?? null;
    }

    public function buscar(string $tabla, string $columna, string $valor): array
    {
        $this->seleccionarBase();
        return array_map(
            fn($fila)=>$this->registroVisible($fila),
            $this->unicorn->buscar($tabla, $this->campoFisico($columna), $valor)
        );
    }

    public function insertar(string $tabla, array $datos): int
    {
        $this->seleccionarBase();
        return $this->escritura(function() use($tabla,$datos){
            $identificador = isset($datos['Identificador']) ? (int)$datos['Identificador'] : $this->siguienteIdentificador($tabla);
            if($identificador < 1){ throw new InvalidArgumentException('El Identificador debe ser mayor que cero.'); }
            $datos['Identificador'] = $identificador;
            $fisicos = $this->datosFisicos($datos);
            $this->unicorn->insertarColumnas($tabla, array_keys($fisicos), array_values($fisicos));
            return $identificador;
        });
    }

    public function insertarMuchos(string $tabla, array $registros): array
    {
        $iniciadaAqui = !$this->transaccionActiva;
        if($iniciadaAqui){ $this->iniciarTransaccion(); }
        try{
            $identificadores = [];
            foreach($registros as $registro){ $identificadores[] = $this->insertar($tabla, $registro); }
            if($iniciadaAqui){ $this->confirmar(); }
            return $identificadores;
        }catch(Throwable $error){
            if($iniciadaAqui && $this->transaccionActiva){ $this->deshacer(); }
            throw $error;
        }
    }

    public function actualizar(string $tabla, int $identificador, array $datos): int
    {
        $this->seleccionarBase();
        unset($datos['Identificador']);
        $fisicos = $this->datosFisicos($datos);
        return $this->escritura(fn()=>$this->unicorn->actualizarCampos($tabla, $fisicos, 'erin_identificador', (string)$identificador));
    }

    public function eliminar(string $tabla, int $identificador): int
    {
        $this->seleccionarBase();
        return $this->escritura(fn()=>$this->unicorn->eliminarDonde($tabla, 'erin_identificador', (string)$identificador));
    }

    public function iniciarTransaccion(): void
    {
        $this->seleccionarBase();
        $this->bloquearEscritura();
        if(!$this->unicorn->iniciarTransaccion()){
            $this->liberarBloqueo();
            throw new RuntimeException('No se ha podido iniciar la transacción.');
        }
        $this->transaccionActiva = true;
    }

    public function confirmar(): void
    {
        try{
            if(!$this->unicorn->confirmar()){ throw new RuntimeException('No se ha podido confirmar la transacción.'); }
            $this->transaccionActiva = false;
        }finally{ $this->liberarBloqueo(); }
    }

    public function deshacer(): void
    {
        try{
            if(!$this->unicorn->deshacer()){ throw new RuntimeException('No se ha podido deshacer la transacción.'); }
            $this->transaccionActiva = false;
        }finally{ $this->liberarBloqueo(); }
    }
}

