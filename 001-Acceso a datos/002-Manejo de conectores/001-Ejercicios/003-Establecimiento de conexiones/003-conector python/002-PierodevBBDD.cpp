#include "002-PierodevBBDD.hpp"

#include <algorithm>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <regex>
#include <sstream>
#include <stdexcept>

namespace archivos = std::filesystem;

std::string PierodevSerializador::serializar(
    const std::vector<std::string>& lista, char delimitador) const {
    std::string cadena;
    for (std::size_t i = 0; i < lista.size(); ++i) {
        if (i > 0) cadena += delimitador;
        cadena += lista[i];
    }
    return cadena;
}

std::vector<std::string> PierodevSerializador::deserializar(
    const std::string& cadena, char delimitador) const {
    std::vector<std::string> lista;
    std::stringstream entrada(cadena);
    std::string elemento;
    while (std::getline(entrada, elemento, delimitador)) lista.push_back(elemento);
    if (!cadena.empty() && cadena.back() == delimitador) lista.push_back("");
    return lista;
}

PierodevBBDD::PierodevBBDD(const std::string& rutaConfiguracion)
    : tamanoRegistro(0) {
    std::ifstream archivo(rutaConfiguracion);
    if (!archivo) throw std::runtime_error("No se ha encontrado config.json: " + rutaConfiguracion);
    std::string configuracion((std::istreambuf_iterator<char>(archivo)), {});
    std::smatch coincidencia;
    if (!std::regex_search(configuracion, coincidencia,
            std::regex("\"instalacion\"\\s*:\\s*\"([^\"]+)\""))) {
        throw std::runtime_error("Falta 'instalacion' en config.json");
    }
    instalacion = coincidencia[1].str();
    if (!std::regex_search(configuracion, coincidencia,
            std::regex("\"tamanoRegistro\"\\s*:\\s*([0-9]+)"))) {
        throw std::runtime_error("Falta 'tamanoRegistro' en config.json");
    }
    tamanoRegistro = std::stoull(coincidencia[1].str());
    if (tamanoRegistro < 2) throw std::runtime_error("tamanoRegistro debe ser mayor que 1");
    if (!archivos::is_directory(instalacion)) {
        throw std::runtime_error("No existe la carpeta de instalacion: " + instalacion);
    }
}

std::string PierodevBBDD::rutaTabla(
    const std::string& tabla, const std::string& extension) const {
    return (archivos::path(instalacion) / basededatos / (tabla + extension)).string();
}

std::string PierodevBBDD::quitarRelleno(std::string cadena) {
    while (!cadena.empty() && (cadena.back() == ' ' || cadena.back() == '\n')) cadena.pop_back();
    return cadena;
}

std::string PierodevBBDD::prepararRegistro(
    const std::vector<std::string>& elementos) const {
    std::string registro = PierodevSerializador().serializar(elementos);
    if (registro.size() > tamanoRegistro - 1) {
        throw std::runtime_error("El registro supera el tamano permitido");
    }
    registro.append(tamanoRegistro - 1 - registro.size(), ' ');
    registro += '\n';
    return registro;
}

bool PierodevBBDD::creaBaseDatos(const std::string& nombre) {
    try {
        return archivos::create_directory(archivos::path(instalacion) / nombre);
    } catch (const std::exception& error) {
        std::cerr << "Error al crear la base de datos: " << error.what() << '\n';
        return false;
    }
}

bool PierodevBBDD::usaBaseDatos(const std::string& nombre) {
    if (!archivos::is_directory(archivos::path(instalacion) / nombre)) return false;
    basededatos = nombre;
    return true;
}

bool PierodevBBDD::creaTabla(const std::string& nombre, const std::string& esquema) {
    if (basededatos.empty() || archivos::exists(rutaTabla(nombre, ".csv"))) return false;
    std::ofstream datos(rutaTabla(nombre, ".csv"), std::ios::binary);
    std::ofstream esquemaArchivo(rutaTabla(nombre, ".esquema"));
    std::ofstream indice(rutaTabla(nombre, ".idx"));
    if (!datos || !esquemaArchivo || !indice) return false;
    esquemaArchivo << "id,activo," << esquema;
    return bool(esquemaArchivo);
}

std::vector<std::string> PierodevBBDD::obtenerEsquema(const std::string& tabla) const {
    std::ifstream archivo(rutaTabla(tabla, ".esquema"));
    if (!archivo) return {};
    std::string esquema((std::istreambuf_iterator<char>(archivo)), {});
    return PierodevSerializador().deserializar(esquema);
}

bool PierodevBBDD::validarDatos(
    const std::string& tabla, const std::vector<std::string>& datos) const {
    auto esquema = obtenerEsquema(tabla);
    return esquema.size() >= 2 && datos.size() == esquema.size() - 2;
}

long long PierodevBBDD::siguienteId(const std::string& tabla) const {
    std::ifstream indice(rutaTabla(tabla, ".idx"));
    if (!indice) return -1;
    long long ultimo = 0;
    std::string linea;
    while (std::getline(indice, linea)) {
        if (!linea.empty()) ultimo = std::stoll(linea.substr(0, linea.find(',')));
    }
    return ultimo + 1;
}

long long PierodevBBDD::insertarDatos(
    const std::string& tabla, const std::vector<std::string>& datos) {
    try {
        if (basededatos.empty() || !archivos::exists(rutaTabla(tabla, ".csv")) ||
            !validarDatos(tabla, datos)) return -1;
        long long id = siguienteId(tabla);
        if (id < 0) return -1;
        std::vector<std::string> elementos = {std::to_string(id), "1"};
        elementos.insert(elementos.end(), datos.begin(), datos.end());
        std::string registro = prepararRegistro(elementos);
        std::ofstream archivo(rutaTabla(tabla, ".csv"), std::ios::binary | std::ios::app);
        std::ofstream indice(rutaTabla(tabla, ".idx"), std::ios::app);
        if (!archivo || !indice) return -1;
        auto posicion = archivos::file_size(rutaTabla(tabla, ".csv"));
        archivo.write(registro.data(), static_cast<std::streamsize>(registro.size()));
        archivo.flush();
        if (!archivo) return -1;
        indice << id << ',' << posicion << '\n';
        return indice ? id : -1;
    } catch (const std::exception& error) {
        std::cerr << "Error al insertar datos: " << error.what() << '\n';
        return -1;
    }
}

std::int64_t PierodevBBDD::buscarPosicion(const std::string& tabla, long long id) const {
    std::ifstream indice(rutaTabla(tabla, ".idx"));
    std::string linea;
    while (std::getline(indice, linea)) {
        auto coma = linea.find(',');
        if (coma != std::string::npos && std::stoll(linea.substr(0, coma)) == id) {
            return std::stoll(linea.substr(coma + 1));
        }
    }
    return -1;
}

std::vector<std::string> PierodevBBDD::leerRegistro(
    const std::string& tabla, long long id) const {
    auto posicion = buscarPosicion(tabla, id);
    if (posicion < 0) return {};
    std::ifstream archivo(rutaTabla(tabla, ".csv"), std::ios::binary);
    if (!archivo) return {};
    archivo.seekg(posicion);
    std::string registro(tamanoRegistro, '\0');
    archivo.read(registro.data(), static_cast<std::streamsize>(tamanoRegistro));
    if (archivo.gcount() != static_cast<std::streamsize>(tamanoRegistro)) return {};
    auto elementos = PierodevSerializador().deserializar(quitarRelleno(registro));
    if (elementos.size() < 2 || elementos[1] == "0") return {};
    return elementos;
}

std::map<std::string, std::string> PierodevBBDD::seleccionar(
    const std::string& tabla, long long id) const {
    auto esquema = obtenerEsquema(tabla);
    auto registro = leerRegistro(tabla, id);
    if (registro.size() != esquema.size()) return {};
    std::map<std::string, std::string> resultado;
    for (std::size_t i = 0; i < esquema.size(); ++i) resultado[esquema[i]] = registro[i];
    return resultado;
}

std::vector<std::map<std::string, std::string>> PierodevBBDD::listarTodo(
    const std::string& tabla) const {
    std::vector<std::map<std::string, std::string>> resultados;
    auto esquema = obtenerEsquema(tabla);
    if (esquema.empty()) return resultados;
    std::ifstream archivo(rutaTabla(tabla, ".csv"), std::ios::binary);
    std::string bloque(tamanoRegistro, '\0');
    while (archivo.read(bloque.data(), static_cast<std::streamsize>(tamanoRegistro))) {
        auto registro = PierodevSerializador().deserializar(quitarRelleno(bloque));
        if (registro.size() != esquema.size() || registro[1] != "1") continue;
        std::map<std::string, std::string> resultado;
        for (std::size_t i = 0; i < esquema.size(); ++i) resultado[esquema[i]] = registro[i];
        resultados.push_back(resultado);
    }
    return resultados;
}

std::vector<std::map<std::string, std::string>> PierodevBBDD::buscarColumna(
    const std::string& tabla, const std::string& columna, const std::string& valor) const {
    auto esquema = obtenerEsquema(tabla);
    if (std::find(esquema.begin(), esquema.end(), columna) == esquema.end()) return {};
    std::vector<std::map<std::string, std::string>> resultados;
    for (const auto& registro : listarTodo(tabla)) {
        if (registro.at(columna) == valor) resultados.push_back(registro);
    }
    return resultados;
}

bool PierodevBBDD::actualizar(
    const std::string& tabla, long long id, const std::vector<std::string>& datos) {
    try {
        auto posicion = buscarPosicion(tabla, id);
        if (posicion < 0 || leerRegistro(tabla, id).empty() || !validarDatos(tabla, datos)) return false;
        std::vector<std::string> elementos = {std::to_string(id), "1"};
        elementos.insert(elementos.end(), datos.begin(), datos.end());
        auto registro = prepararRegistro(elementos);
        std::fstream archivo(rutaTabla(tabla, ".csv"), std::ios::binary | std::ios::in | std::ios::out);
        archivo.seekp(posicion);
        archivo.write(registro.data(), static_cast<std::streamsize>(registro.size()));
        return bool(archivo);
    } catch (const std::exception& error) {
        std::cerr << "Error al actualizar el registro: " << error.what() << '\n';
        return false;
    }
}

bool PierodevBBDD::eliminar(const std::string& tabla, long long id) {
    try {
        auto posicion = buscarPosicion(tabla, id);
        auto elementos = leerRegistro(tabla, id);
        if (posicion < 0 || elementos.empty()) return false;
        elementos[1] = "0";
        auto registro = prepararRegistro(elementos);
        std::fstream archivo(rutaTabla(tabla, ".csv"), std::ios::binary | std::ios::in | std::ios::out);
        archivo.seekp(posicion);
        archivo.write(registro.data(), static_cast<std::streamsize>(registro.size()));
        return bool(archivo);
    } catch (const std::exception& error) {
        std::cerr << "Error al eliminar el registro: " << error.what() << '\n';
        return false;
    }
}

bool PierodevBBDD::compactar(const std::string& tabla) {
    try {
        if (basededatos.empty()) return false;
        std::string rutaDatos = rutaTabla(tabla, ".csv");
        std::string rutaIndice = rutaTabla(tabla, ".idx");
        std::string datosTemporales = rutaDatos + ".tmp";
        std::string indiceTemporal = rutaIndice + ".tmp";
        std::string copiaDatos = rutaDatos + ".bak";
        std::string copiaIndice = rutaIndice + ".bak";
        if (!archivos::exists(rutaDatos) || !archivos::exists(rutaIndice)) return false;
        if (archivos::exists(datosTemporales) || archivos::exists(indiceTemporal) ||
            archivos::exists(copiaDatos) || archivos::exists(copiaIndice)) return false;
        std::vector<std::string> identificadores;
        std::ifstream indice(rutaIndice);
        std::string linea;
        while (std::getline(indice, linea)) {
            if (!linea.empty()) identificadores.push_back(linea.substr(0, linea.find(',')));
        }
        indice.close();

        std::ifstream datos(rutaDatos, std::ios::binary);
        std::ofstream temporal(datosTemporales, std::ios::binary);
        if (!datos || !temporal) return false;
        std::map<std::string, std::int64_t> posicionesActivas;
        std::string bloque(tamanoRegistro, '\0');
        while (datos.read(bloque.data(), static_cast<std::streamsize>(tamanoRegistro))) {
            auto elementos = PierodevSerializador().deserializar(quitarRelleno(bloque));
            if (elementos.size() > 1 && elementos[1] == "1") {
                posicionesActivas[elementos[0]] = static_cast<std::int64_t>(temporal.tellp());
                temporal.write(bloque.data(), static_cast<std::streamsize>(bloque.size()));
            }
        }
        if (!datos.eof() || !temporal) return false;
        datos.close();
        temporal.close();
        if (!temporal) return false;
        std::ofstream nuevoIndice(indiceTemporal);
        if (!nuevoIndice) return false;
        for (const auto& identificador : identificadores) {
            auto encontrado = posicionesActivas.find(identificador);
            nuevoIndice << identificador << ','
                         << (encontrado == posicionesActivas.end() ? -1 : encontrado->second)
                         << '\n';
        }
        nuevoIndice.close();
        if (!nuevoIndice) return false;

        archivos::rename(rutaDatos, copiaDatos);
        try {
            archivos::rename(rutaIndice, copiaIndice);
            try {
                archivos::rename(datosTemporales, rutaDatos);
                archivos::rename(indiceTemporal, rutaIndice);
            } catch (...) {
                if (archivos::exists(rutaDatos)) archivos::remove(rutaDatos);
                archivos::rename(copiaIndice, rutaIndice);
                throw;
            }
        } catch (...) {
            archivos::rename(copiaDatos, rutaDatos);
            throw;
        }
        std::error_code errorLimpieza;
        archivos::remove(copiaDatos, errorLimpieza);
        archivos::remove(copiaIndice, errorLimpieza);
        return true;
    } catch (const std::exception& error) {
        std::cerr << "Error al compactar la tabla: " << error.what() << '\n';
        return false;
    }
}
