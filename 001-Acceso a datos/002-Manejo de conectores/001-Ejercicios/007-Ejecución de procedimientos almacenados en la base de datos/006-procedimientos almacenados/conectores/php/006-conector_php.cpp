#include "002-PierodevBBDD.hpp"
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
    std::unique_ptr<PierodevBBDD> motor;
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
            salida += jsonCadena(consulta.columnas[i]) + ':' + jsonCadena(fila[i]);
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

static std::vector<std::string> convertirLista(const char* const* valores, std::size_t cantidad) {
    if (cantidad && !valores) throw std::invalid_argument("Falta la lista de valores");
    std::vector<std::string> salida;
    for (std::size_t i = 0; i < cantidad; ++i) {
        if (!valores[i]) throw std::invalid_argument("La lista contiene un valor nulo");
        salida.emplace_back(valores[i]);
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

EXPORTAR ConexionPHP* pierodev_abrir(const char* configuracion) {
    try {
        errorApertura.clear();
        auto conexion = std::make_unique<ConexionPHP>();
        conexion->motor = std::make_unique<PierodevBBDD>(configuracion ? configuracion : "config.json");
        return conexion.release();
    } catch (const std::exception& e) {
        errorApertura = e.what();
        return nullptr;
    }
}

EXPORTAR void pierodev_cerrar(ConexionPHP* conexion) { delete conexion; }
EXPORTAR const char* pierodev_error(ConexionPHP* conexion) {
    return conexion ? conexion->error.c_str() : errorApertura.c_str();
}
EXPORTAR void pierodev_liberar(char* texto) { delete[] texto; }

EXPORTAR int pierodev_crear_base(ConexionPHP* conexion, const char* nombre) {
    return ejecutarBool(conexion, [&] { return conexion->motor->creaBaseDatos(nombre); });
}
EXPORTAR int pierodev_usar_base(ConexionPHP* conexion, const char* nombre) {
    return ejecutarBool(conexion, [&] { return conexion->motor->usaBaseDatos(nombre); });
}
EXPORTAR int pierodev_crear_tabla(ConexionPHP* conexion, const char* nombre, const char* esquema) {
    return ejecutarBool(conexion, [&] { return conexion->motor->creaTabla(nombre, esquema); });
}
EXPORTAR long long pierodev_insertar(ConexionPHP* conexion, const char* tabla,
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
EXPORTAR char* pierodev_consultar(ConexionPHP* conexion, const char* consulta) {
    if (!conexion || !conexion->motor) return nullptr;
    try {
        conexion->error.clear();
        return copiarCadena(jsonConsulta(conexion->motor->consultar(consulta)));
    } catch (const std::exception& e) {
        conexion->error = e.what();
        return nullptr;
    }
}
EXPORTAR int pierodev_crear_procedimiento(ConexionPHP* conexion, const char* nombre,
                                          const char* const* parametros, std::size_t cantidad,
                                          const char* cuerpo) {
    return ejecutarBool(conexion, [&] {
        return conexion->motor->crearProcedimiento(nombre, convertirLista(parametros, cantidad), cuerpo);
    });
}
EXPORTAR char* pierodev_listar_procedimientos(ConexionPHP* conexion) {
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
EXPORTAR int pierodev_eliminar_procedimiento(ConexionPHP* conexion, const char* nombre) {
    return ejecutarBool(conexion, [&] { return conexion->motor->eliminarProcedimiento(nombre); });
}
EXPORTAR char* pierodev_ejecutar_procedimiento(ConexionPHP* conexion, const char* nombre,
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
