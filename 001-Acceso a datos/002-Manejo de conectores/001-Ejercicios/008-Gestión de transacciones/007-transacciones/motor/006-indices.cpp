#include "002-PierodevBBDD.hpp"

#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <regex>

namespace archivos = std::filesystem;

namespace {
bool nombreIndiceValido(const std::string& nombre) {
    static const std::regex patron("[A-Za-z_][A-Za-z0-9_]*");
    return std::regex_match(nombre, patron);
}

bool leerDefinicion(const archivos::path& ruta, std::string& tabla, std::string& columna) {
    std::ifstream archivo(ruta);
    std::string linea;
    if (!std::getline(archivo, linea)) return false;
    auto coma = linea.find(',');
    if (coma == std::string::npos) return false;
    tabla = linea.substr(0, coma);
    columna = linea.substr(coma + 1);
    return nombreIndiceValido(tabla) && nombreIndiceValido(columna);
}
}

bool PierodevBBDD::crearIndice(const std::string& nombre, const std::string& tabla,
                               const std::string& columna) {
    if (basededatos.empty() || !nombreIndiceValido(nombre) ||
        !nombreIndiceValido(tabla) || !nombreIndiceValido(columna)) return false;
    auto esquema = obtenerEsquema(tabla);
    if (std::find(esquema.begin(), esquema.end(), columna) == esquema.end()) return false;
    auto ruta = archivos::path(instalacion) / basededatos / (nombre + ".indice");
    if (archivos::exists(ruta)) return false;
    std::ofstream archivo(ruta);
    if (!archivo) return false;
    archivo << tabla << ',' << columna << '\n';
    for (const auto& fila : listarTodo(tabla)) {
        archivo << std::quoted(fila.at(columna)) << ' ' << fila.at("id") << '\n';
    }
    archivo.close();
    if (archivo) return true;
    archivos::remove(ruta);
    return false;
}

bool PierodevBBDD::eliminarIndice(const std::string& nombre) {
    if (basededatos.empty() || !nombreIndiceValido(nombre)) return false;
    return archivos::remove(archivos::path(instalacion) / basededatos / (nombre + ".indice"));
}

std::vector<std::string> PierodevBBDD::listarIndices() const {
    std::vector<std::string> nombres;
    if (basededatos.empty()) return nombres;
    for (const auto& entrada : archivos::directory_iterator(archivos::path(instalacion) / basededatos)) {
        if (entrada.is_regular_file() && entrada.path().extension() == ".indice") {
            nombres.push_back(entrada.path().stem().string());
        }
    }
    std::sort(nombres.begin(), nombres.end());
    return nombres;
}

std::vector<std::string> PierodevBBDD::listarIndicesTabla(const std::string& tabla) const {
    std::vector<std::string> resultado;
    if (basededatos.empty() || !nombreIndiceValido(tabla)) return resultado;
    for (const auto& nombre : listarIndices()) {
        std::string tablaIndice, columnaIndice;
        auto ruta = archivos::path(instalacion) / basededatos / (nombre + ".indice");
        if (leerDefinicion(ruta, tablaIndice, columnaIndice) && tablaIndice == tabla)
            resultado.push_back(nombre);
    }
    return resultado;
}

std::string PierodevBBDD::indicePara(const std::string& tabla, const std::string& columna) const {
    if (basededatos.empty()) return "";
    for (const auto& nombre : listarIndices()) {
        std::string tablaIndice, columnaIndice;
        auto ruta = archivos::path(instalacion) / basededatos / (nombre + ".indice");
        if (leerDefinicion(ruta, tablaIndice, columnaIndice) &&
            tablaIndice == tabla && columnaIndice == columna) return nombre;
    }
    return "";
}

void PierodevBBDD::actualizarIndicesTabla(const std::string& tabla) const {
    for (const auto& nombre : listarIndices()) {
        auto ruta = archivos::path(instalacion) / basededatos / (nombre + ".indice");
        std::string tablaIndice, columna;
        if (!leerDefinicion(ruta, tablaIndice, columna) || tablaIndice != tabla) continue;
        auto esquema = obtenerEsquema(tabla);
        if (std::find(esquema.begin(), esquema.end(), columna) == esquema.end()) {
            archivos::remove(ruta);
            continue;
        }
        std::ofstream archivo(ruta, std::ios::trunc);
        archivo << tabla << ',' << columna << '\n';
        for (const auto& fila : listarTodo(tabla)) {
            archivo << std::quoted(fila.at(columna)) << ' ' << fila.at("id") << '\n';
        }
    }
}

void PierodevBBDD::eliminarIndicesTabla(const std::string& tabla) {
    for (const auto& nombre : listarIndices()) {
        auto ruta = archivos::path(instalacion) / basededatos / (nombre + ".indice");
        std::string tablaIndice, columna;
        if (leerDefinicion(ruta, tablaIndice, columna) && tablaIndice == tabla) archivos::remove(ruta);
    }
}

bool PierodevBBDD::buscarConIndice(
    const std::string& tabla, const std::string& columna, const std::string& valor,
    std::vector<std::map<std::string,std::string>>& filas) const {
    for (const auto& nombre : listarIndices()) {
        auto ruta = archivos::path(instalacion) / basededatos / (nombre + ".indice");
        std::string tablaIndice, columnaIndice;
        if (!leerDefinicion(ruta, tablaIndice, columnaIndice) ||
            tablaIndice != tabla || columnaIndice != columna) continue;
        if (archivos::last_write_time(ruta) < archivos::last_write_time(rutaTabla(tabla, ".csv"))) {
            actualizarIndicesTabla(tabla);
        }
        std::ifstream archivo(ruta);
        std::string cabecera, valorIndice;
        std::getline(archivo, cabecera);
        long long id;
        while (archivo >> std::quoted(valorIndice) >> id) {
            if (valorIndice != valor) continue;
            auto fila = seleccionar(tabla, id);
            if (!fila.empty() && fila.at(columna) == valor) filas.push_back(std::move(fila));
        }
        return true;
    }
    return false;
}
