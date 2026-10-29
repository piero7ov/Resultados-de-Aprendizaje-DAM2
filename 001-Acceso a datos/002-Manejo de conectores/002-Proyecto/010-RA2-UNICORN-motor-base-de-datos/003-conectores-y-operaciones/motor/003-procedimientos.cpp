#include "003-UnicornBBDD.hpp"

#include <algorithm>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <map>
#include <regex>
#include <sstream>
#include <stdexcept>

namespace {

std::string recortar(std::string texto) {
    auto esEspacio = [](unsigned char caracter) { return std::isspace(caracter); };
    while (!texto.empty() && esEspacio(texto.front())) texto.erase(texto.begin());
    while (!texto.empty() && esEspacio(texto.back())) texto.pop_back();
    return texto;
}

bool identificadorValido(const std::string& nombre) {
    static const std::regex patron("[A-Za-z_][A-Za-z0-9_]*");
    return std::regex_match(nombre, patron);
}

std::vector<std::string> separar(const std::string& texto, char separador) {
    std::vector<std::string> partes;
    std::string parte;
    bool entreComillas = false;
    for (std::size_t i = 0; i < texto.size(); ++i) {
        char caracter = texto[i];
        if (caracter == '\'') {
            if (entreComillas && i + 1 < texto.size() && texto[i + 1] == '\'') {
                parte += "''";
                ++i;
                continue;
            }
            entreComillas = !entreComillas;
        }
        if (caracter == separador && !entreComillas) {
            partes.push_back(recortar(parte));
            parte.clear();
        } else {
            parte += caracter;
        }
    }
    if (entreComillas) throw std::runtime_error("Comillas sin cerrar en el procedimiento");
    partes.push_back(recortar(parte));
    return partes;
}

std::string valorLiteral(const std::string& texto) {
    std::string valor = recortar(texto);
    if (valor.size() >= 2 && valor.front() == '\'' && valor.back() == '\'') {
        valor = valor.substr(1, valor.size() - 2);
        std::string resultado;
        for (std::size_t i = 0; i < valor.size(); ++i) {
            if (valor[i] == '\'' && i + 1 < valor.size() && valor[i + 1] == '\'') ++i;
            resultado += valor[i];
        }
        return resultado;
    }
    return valor;
}

std::string citar(const std::string& valor) {
    std::string resultado = "'";
    for (char caracter : valor) {
        if (caracter == '\'') resultado += '\'';
        resultado += caracter;
    }
    return resultado + "'";
}

std::string sustituirParametros(const std::string& cuerpo,
                                const std::map<std::string, std::string>& valores) {
    std::string resultado;
    for (std::size_t i = 0; i < cuerpo.size(); ++i) {
        if (cuerpo[i] != '{') {
            resultado += cuerpo[i];
            continue;
        }
        std::size_t fin = cuerpo.find('}', i + 1);
        if (fin == std::string::npos) throw std::runtime_error("Parametro sin cierre en el procedimiento");
        auto nombre = cuerpo.substr(i + 1, fin - i - 1);
        auto encontrado = valores.find(nombre);
        if (encontrado == valores.end()) throw std::runtime_error("Parametro desconocido: " + nombre);
        resultado += citar(encontrado->second);
        i = fin;
    }
    return resultado;
}

std::pair<std::string, std::string> condicionIgualdad(const std::string& texto) {
    static const std::regex patron(R"(^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*$)");
    std::smatch coincidencia;
    if (!std::regex_match(texto, coincidencia, patron)) {
        throw std::runtime_error("La condicion del procedimiento debe usar columna = valor");
    }
    return {coincidencia[1].str(), valorLiteral(coincidencia[2].str())};
}

} // namespace

bool UnicornBBDD::crearProcedimiento(const std::string& nombre,
                                      const std::vector<std::string>& parametros,
                                      const std::string& cuerpo) {
    if (basededatos.empty() || !identificadorValido(nombre) || recortar(cuerpo).empty() ||
        cuerpo.find('\n') != std::string::npos || cuerpo.find('\r') != std::string::npos) return false;
    std::map<std::string, bool> vistos;
    for (const auto& parametro : parametros) {
        if (!identificadorValido(parametro) || vistos[parametro]) return false;
        vistos[parametro] = true;
    }
    auto ruta = std::filesystem::path(instalacion) / basededatos / (nombre + ".proc");
    if (std::filesystem::exists(ruta)) return false;
    std::ofstream archivo(ruta, std::ios::binary);
    if (!archivo) return false;
    for (std::size_t i = 0; i < parametros.size(); ++i) {
        if (i) archivo << ',';
        archivo << parametros[i];
    }
    archivo << '\n' << recortar(cuerpo);
    return bool(archivo);
}

bool UnicornBBDD::eliminarProcedimiento(const std::string& nombre) {
    if (basededatos.empty() || !identificadorValido(nombre)) return false;
    return std::filesystem::remove(std::filesystem::path(instalacion) / basededatos /
                                   (nombre + ".proc"));
}

std::vector<std::string> UnicornBBDD::listarProcedimientos() const {
    std::vector<std::string> nombres;
    if (basededatos.empty()) return nombres;
    for (const auto& entrada : std::filesystem::directory_iterator(
             std::filesystem::path(instalacion) / basededatos)) {
        if (entrada.is_regular_file() && entrada.path().extension() == ".proc") {
            nombres.push_back(entrada.path().stem().string());
        }
    }
    std::sort(nombres.begin(), nombres.end());
    return nombres;
}

ResultadoProcedimiento UnicornBBDD::ejecutarProcedimiento(
    const std::string& nombre, const std::vector<std::string>& argumentos) {
    if (basededatos.empty() || !identificadorValido(nombre)) {
        throw std::runtime_error("Selecciona una base de datos y un procedimiento valido");
    }
    std::ifstream archivo(std::filesystem::path(instalacion) / basededatos /
                         (nombre + ".proc"), std::ios::binary);
    if (!archivo) throw std::runtime_error("Procedimiento no encontrado: " + nombre);
    std::string cabecera, cuerpo;
    std::getline(archivo, cabecera);
    std::getline(archivo, cuerpo);
    auto parametros = cabecera.empty() ? std::vector<std::string>{} : separar(cabecera, ',');
    if (parametros.size() != argumentos.size()) {
        throw std::runtime_error("Numero de argumentos incorrecto para " + nombre);
    }
    std::map<std::string, std::string> valores;
    for (std::size_t i = 0; i < parametros.size(); ++i) valores[parametros[i]] = argumentos[i];
    auto instrucciones = separar(sustituirParametros(cuerpo, valores), ';');
    ResultadoProcedimiento resultado;
    for (const auto& instruccion : instrucciones) {
        if (instruccion.empty()) continue;
        std::smatch coincidencia;
        static const auto flags = std::regex::icase;
        if (std::regex_match(instruccion, std::regex(R"(^SELECCIONAR\s+.+$)", flags))) {
            resultado.consulta = consultar(instruccion);
            resultado.tieneConsulta = true;
        } else if (std::regex_match(instruccion, coincidencia,
                   std::regex(R"(^INSERTAR\s+EN\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s*\(([^)]*)\))?\s+VALORES\s*\((.*)\)$)", flags))) {
            std::string tabla = coincidencia[1].str();
            auto datos = separar(coincidencia[3].str(), ',');
            for (auto& dato : datos) dato = valorLiteral(dato);
            long long id = coincidencia[2].matched
                ? insertarConColumnas(tabla, separar(coincidencia[2].str(), ','), datos)
                : insertarDatos(tabla, datos);
            if (id < 0) throw std::runtime_error("No se pudo insertar en " + tabla);
            ++resultado.modificados;
        } else if (std::regex_match(instruccion, coincidencia,
                   std::regex(R"(^ACTUALIZAR\s+([A-Za-z_][A-Za-z0-9_]*)\s+ESTABLECER\s+(.+?)(?:\s+DONDE\s+(.+))?$)", flags))) {
            std::map<std::string, std::string> cambios;
            for (const auto& asignacion : separar(coincidencia[2].str(), ',')) {
                auto [columna, valor] = condicionIgualdad(asignacion);
                cambios[columna] = valor;
            }
            std::string columnaDonde, valorDonde;
            if (coincidencia[3].matched) {
                auto condicion = condicionIgualdad(coincidencia[3].str());
                columnaDonde = condicion.first;
                valorDonde = condicion.second;
            }
            auto cantidad = actualizarDonde(coincidencia[1].str(), cambios, columnaDonde, valorDonde);
            if (cantidad < 0) throw std::runtime_error("No se pudo actualizar");
            resultado.modificados += cantidad;
        } else if (std::regex_match(instruccion, coincidencia,
                   std::regex(R"(^ELIMINAR\s+DE\s+([A-Za-z_][A-Za-z0-9_]*)(?:\s+DONDE\s+(.+))?$)", flags))) {
            std::string columnaDonde, valorDonde;
            if (coincidencia[2].matched) {
                auto condicion = condicionIgualdad(coincidencia[2].str());
                columnaDonde = condicion.first;
                valorDonde = condicion.second;
            }
            auto cantidad = eliminarDonde(coincidencia[1].str(), columnaDonde, valorDonde);
            if (cantidad < 0) throw std::runtime_error("No se pudo eliminar");
            resultado.modificados += cantidad;
        } else {
            throw std::runtime_error("Instruccion no admitida en el procedimiento: " + instruccion);
        }
    }
    return resultado;
}
