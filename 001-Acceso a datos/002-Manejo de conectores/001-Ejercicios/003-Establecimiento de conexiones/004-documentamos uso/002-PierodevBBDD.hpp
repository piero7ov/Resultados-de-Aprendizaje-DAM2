#pragma once

#include <cstdint>
#include <map>
#include <string>
#include <vector>

class PierodevSerializador {
public:
    std::string serializar(const std::vector<std::string>& lista, char delimitador = ',') const;
    std::vector<std::string> deserializar(const std::string& cadena, char delimitador = ',') const;
};

class PierodevBBDD {
public:
    explicit PierodevBBDD(const std::string& rutaConfiguracion = "config.json");
    const std::string& obtenerInstalacion() const;
    std::size_t obtenerTamanoRegistro() const;

    bool creaBaseDatos(const std::string& nombre);
    bool usaBaseDatos(const std::string& nombre);
    bool creaTabla(const std::string& nombre, const std::string& esquema);
    std::vector<std::string> obtenerEsquema(const std::string& tabla) const;
    bool validarDatos(const std::string& tabla, const std::vector<std::string>& datos) const;
    long long siguienteId(const std::string& tabla) const;
    long long insertarDatos(const std::string& tabla, const std::vector<std::string>& datos);
    std::int64_t buscarPosicion(const std::string& tabla, long long id) const;
    std::vector<std::string> leerRegistro(const std::string& tabla, long long id) const;
    std::map<std::string, std::string> seleccionar(const std::string& tabla, long long id) const;
    std::vector<std::map<std::string, std::string>> listarTodo(const std::string& tabla) const;
    std::vector<std::map<std::string, std::string>> buscarColumna(
        const std::string& tabla, const std::string& columna, const std::string& valor) const;
    bool actualizar(const std::string& tabla, long long id, const std::vector<std::string>& datos);
    bool eliminar(const std::string& tabla, long long id);
    bool compactar(const std::string& tabla);

private:
    std::string instalacion;
    std::string basededatos;
    std::size_t tamanoRegistro;

    std::string rutaTabla(const std::string& tabla, const std::string& extension) const;
    std::string prepararRegistro(const std::vector<std::string>& elementos) const;
    static std::string quitarRelleno(std::string cadena);
};
