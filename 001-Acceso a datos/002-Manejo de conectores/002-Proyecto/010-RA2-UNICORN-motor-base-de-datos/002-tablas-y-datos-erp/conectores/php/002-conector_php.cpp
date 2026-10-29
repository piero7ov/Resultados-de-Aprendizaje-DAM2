#include "002-UnicornBBDD.hpp"
#include <algorithm>
#include <cctype>
#include <cstring>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

#ifdef _WIN32
#define EXPORTAR extern "C" __declspec(dllexport)
#else
#define EXPORTAR extern "C"
#endif

struct ConexionPHP {
    std::unique_ptr<UnicornBBDD> motor;
    std::string error;
};

static thread_local std::string errorApertura;

static std::string jsonCadena(const std::string& valor) {
    const char* hex = "0123456789abcdef";
    std::string salida = "\"";
    for (unsigned char c : valor) {
        switch (c) {
            case '"': salida += "\\\""; break;
            case '\\': salida += "\\\\"; break;
            case '\n': salida += "\\n"; break;
            case '\r': salida += "\\r"; break;
            case '\t': salida += "\\t"; break;
            default:
                if (c < 0x20) {
                    salida += "\\u00";
                    salida += hex[c >> 4];
                    salida += hex[c & 15];
                } else salida += static_cast<char>(c);
        }
    }
    return salida + "\"";
}

static std::string jsonConsulta(const ResultadoConsulta& consulta) {
    std::string salida = "[";
    for (const auto& fila : consulta.filas) {
        if (salida.size() > 1) salida += ',';
        salida += '{';
        for (std::size_t i = 0; i < consulta.columnas.size() && i < fila.size(); ++i) {
            if (i) salida += ',';
            salida += jsonCadena(consulta.columnas[i]) + ':' +
                (UnicornBBDD::esNulo(fila[i]) ? "null" : jsonCadena(fila[i]));
        }
        salida += '}';
    }
    return salida + ']';
}

static char* copiarCadena(const std::string& valor) {
    auto* copia = new char[valor.size() + 1];
    std::memcpy(copia, valor.c_str(), valor.size() + 1);
    return copia;
}

template <typename Funcion>
static char* ejecutarTexto(ConexionPHP* conexion, Funcion funcion) {
    if (!conexion || !conexion->motor) return nullptr;
    try { conexion->error.clear(); return copiarCadena(funcion()); }
    catch (const std::exception& e) { conexion->error=e.what(); return nullptr; }
}

static std::vector<std::string> convertirLista(const char* const* valores, std::size_t cantidad) {
    if (cantidad && !valores) throw std::invalid_argument("Falta la lista de valores");
    std::vector<std::string> salida;
    for (std::size_t i = 0; i < cantidad; ++i) {
        salida.emplace_back(valores[i] ? valores[i] : UnicornBBDD::valorNulo());
    }
    return salida;
}

template <typename Funcion>
static int ejecutarBool(ConexionPHP* conexion, Funcion funcion) {
    if (!conexion || !conexion->motor) return -1;
    try {
        conexion->error.clear();
        return funcion() ? 1 : 0;
    } catch (const std::exception& e) {
        conexion->error = e.what();
        return -1;
    }
}

EXPORTAR ConexionPHP* unicorn_abrir(const char* configuracion) {
    try {
        errorApertura.clear();
        auto conexion = std::make_unique<ConexionPHP>();
        conexion->motor = std::make_unique<UnicornBBDD>(configuracion ? configuracion : "config.json");
        return conexion.release();
    } catch (const std::exception& e) {
        errorApertura = e.what();
        return nullptr;
    }
}

EXPORTAR void unicorn_cerrar(ConexionPHP* conexion) { delete conexion; }
EXPORTAR const char* unicorn_error(ConexionPHP* conexion) {
    return conexion ? conexion->error.c_str() : errorApertura.c_str();
}
EXPORTAR void unicorn_liberar(char* texto) { delete[] texto; }

EXPORTAR int unicorn_crear_base(ConexionPHP* conexion, const char* nombre) {
    return ejecutarBool(conexion, [&] { return conexion->motor->creaBaseDatos(nombre); });
}
EXPORTAR int unicorn_usar_base(ConexionPHP* conexion, const char* nombre) {
    return ejecutarBool(conexion, [&] { return conexion->motor->usaBaseDatos(nombre); });
}
EXPORTAR int unicorn_crear_tabla(ConexionPHP* conexion, const char* nombre, const char* esquema) {
    return ejecutarBool(conexion, [&] { return conexion->motor->creaTabla(nombre, esquema); });
}
EXPORTAR int unicorn_crear_tabla_tipada(ConexionPHP* conexion, const char* nombre, const char* esquema) {
    return ejecutarBool(conexion, [&] {
        std::vector<DefinicionColumna> columnas;
        std::istringstream entrada(esquema);
        std::string parte;
        while (std::getline(entrada, parte, ',')) {
            auto punto=parte.find(':');
            if (punto==std::string::npos) throw std::invalid_argument("Se espera columna:TIPO");
            std::string tipo=parte.substr(punto+1);
            std::transform(tipo.begin(),tipo.end(),tipo.begin(),[](unsigned char c){return std::toupper(c);});
            TipoDato valor;
            if(tipo=="TEXTO")valor=TipoDato::TEXTO;
            else if(tipo=="ENTERO")valor=TipoDato::ENTERO;
            else if(tipo=="REAL")valor=TipoDato::REAL;
            else if(tipo=="BOOLEANO")valor=TipoDato::BOOLEANO;
            else if(tipo=="FECHA")valor=TipoDato::FECHA;
            else if(tipo=="DECIMAL")valor=TipoDato::DECIMAL;
            else throw std::invalid_argument("Tipo desconocido: "+tipo);
            columnas.push_back({parte.substr(0,punto),valor});
        }
        return conexion->motor->creaTablaTipada(nombre,columnas);
    });
}
EXPORTAR long long unicorn_insertar(ConexionPHP* conexion, const char* tabla,
                                     const char* const* valores, std::size_t cantidad) {
    if (!conexion || !conexion->motor) return -1;
    try {
        conexion->error.clear();
        return conexion->motor->insertarDatos(tabla, convertirLista(valores, cantidad));
    } catch (const std::exception& e) {
        conexion->error = e.what();
        return -1;
    }
}
EXPORTAR char* unicorn_consultar(ConexionPHP* conexion, const char* consulta) {
    if (!conexion || !conexion->motor) return nullptr;
    try {
        conexion->error.clear();
        return copiarCadena(jsonConsulta(conexion->motor->consultar(consulta)));
    } catch (const std::exception& e) {
        conexion->error = e.what();
        return nullptr;
    }
}
EXPORTAR char* unicorn_explicar(ConexionPHP* conexion, const char* consulta) {
    return ejecutarTexto(conexion, [&]{ return conexion->motor->explicar(consulta); });
}
EXPORTAR int unicorn_crear_indice(ConexionPHP* conexion, const char* nombre,
                                  const char* tabla, const char* columna) {
    return ejecutarBool(conexion, [&]{ return conexion->motor->crearIndice(nombre,tabla,columna); });
}
EXPORTAR char* unicorn_indices(ConexionPHP* conexion, const char* tabla) {
    return ejecutarTexto(conexion, [&]{
        std::string salida="[";
        for(const auto& nombre:conexion->motor->listarIndicesTabla(tabla)){
            if(salida.size()>1)salida+=',';
            salida+=jsonCadena(nombre);
        }
        return salida+"]";
    });
}
EXPORTAR int unicorn_eliminar_indice(ConexionPHP* conexion, const char* nombre) {
    return ejecutarBool(conexion, [&]{ return conexion->motor->eliminarIndice(nombre); });
}
EXPORTAR int unicorn_eliminar_indice_tabla(ConexionPHP* conexion, const char* nombre, const char* tabla) {
    return ejecutarBool(conexion, [&]{
        auto indices=conexion->motor->listarIndicesTabla(tabla);
        if(std::find(indices.begin(),indices.end(),nombre)==indices.end())return false;
        return conexion->motor->eliminarIndice(nombre);
    });
}
EXPORTAR int unicorn_iniciar_transaccion(ConexionPHP* conexion) {
    return ejecutarBool(conexion, [&]{ return conexion->motor->iniciarTransaccion(); });
}
EXPORTAR int unicorn_confirmar(ConexionPHP* conexion) {
    return ejecutarBool(conexion, [&]{ return conexion->motor->confirmarTransaccion(); });
}
EXPORTAR int unicorn_deshacer(ConexionPHP* conexion) {
    return ejecutarBool(conexion, [&]{ return conexion->motor->deshacerTransaccion(); });
}
EXPORTAR long long unicorn_actualizar_donde(ConexionPHP* conexion, const char* tabla,
    const char* columna, const char* valor, const char* columnaDonde, const char* valorDonde) {
    if(!conexion||!conexion->motor)return -1;
    try { conexion->error.clear(); return conexion->motor->actualizarDonde(tabla,
        {{columna,valor?valor:UnicornBBDD::valorNulo()}},columnaDonde,valorDonde); }
    catch(const std::exception& e){conexion->error=e.what();return -1;}
}
EXPORTAR long long unicorn_eliminar_donde(ConexionPHP* conexion, const char* tabla,
    const char* columnaDonde, const char* valorDonde) {
    if(!conexion||!conexion->motor)return -1;
    try { conexion->error.clear(); return conexion->motor->eliminarDonde(tabla,columnaDonde,valorDonde); }
    catch(const std::exception& e){conexion->error=e.what();return -1;}
}
EXPORTAR int unicorn_anadir_fk(ConexionPHP* conexion, const char* tabla, const char* columna,
    const char* referenciada, const char* columnaReferenciada) {
    return ejecutarBool(conexion,[&]{return conexion->motor->anadirClaveForanea(tabla,columna,referenciada,columnaReferenciada);});
}
EXPORTAR int unicorn_no_nulo(ConexionPHP* conexion,const char* tabla,const char* columna){
    return ejecutarBool(conexion,[&]{return conexion->motor->establecerNoNulo(tabla,columna);});
}
EXPORTAR int unicorn_unico(ConexionPHP* conexion,const char* tabla,const char* columna){
    return ejecutarBool(conexion,[&]{return conexion->motor->establecerUnico(tabla,columna);});
}
EXPORTAR int unicorn_por_defecto(ConexionPHP* conexion,const char* tabla,const char* columna,const char* valor){
    return ejecutarBool(conexion,[&]{return conexion->motor->establecerPorDefecto(tabla,columna,valor);});
}
EXPORTAR int unicorn_crear_vista(ConexionPHP* conexion,const char* nombre,const char* consulta){
    return ejecutarBool(conexion,[&]{return conexion->motor->crearVista(nombre,consulta);});
}
EXPORTAR int unicorn_eliminar_vista(ConexionPHP* conexion,const char* nombre){
    return ejecutarBool(conexion,[&]{return conexion->motor->eliminarVista(nombre);});
}
EXPORTAR char* unicorn_listar_vistas(ConexionPHP* conexion){
    return ejecutarTexto(conexion,[&]{std::string salida="[";for(const auto& nombre:conexion->motor->listarVistas()){if(salida.size()>1)salida+=',';salida+=jsonCadena(nombre);}return salida+"]";});
}
EXPORTAR int unicorn_crear_procedimiento(ConexionPHP* conexion, const char* nombre,
                                          const char* const* parametros, std::size_t cantidad,
                                          const char* cuerpo) {
    return ejecutarBool(conexion, [&] {
        return conexion->motor->crearProcedimiento(nombre, convertirLista(parametros, cantidad), cuerpo);
    });
}
EXPORTAR char* unicorn_listar_procedimientos(ConexionPHP* conexion) {
    if (!conexion || !conexion->motor) return nullptr;
    try {
        conexion->error.clear();
        std::string salida = "[";
        for (const auto& nombre : conexion->motor->listarProcedimientos()) {
            if (salida.size() > 1) salida += ',';
            salida += jsonCadena(nombre);
        }
        return copiarCadena(salida + ']');
    } catch (const std::exception& e) {
        conexion->error = e.what();
        return nullptr;
    }
}
EXPORTAR int unicorn_eliminar_procedimiento(ConexionPHP* conexion, const char* nombre) {
    return ejecutarBool(conexion, [&] { return conexion->motor->eliminarProcedimiento(nombre); });
}
EXPORTAR char* unicorn_ejecutar_procedimiento(ConexionPHP* conexion, const char* nombre,
                                                const char* const* argumentos, std::size_t cantidad) {
    if (!conexion || !conexion->motor) return nullptr;
    try {
        conexion->error.clear();
        auto resultado = conexion->motor->ejecutarProcedimiento(nombre, convertirLista(argumentos, cantidad));
        return copiarCadena("{\"modificados\":" + std::to_string(resultado.modificados) +
            ",\"filas\":" + (resultado.tieneConsulta ? jsonConsulta(resultado.consulta) : "[]") + "}");
    } catch (const std::exception& e) {
        conexion->error = e.what();
        return nullptr;
    }
}
