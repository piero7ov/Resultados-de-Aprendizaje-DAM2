#include "002-PierodevBBDD.hpp"

#include <algorithm>
#include <array>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <regex>
#include <sstream>
#include <stdexcept>
#include <utility>

namespace archivos = std::filesystem;

namespace {

bool nombreValido(const std::string& nombre) {
    if (nombre.empty() || nombre == "." || nombre == ".." ||
        nombre.front() == ' ' || nombre.back() == ' ' || nombre.back() == '.') return false;
    for (unsigned char caracter : nombre) {
        if (caracter < 32 || caracter == 127 || caracter == '/' || caracter == '\\' ||
            caracter == ':' || caracter == ',' || caracter == '<' || caracter == '>' ||
            caracter == '"' || caracter == '|' || caracter == '?' || caracter == '*') return false;
    }
    return true;
}

bool archivosTablaCompletos(const std::array<archivos::path, 3>& rutas) {
    for (const auto& ruta : rutas) {
        if (!archivos::is_regular_file(ruta) || archivos::is_symlink(ruta)) return false;
    }
    return true;
}

struct LimpiarTemporales {
    std::vector<archivos::path> rutas;
    ~LimpiarTemporales() {
        for (const auto& ruta : rutas) {
            std::error_code error;
            archivos::remove(ruta, error);
        }
    }
};

bool sustituirArchivos(const std::vector<archivos::path>& originales) {
    std::size_t respaldados = 0;
    std::size_t instalados = 0;
    try {
        for (const auto& original : originales) {
            if (!archivos::is_regular_file(original) || archivos::is_symlink(original) ||
                !archivos::is_regular_file(original.string() + ".tmpddl") ||
                archivos::exists(original.string() + ".bakddl")) return false;
        }
        for (const auto& original : originales) {
            archivos::rename(original, original.string() + ".bakddl");
            ++respaldados;
        }
        for (const auto& original : originales) {
            archivos::rename(original.string() + ".tmpddl", original);
            ++instalados;
        }
    } catch (...) {
        for (std::size_t i = 0; i < instalados; ++i) {
            std::error_code error;
            archivos::remove(originales[i], error);
        }
        for (std::size_t i = respaldados; i > 0; --i) {
            std::error_code error;
            archivos::rename(originales[i - 1].string() + ".bakddl", originales[i - 1], error);
        }
        throw;
    }
    for (const auto& original : originales) {
        std::error_code error;
        archivos::remove(original.string() + ".bakddl", error);
    }
    return true;
}

} // namespace

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
    archivos::path rutaElegida = rutaConfiguracion;
    if (!archivos::exists(rutaElegida)) {
        const char* variable = std::getenv("PIERODEV_CONFIG");
        if (variable != nullptr && variable[0] != '\0') {
            rutaElegida = variable;
        } else {
            const char* perfil = std::getenv("APPDATA");
            if (perfil == nullptr || perfil[0] == '\0') {
                throw std::runtime_error("No se ha encontrado config.json ni APPDATA");
            }
            rutaElegida = archivos::path(perfil) / "PierodevBBDD" / "config.json";
        }
    }
    std::ifstream archivo(rutaElegida);
    if (!archivo) throw std::runtime_error("No se puede abrir la configuracion: " + rutaElegida.string());
    std::string configuracion((std::istreambuf_iterator<char>(archivo)), {});
    std::smatch coincidencia;
    if (!std::regex_search(configuracion, coincidencia,
            std::regex("\"instalacion\"\\s*:\\s*\"([^\"]+)\""))) {
        throw std::runtime_error("Falta 'instalacion' en config.json");
    }
    archivos::path rutaInstalacion = coincidencia[1].str();
    if (rutaInstalacion.is_relative()) rutaInstalacion = archivos::absolute(rutaElegida).parent_path() / rutaInstalacion;
    instalacion = rutaInstalacion.lexically_normal().string();
    if (!std::regex_search(configuracion, coincidencia,
            std::regex("\"tamanoRegistro\"\\s*:\\s*([0-9]+)"))) {
        throw std::runtime_error("Falta 'tamanoRegistro' en config.json");
    }
    tamanoRegistro = std::stoull(coincidencia[1].str());
    if (tamanoRegistro < 2) throw std::runtime_error("tamanoRegistro debe ser mayor que 1");
    archivos::create_directories(instalacion);
}

const std::string& PierodevBBDD::obtenerInstalacion() const { return instalacion; }
std::size_t PierodevBBDD::obtenerTamanoRegistro() const { return tamanoRegistro; }

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

bool PierodevBBDD::cambiarColumnas(const std::string& tabla,
    const std::vector<std::string>& esquema, std::size_t posicion, bool anadir) {
    archivos::path datos = rutaTabla(tabla, ".csv");
    archivos::path indice = rutaTabla(tabla, ".idx");
    archivos::path esquemaArchivo = rutaTabla(tabla, ".esquema");
    archivos::path datosTemporal = datos.string() + ".tmpddl";
    archivos::path esquemaTemporal = esquemaArchivo.string() + ".tmpddl";
    if (!archivosTablaCompletos({datos, indice, esquemaArchivo}) ||
        archivos::exists(datosTemporal) || archivos::exists(esquemaTemporal) ||
        archivos::exists(datos.string() + ".bakddl") ||
        archivos::exists(esquemaArchivo.string() + ".bakddl")) return false;
    LimpiarTemporales limpiar{{datosTemporal, esquemaTemporal}};

    try {
        std::ifstream entrada(datos, std::ios::binary);
        std::ofstream salida(datosTemporal, std::ios::binary);
        std::ofstream nuevoEsquema(esquemaTemporal);
        if (!entrada || !salida || !nuevoEsquema) return false;
        nuevoEsquema << PierodevSerializador().serializar(esquema);
        if (!nuevoEsquema) return false;

        const std::size_t cantidadAnterior = anadir ? esquema.size() - 1 : esquema.size() + 1;
        std::string bloque(tamanoRegistro, '\0');
        while (entrada.read(bloque.data(), static_cast<std::streamsize>(tamanoRegistro))) {
            auto registro = PierodevSerializador().deserializar(quitarRelleno(bloque));
            if (registro.size() != cantidadAnterior) return false;
            if (anadir) registro.push_back("");
            else registro.erase(registro.begin() + static_cast<std::ptrdiff_t>(posicion));
            auto nuevo = prepararRegistro(registro);
            salida.write(nuevo.data(), static_cast<std::streamsize>(nuevo.size()));
            if (!salida) return false;
        }
        if (!entrada.eof() || entrada.gcount() != 0) return false;
        entrada.close();
        salida.close();
        nuevoEsquema.close();
        if (!salida || !nuevoEsquema) return false;
        return sustituirArchivos({datos, esquemaArchivo});
    } catch (const std::exception& error) {
        std::cerr << "Error al cambiar las columnas: " << error.what() << '\n';
        return false;
    }
}

bool PierodevBBDD::alterarAnadirColumna(const std::string& tabla, const std::string& columna) {
    if (basededatos.empty() || !nombreValido(tabla) || !nombreValido(columna)) return false;
    auto esquema = obtenerEsquema(tabla);
    if (esquema.size() < 2 || std::find(esquema.begin(), esquema.end(), columna) != esquema.end()) return false;
    esquema.push_back(columna);
    return cambiarColumnas(tabla, esquema, esquema.size() - 1, true);
}

bool PierodevBBDD::alterarEliminarColumna(const std::string& tabla, const std::string& columna) {
    if (basededatos.empty() || !nombreValido(tabla) || !nombreValido(columna) ||
        columna == "id" || columna == "activo") return false;
    auto esquema = obtenerEsquema(tabla);
    auto encontrada = std::find(esquema.begin(), esquema.end(), columna);
    if (encontrada == esquema.end()) return false;
    std::size_t posicion = static_cast<std::size_t>(encontrada - esquema.begin());
    esquema.erase(encontrada);
    return cambiarColumnas(tabla, esquema, posicion, false);
}

bool PierodevBBDD::alterarRenombrarColumna(
    const std::string& tabla, const std::string& anterior, const std::string& nueva) {
    if (basededatos.empty() || !nombreValido(tabla) || !nombreValido(anterior) ||
        !nombreValido(nueva) || anterior == "id" || anterior == "activo") return false;
    auto esquema = obtenerEsquema(tabla);
    auto encontrada = std::find(esquema.begin(), esquema.end(), anterior);
    if (encontrada == esquema.end() ||
        std::find(esquema.begin(), esquema.end(), nueva) != esquema.end()) return false;
    archivos::path ruta = rutaTabla(tabla, ".esquema");
    archivos::path temporal = ruta.string() + ".tmpddl";
    if (!archivos::is_regular_file(ruta) || archivos::is_symlink(ruta) ||
        archivos::exists(temporal) || archivos::exists(ruta.string() + ".bakddl")) return false;
    LimpiarTemporales limpiar{{temporal}};
    *encontrada = nueva;
    std::ofstream archivo(temporal);
    archivo << PierodevSerializador().serializar(esquema);
    archivo.close();
    if (!archivo) return false;
    try { return sustituirArchivos({ruta}); }
    catch (const std::exception& error) {
        std::cerr << "Error al renombrar la columna: " << error.what() << '\n';
        return false;
    }
}

bool PierodevBBDD::alterarRenombrarTabla(const std::string& anterior, const std::string& nueva) {
    if (basededatos.empty() || !nombreValido(anterior) || !nombreValido(nueva) || anterior == nueva) return false;
    const std::array<std::string, 3> extensiones = {".csv", ".esquema", ".idx"};
    std::array<archivos::path, 3> origenes;
    std::array<archivos::path, 3> destinos;
    for (std::size_t i = 0; i < extensiones.size(); ++i) {
        origenes[i] = rutaTabla(anterior, extensiones[i]);
        destinos[i] = rutaTabla(nueva, extensiones[i]);
        if (archivos::exists(destinos[i])) return false;
    }
    if (!archivosTablaCompletos(origenes)) return false;
    std::size_t renombrados = 0;
    try {
        for (std::size_t i = 0; i < origenes.size(); ++i) {
            archivos::rename(origenes[i], destinos[i]);
            ++renombrados;
        }
        return true;
    } catch (const std::exception& error) {
        for (std::size_t i = renombrados; i > 0; --i) {
            std::error_code errorRestauracion;
            archivos::rename(destinos[i - 1], origenes[i - 1], errorRestauracion);
        }
        std::cerr << "Error al renombrar la tabla: " << error.what() << '\n';
        return false;
    }
}

bool PierodevBBDD::truncarTabla(const std::string& tabla) {
    if (basededatos.empty() || !nombreValido(tabla)) return false;
    archivos::path datos = rutaTabla(tabla, ".csv");
    archivos::path indice = rutaTabla(tabla, ".idx");
    archivos::path esquema = rutaTabla(tabla, ".esquema");
    if (!archivosTablaCompletos({datos, indice, esquema}) ||
        archivos::exists(datos.string() + ".tmpddl") ||
        archivos::exists(indice.string() + ".tmpddl") ||
        archivos::exists(datos.string() + ".bakddl") ||
        archivos::exists(indice.string() + ".bakddl")) return false;
    LimpiarTemporales limpiar{{datos.string() + ".tmpddl", indice.string() + ".tmpddl"}};
    std::ofstream nuevosDatos(datos.string() + ".tmpddl", std::ios::binary);
    std::ofstream nuevoIndice(indice.string() + ".tmpddl");
    if (!nuevosDatos || !nuevoIndice) return false;
    nuevosDatos.close();
    nuevoIndice.close();
    if (!nuevosDatos || !nuevoIndice) return false;
    try { return sustituirArchivos({datos, indice}); }
    catch (const std::exception& error) {
        std::cerr << "Error al truncar la tabla: " << error.what() << '\n';
        return false;
    }
}

bool PierodevBBDD::eliminarTabla(const std::string& tabla) {
    if (basededatos.empty() || !nombreValido(tabla)) return false;
    const std::array<archivos::path, 3> rutas = {
        rutaTabla(tabla, ".csv"), rutaTabla(tabla, ".esquema"), rutaTabla(tabla, ".idx")};
    if (!archivosTablaCompletos(rutas)) return false;
    try {
        for (const auto& ruta : rutas) archivos::remove(ruta);
        return true;
    } catch (const std::exception& error) {
        std::cerr << "Error al eliminar la tabla: " << error.what() << '\n';
        return false;
    }
}

bool PierodevBBDD::eliminarBaseDatos(const std::string& nombre) {
    if (!nombreValido(nombre)) return false;
    archivos::path ruta = archivos::path(instalacion) / nombre;
    try {
        if (!archivos::is_directory(ruta) || archivos::is_symlink(ruta)) return false;
        archivos::remove_all(ruta);
        if (basededatos == nombre) basededatos.clear();
        return true;
    } catch (const std::exception& error) {
        std::cerr << "Error al eliminar la base de datos: " << error.what() << '\n';
        return false;
    }
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

long long PierodevBBDD::insertarConColumnas(
    const std::string& tabla, const std::vector<std::string>& columnas,
    const std::vector<std::string>& valores) {
    if (!nombreValido(tabla) || columnas.empty() || columnas.size() != valores.size()) return -1;
    auto esquema = obtenerEsquema(tabla);
    if (esquema.size() < 2) return -1;
    std::vector<std::string> datos(esquema.size() - 2, "");
    std::vector<bool> asignadas(datos.size(), false);
    for (std::size_t i = 0; i < columnas.size(); ++i) {
        if (!nombreValido(columnas[i])) return -1;
        auto encontrada = std::find(esquema.begin() + 2, esquema.end(), columnas[i]);
        if (encontrada == esquema.end()) return -1;
        std::size_t posicion = static_cast<std::size_t>(encontrada - (esquema.begin() + 2));
        if (asignadas[posicion]) return -1;
        datos[posicion] = valores[i];
        asignadas[posicion] = true;
    }
    return insertarDatos(tabla, datos);
}

long long PierodevBBDD::insertarDesdeTabla(
    const std::string& destino, const std::string& origen) {
    if (basededatos.empty() || !nombreValido(destino) || !nombreValido(origen)) return -1;
    auto esquemaDestino = obtenerEsquema(destino);
    auto esquemaOrigen = obtenerEsquema(origen);
    if (esquemaDestino.size() < 2 || esquemaOrigen.size() < 2 ||
        esquemaDestino.size() != esquemaOrigen.size()) return -1;
    auto filas = listarTodo(origen);
    std::vector<std::vector<std::string>> pendientes;
    long long proximoId = siguienteId(destino);
    if (proximoId < 0) return -1;
    try {
        for (const auto& fila : filas) {
            std::vector<std::string> datos;
            for (std::size_t i = 2; i < esquemaOrigen.size(); ++i)
                datos.push_back(fila.at(esquemaOrigen[i]));
            std::vector<std::string> registro = {std::to_string(proximoId++), "1"};
            registro.insert(registro.end(), datos.begin(), datos.end());
            prepararRegistro(registro);
            pendientes.push_back(std::move(datos));
        }
        long long insertados = 0;
        for (const auto& datos : pendientes) {
            if (insertarDatos(destino, datos) < 0) return -1;
            ++insertados;
        }
        return insertados;
    } catch (const std::exception& error) {
        std::cerr << "Error al insertar desde otra tabla: " << error.what() << '\n';
        return -1;
    }
}

long long PierodevBBDD::actualizarDonde(
    const std::string& tabla, const std::map<std::string, std::string>& cambios,
    const std::string& columnaDonde, const std::string& valorDonde) {
    if (basededatos.empty() || !nombreValido(tabla) || cambios.empty() ||
        (columnaDonde.empty() && !valorDonde.empty())) return -1;
    auto esquema = obtenerEsquema(tabla);
    if (esquema.size() < 2) return -1;
    for (const auto& [columna, valor] : cambios) {
        (void)valor;
        if (!nombreValido(columna) || columna == "id" || columna == "activo" ||
            std::find(esquema.begin() + 2, esquema.end(), columna) == esquema.end()) return -1;
    }
    if (!columnaDonde.empty() &&
        std::find(esquema.begin(), esquema.end(), columnaDonde) == esquema.end()) return -1;

    std::vector<std::pair<long long, std::vector<std::string>>> pendientes;
    try {
        for (const auto& fila : listarTodo(tabla)) {
            if (!columnaDonde.empty() && fila.at(columnaDonde) != valorDonde) continue;
            long long id = std::stoll(fila.at("id"));
            std::vector<std::string> datos;
            for (std::size_t i = 2; i < esquema.size(); ++i) {
                auto cambio = cambios.find(esquema[i]);
                datos.push_back(cambio == cambios.end() ? fila.at(esquema[i]) : cambio->second);
            }
            std::vector<std::string> registro = {std::to_string(id), "1"};
            registro.insert(registro.end(), datos.begin(), datos.end());
            prepararRegistro(registro);
            pendientes.emplace_back(id, std::move(datos));
        }
        long long actualizados = 0;
        for (const auto& [id, datos] : pendientes) {
            if (!actualizar(tabla, id, datos)) return -1;
            ++actualizados;
        }
        return actualizados;
    } catch (const std::exception& error) {
        std::cerr << "Error al actualizar registros: " << error.what() << '\n';
        return -1;
    }
}

long long PierodevBBDD::eliminarDonde(
    const std::string& tabla, const std::string& columnaDonde,
    const std::string& valorDonde) {
    if (basededatos.empty() || !nombreValido(tabla) ||
        (columnaDonde.empty() && !valorDonde.empty())) return -1;
    auto esquema = obtenerEsquema(tabla);
    if (esquema.size() < 2 ||
        (!columnaDonde.empty() &&
         std::find(esquema.begin(), esquema.end(), columnaDonde) == esquema.end())) return -1;
    try {
        long long eliminados = 0;
        for (const auto& fila : listarTodo(tabla)) {
            if (!columnaDonde.empty() && fila.at(columnaDonde) != valorDonde) continue;
            if (!eliminar(tabla, std::stoll(fila.at("id")))) return -1;
            ++eliminados;
        }
        return eliminados;
    } catch (const std::exception& error) {
        std::cerr << "Error al eliminar registros: " << error.what() << '\n';
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
