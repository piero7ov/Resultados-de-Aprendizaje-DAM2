#pragma once
#include <cstdint>
#include <map>
#include <string>
#include <vector>
#include <filesystem>

class PierodevSerializador {
public:
    std::string serializar(const std::vector<std::string>& lista, char delimitador = ',') const;
    std::vector<std::string> desserializar(const std::string& cadena, char delimitador = ',') const;
};

struct ClaveForanea {
    std::string columna;
    std::string tablaReferenciada;
    std::string columnaReferenciada;
};

struct RestriccionColumna {
    bool noNulo = false;
    bool unico = false;
    bool tieneDefecto = false;
    std::string valorDefecto;
};


enum class TipoDato { TEXTO, ENTERO, REAL, BOOLEANO, FECHA, DECIMAL };

struct DefinicionColumna {
    std::string nombre;
    TipoDato tipo = TipoDato::TEXTO;
};

struct ResultadoConsulta {
    std::vector<std::string> columnas;
    std::vector<std::vector<std::string>> filas;
};

struct ResultadoProcedimiento {
    long long modificados = 0;
    ResultadoConsulta consulta;
    bool tieneConsulta = false;
};

class PierodevBBDD {
public:
    std::string instalacion;
    std::string basededatos;
    std::size_t tamanoRegistro = 512;

    explicit PierodevBBDD(const std::string& config = "config.json");
    const std::string& obtenerInstalacion() const { return instalacion; }
    std::size_t obtenerTamanoRegistro() const { return tamanoRegistro; }
    bool creaBaseDatos(const std::string& nombre);
    bool usaBaseDatos(const std::string& nombre);
    bool creaTabla(const std::string& nombre, const std::string& esquema);
    bool creaTablaTipada(const std::string& nombre, const std::vector<DefinicionColumna>& columnas);
    std::map<std::string,TipoDato> obtenerTipos(const std::string& tabla) const;
    bool crearVista(const std::string& nombre, const std::string& consulta);
    bool eliminarVista(const std::string& nombre);
    std::vector<std::string> listarVistas() const;
    bool crearProcedimiento(const std::string& nombre, const std::vector<std::string>& parametros, const std::string& cuerpo);
    bool eliminarProcedimiento(const std::string& nombre);
    std::vector<std::string> listarProcedimientos() const;
    ResultadoProcedimiento ejecutarProcedimiento(const std::string& nombre, const std::vector<std::string>& argumentos);
    bool crearIndice(const std::string& nombre, const std::string& tabla, const std::string& columna);
    bool eliminarIndice(const std::string& nombre);
    std::vector<std::string> listarIndices() const;
    std::vector<std::string> listarIndicesTabla(const std::string& tabla) const;
    std::string indicePara(const std::string& tabla, const std::string& columna) const;
    std::string explicar(const std::string& consulta) const;
    static const std::string& valorNulo();
    static bool esNulo(const std::string& valor);
    bool iniciarTransaccion();
    bool confirmarTransaccion();
    bool deshacerTransaccion();
    bool enTransaccion() const { return transaccionActiva; }
    bool alteraTablaAnadir(const std::string& tabla, const std::string& columna);
    bool alteraTablaEliminarColumna(const std::string& tabla, const std::string& columna);
    bool alteraTablaRenombrarColumna(const std::string& tabla, const std::string& antigua, const std::string& nueva);
    bool alterarRenombrarTabla(const std::string& anterior, const std::string& nueva);
    bool alterarAnadirColumna(const std::string& tabla, const std::string& columna) { return alteraTablaAnadir(tabla, columna); }
    bool alterarEliminarColumna(const std::string& tabla, const std::string& columna) { return alteraTablaEliminarColumna(tabla, columna); }
    bool alterarRenombrarColumna(const std::string& tabla, const std::string& anterior, const std::string& nueva) { return alteraTablaRenombrarColumna(tabla, anterior, nueva); }
    bool alteraTablaModificarColumna(const std::string& tabla, const std::string& antigua, const std::string& nueva);
    bool truncarTabla(const std::string& tabla);
    bool eliminarTabla(const std::string& tabla);
    bool eliminarBaseDatos(const std::string& nombre);
    bool anadirClaveForanea(const std::string& tabla, const std::string& columna, const std::string& tablaReferenciada, const std::string& columnaReferenciada = "id");
    std::vector<ClaveForanea> obtenerClavesForaneas(const std::string& tabla) const;
    RestriccionColumna obtenerRestricciones(const std::string& tabla, const std::string& columna) const;
    bool establecerNoNulo(const std::string& tabla, const std::string& columna);
    bool establecerUnico(const std::string& tabla, const std::string& columna);
    bool establecerPorDefecto(const std::string& tabla, const std::string& columna, const std::string& valor);
    std::string obtenerClavePrimaria(const std::string& tabla) const;
    std::vector<std::string> obtenerEsquema(const std::string& tabla) const;
    long long siguienteId(const std::string& tabla) const;
    long long insertarDatos(const std::string& tabla, const std::vector<std::string>& datos);
    long long insertarConColumnas(const std::string& tabla, const std::vector<std::string>& columnas, const std::vector<std::string>& valores);
    long long insertarDesdeSeleccion(const std::string& destino, const std::string& origen);
    long long insertarDesdeTabla(const std::string& destino, const std::string& origen) { return insertarDesdeSeleccion(destino, origen); }
    long long actualizarDonde(const std::string& tabla, const std::map<std::string,std::string>& cambios, const std::string& columnaDonde = "", const std::string& valorDonde = "");
    long long eliminarDonde(const std::string& tabla, const std::string& columnaDonde = "", const std::string& valorDonde = "");
    std::int64_t buscarPosicion(const std::string& tabla, long long id) const;
    std::vector<std::string> leerRegistro(const std::string& tabla, long long id) const;
    std::map<std::string,std::string> seleccionar(const std::string& tabla, long long id) const;
    std::vector<std::map<std::string,std::string>> listarTodo(const std::string& tabla) const;
    ResultadoConsulta consultar(const std::string& consulta) const;
    std::vector<std::map<std::string,std::string>> buscarColumna(const std::string& tabla, const std::string& columna, const std::string& valor) const;
    bool actualizar(const std::string& tabla, long long id, const std::vector<std::string>& datos);
    bool eliminar(const std::string& tabla, long long id);
    bool compactar(const std::string& tabla);

private:
    bool cambiarColumnas(const std::string& tabla, const std::vector<std::string>& esquema,
                         std::size_t posicion, bool anadir);
    void actualizarIndicesTabla(const std::string& tabla) const;
    void eliminarIndicesTabla(const std::string& tabla);
    bool buscarConIndice(const std::string& tabla, const std::string& columna,
                         const std::string& valor,
                         std::vector<std::map<std::string,std::string>>& filas) const;
    bool transaccionActiva = false;
    std::string baseTransaccion;
    std::filesystem::path rutaSnapshot;
    bool validarTipo(TipoDato tipo, const std::string& valor) const;
    std::string normalizarTipo(TipoDato tipo, const std::string& valor) const;
    ResultadoConsulta consultarInterno(const std::string& consulta, int profundidad) const;
    bool esVista(const std::string& nombre) const;
    std::string consultaVista(const std::string& nombre) const;
    std::string rutaTabla(const std::string& tabla, const std::string& extension) const;
    std::string prepararRegistro(const std::vector<std::string>& elementos) const;
    static std::string trimDerecha(std::string s);
    bool validarClavesForaneas(const std::string& tabla, const std::vector<std::string>& datos) const;
    bool prepararYValidarRestricciones(const std::string& tabla, std::vector<std::string>& datos, long long idIgnorar = -1) const;
    bool registroReferenciado(const std::string& tabla, const std::string& columna, const std::string& valor) const;
    bool puedeEliminarRegistro(const std::string& tabla, const std::map<std::string,std::string>& registro) const;
};
