#include "002-UnicornBBDD.hpp"

#include <filesystem>
#include <fstream>
#include <map>
#include <regex>
#include <stdexcept>

namespace archivos = std::filesystem;

bool UnicornBBDD::cambiarColumnas(const std::string& tabla,
                                   const std::vector<std::string>& esquema,
                                   std::size_t posicion, bool anadir) {
    auto esquemaAnterior = obtenerEsquema(tabla);
    if (!anadir && posicion >= esquemaAnterior.size()) return false;
    auto columnaAfectada = anadir ? esquema.back() : esquemaAnterior[posicion];
    auto datos = archivos::path(rutaTabla(tabla, ".csv"));
    auto esquemaArchivo = archivos::path(rutaTabla(tabla, ".esquema"));
    auto datosTemporal = archivos::path(datos.string() + ".tmpddl");
    auto esquemaTemporal = archivos::path(esquemaArchivo.string() + ".tmpddl");
    auto datosCopia = archivos::path(datos.string() + ".bakddl");
    auto esquemaCopia = archivos::path(esquemaArchivo.string() + ".bakddl");
    if (!archivos::is_regular_file(datos) || !archivos::is_regular_file(esquemaArchivo) ||
        archivos::is_symlink(datos) || archivos::is_symlink(esquemaArchivo) ||
        archivos::exists(datosTemporal) || archivos::exists(esquemaTemporal) ||
        archivos::exists(datosCopia) || archivos::exists(esquemaCopia)) return false;

    auto limpiarTemporales = [&] {
        std::error_code error;
        archivos::remove(datosTemporal, error);
        archivos::remove(esquemaTemporal, error);
    };
    try {
        std::ifstream entrada(datos, std::ios::binary);
        std::ofstream salida(datosTemporal, std::ios::binary);
        std::ofstream nuevoEsquema(esquemaTemporal);
        if (!entrada || !salida || !nuevoEsquema) {
            entrada.close(); salida.close(); nuevoEsquema.close();
            limpiarTemporales(); return false;
        }
        nuevoEsquema << UnicornSerializador().serializar(esquema);
        std::string bloque(tamanoRegistro, '\0');
        std::size_t cantidadAnterior = anadir ? esquema.size() - 1 : esquema.size() + 1;
        while (entrada.read(bloque.data(), static_cast<std::streamsize>(tamanoRegistro))) {
            auto registro = UnicornSerializador().desserializar(trimDerecha(bloque));
            if (registro.size() != cantidadAnterior) {
                salida.close(); nuevoEsquema.close(); limpiarTemporales(); return false;
            }
            if (anadir) registro.push_back("");
            else registro.erase(registro.begin() + static_cast<std::ptrdiff_t>(posicion));
            auto nuevo = prepararRegistro(registro);
            salida.write(nuevo.data(), static_cast<std::streamsize>(nuevo.size()));
        }
        bool correcto = entrada.eof() && entrada.gcount() == 0 && bool(salida) && bool(nuevoEsquema);
        entrada.close(); salida.close(); nuevoEsquema.close();
        if (!correcto || !salida || !nuevoEsquema) { limpiarTemporales(); return false; }
    } catch (...) {
        limpiarTemporales();
        return false;
    }

    try {
        archivos::rename(datos, datosCopia);
        archivos::rename(esquemaArchivo, esquemaCopia);
        archivos::rename(datosTemporal, datos);
        archivos::rename(esquemaTemporal, esquemaArchivo);
    } catch (...) {
        std::error_code error;
        if (archivos::exists(datosCopia)) {
            archivos::remove(datos, error);
            archivos::rename(datosCopia, datos, error);
        }
        if (archivos::exists(esquemaCopia)) {
            archivos::remove(esquemaArchivo, error);
            archivos::rename(esquemaCopia, esquemaArchivo, error);
        }
        limpiarTemporales();
        return false;
    }
    std::error_code error;
    archivos::remove(datosCopia, error);
    archivos::remove(esquemaCopia, error);

    auto rutaTipos = archivos::path(rutaTabla(tabla, ".tipos"));
    if (anadir) {
        std::ofstream tipos(rutaTipos, std::ios::app);
        tipos << columnaAfectada << ",TEXTO\n";
    } else if (archivos::exists(rutaTipos)) {
        std::ifstream tipos(rutaTipos);
        std::vector<std::string> lineas;
        std::string linea;
        while (std::getline(tipos, linea)) {
            if (linea.rfind(columnaAfectada + ",", 0) != 0) lineas.push_back(linea);
        }
        tipos.close();
        std::ofstream salida(rutaTipos, std::ios::trunc);
        for (const auto& actual : lineas) salida << actual << '\n';
    }
    if (!anadir) {
        auto rutaRelaciones = archivos::path(rutaTabla(tabla, ".rel"));
        if (archivos::exists(rutaRelaciones)) {
            std::ifstream relaciones(rutaRelaciones);
            std::vector<std::string> lineas;
            std::string linea;
            while (std::getline(relaciones, linea)) {
                auto primera = linea.find(',');
                auto segunda = primera == std::string::npos ? std::string::npos : linea.find(',', primera + 1);
                auto columna = primera == std::string::npos ? "" : linea.substr(primera + 1, segunda - primera - 1);
                if (columna != columnaAfectada) lineas.push_back(linea);
            }
            relaciones.close();
            std::ofstream salida(rutaRelaciones, std::ios::trunc);
            for (const auto& actual : lineas) salida << actual << '\n';
        }
    }
    actualizarIndicesTabla(tabla);
    return true;
}

bool UnicornBBDD::alterarRenombrarTabla(const std::string& anterior, const std::string& nueva) {
    static const std::regex nombreValido("[A-Za-z_][A-Za-z0-9_]*");
    if (basededatos.empty() || anterior == nueva ||
        !std::regex_match(anterior, nombreValido) || !std::regex_match(nueva, nombreValido)) return false;
    auto carpeta = archivos::path(instalacion) / basededatos;
    for (const auto& nombre : listarIndices()) {
        std::ifstream indice(carpeta / (nombre + ".indice"));
        std::string definicion;
        std::getline(indice, definicion);
        if (definicion.rfind(anterior + ",", 0) == 0) return false;
    }
    for (const auto& entrada : archivos::directory_iterator(carpeta)) {
        if (entrada.path().extension() != ".rel") continue;
        std::ifstream relaciones(entrada.path());
        std::string linea;
        while (std::getline(relaciones, linea)) {
            if (linea.find("," + anterior + ",") != std::string::npos) return false;
        }
    }
    std::vector<std::pair<archivos::path, archivos::path>> cambios;
    for (const auto& extension : {".csv", ".esquema", ".idx", ".rel", ".tipos", ".ultimo"}) {
        auto origen = carpeta / (anterior + extension);
        auto destino = carpeta / (nueva + extension);
        if (archivos::exists(destino)) return false;
        if (archivos::exists(origen)) cambios.emplace_back(origen, destino);
    }
    if (cambios.size() < 3) return false;
    std::size_t hechos = 0;
    try {
        for (const auto& [origen, destino] : cambios) {
            archivos::rename(origen, destino);
            ++hechos;
        }
        return true;
    } catch (...) {
        for (std::size_t i = hechos; i > 0; --i) {
            std::error_code error;
            archivos::rename(cambios[i - 1].second, cambios[i - 1].first, error);
        }
        return false;
    }
}

bool UnicornBBDD::compactar(const std::string& tabla) {
    static const std::regex nombreValido("[A-Za-z_][A-Za-z0-9_]*");
    if (basededatos.empty() || !std::regex_match(tabla, nombreValido)) return false;
    auto rutaDatos = rutaTabla(tabla, ".csv");
    auto rutaIndice = rutaTabla(tabla, ".idx");
    auto datosTemporales = rutaDatos + ".tmp";
    auto indiceTemporal = rutaIndice + ".tmp";
    auto copiaDatos = rutaDatos + ".bak";
    auto copiaIndice = rutaIndice + ".bak";
    if (!archivos::is_regular_file(rutaDatos) || !archivos::is_regular_file(rutaIndice) ||
        archivos::exists(datosTemporales) || archivos::exists(indiceTemporal) ||
        archivos::exists(copiaDatos) || archivos::exists(copiaIndice)) return false;
    try {
        std::ifstream datos(rutaDatos, std::ios::binary);
        std::ofstream nuevosDatos(datosTemporales, std::ios::binary);
        std::map<std::string, std::int64_t> posiciones;
        std::string bloque(tamanoRegistro, '\0');
        while (datos.read(bloque.data(), static_cast<std::streamsize>(tamanoRegistro))) {
            auto campos = UnicornSerializador().desserializar(trimDerecha(bloque));
            if (campos.size() > 1 && campos[1] == "1") {
                posiciones[campos[0]] = static_cast<std::int64_t>(nuevosDatos.tellp());
                nuevosDatos.write(bloque.data(), static_cast<std::streamsize>(bloque.size()));
            }
        }
        if (!datos.eof() || !nuevosDatos) return false;
        datos.close();
        nuevosDatos.close();
        std::ifstream indice(rutaIndice);
        std::ofstream nuevoIndice(indiceTemporal);
        std::string linea;
        while (std::getline(indice, linea)) {
            auto separador = linea.find(',');
            if (separador == std::string::npos) continue;
            auto id = linea.substr(0, separador);
            auto encontrado = posiciones.find(id);
            nuevoIndice << id << ',' << (encontrado == posiciones.end() ? -1 : encontrado->second) << '\n';
        }
        nuevoIndice.close();
        if (!nuevoIndice) return false;
        archivos::rename(rutaDatos, copiaDatos);
        try {
            archivos::rename(rutaIndice, copiaIndice);
            archivos::rename(datosTemporales, rutaDatos);
            archivos::rename(indiceTemporal, rutaIndice);
        } catch (...) {
            std::error_code error;
            if (archivos::exists(rutaDatos)) archivos::remove(rutaDatos, error);
            if (archivos::exists(rutaIndice)) archivos::remove(rutaIndice, error);
            archivos::rename(copiaDatos, rutaDatos, error);
            archivos::rename(copiaIndice, rutaIndice, error);
            return false;
        }
        archivos::remove(copiaDatos);
        archivos::remove(copiaIndice);
        actualizarIndicesTabla(tabla);
        return true;
    } catch (...) {
        return false;
    }
}
