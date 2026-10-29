#include "002-PierodevBBDD.hpp"

#include <iostream>
#include <sstream>

static std::vector<std::string> separar(const std::string& cadena) {
    return PierodevSerializador().deserializar(cadena);
}

static void imprimir(const std::map<std::string, std::string>& registro) {
    for (const auto& [columna, valor] : registro) std::cout << columna << '=' << valor << "  ";
    std::cout << '\n';
}

static void ayuda() {
    std::cout << R"(
Comandos:
  CREAR BASE nombre
  USAR nombre
  CREAR TABLA nombre campo1,campo2,campo3
  INSERTAR tabla valor1,valor2,valor3
  SELECCIONAR tabla id
  LISTAR tabla
  BUSCAR tabla columna valor
  ACTUALIZAR tabla id valor1,valor2,valor3
  ELIMINAR tabla id
  COMPACTAR tabla
  ESQUEMA tabla
  AYUDA
  SALIR
)";
}

int main(int cantidadArgumentos, char** argumentos) {
    try {
        std::string rutaConfiguracion = cantidadArgumentos > 1 ? argumentos[1] : "config.json";
        PierodevBBDD base(rutaConfiguracion);
        std::cout << "PierodevBBDD C++ - terminal\n";
        ayuda();

        std::string linea;
        std::string baseSeleccionada;
        while (std::cout << (baseSeleccionada.empty() ? "pierodev> " :
                            "pierodev[" + baseSeleccionada + "]> ") &&
               std::getline(std::cin, linea)) {
            std::istringstream entrada(linea);
            std::string comando, tabla, argumento;
            entrada >> comando;
            if (comando.empty()) continue;
            if (comando == "SALIR") break;
            if (comando == "AYUDA") { ayuda(); continue; }

            if (comando == "CREAR") {
                entrada >> argumento >> tabla;
                if (tabla.empty()) { std::cout << "ERROR: falta el nombre\n"; continue; }
                if (argumento == "BASE") {
                    std::cout << (base.creaBaseDatos(tabla) ? "OK\n" : "ERROR\n");
                } else if (argumento == "TABLA") {
                    std::string esquema;
                    std::getline(entrada >> std::ws, esquema);
                    std::cout << (!esquema.empty() && base.creaTabla(tabla, esquema) ? "OK\n" : "ERROR\n");
                } else {
                    std::cout << "Comando desconocido. Escribe AYUDA.\n";
                }
                continue;
            }
            if (comando == "USAR") {
                entrada >> tabla;
                bool seleccionada = !tabla.empty() && base.usaBaseDatos(tabla);
                if (seleccionada) baseSeleccionada = tabla;
                std::cout << (seleccionada ? "OK\n" : "ERROR\n");
                continue;
            }
            if (comando == "INSERTAR") {
                entrada >> tabla;
                std::string datos;
                std::getline(entrada >> std::ws, datos);
                long long id = tabla.empty() || datos.empty() ? -1 : base.insertarDatos(tabla, separar(datos));
                std::cout << (id < 0 ? "ERROR" : "ID=" + std::to_string(id)) << '\n';
                continue;
            }
            if (comando == "SELECCIONAR" || comando == "ACTUALIZAR" || comando == "ELIMINAR") {
                long long id;
                if (!(entrada >> tabla >> id)) { std::cout << "ERROR: falta tabla o id\n"; continue; }
                if (comando == "SELECCIONAR") {
                    auto registro = base.seleccionar(tabla, id);
                    if (registro.empty()) std::cout << "No encontrado\n";
                    else imprimir(registro);
                } else if (comando == "ACTUALIZAR") {
                    std::string datos;
                    std::getline(entrada >> std::ws, datos);
                    std::cout << (!datos.empty() && base.actualizar(tabla, id, separar(datos)) ? "OK\n" : "ERROR\n");
                } else {
                    std::cout << (base.eliminar(tabla, id) ? "OK\n" : "ERROR\n");
                }
                continue;
            }
            if (comando == "LISTAR" || comando == "ESQUEMA" || comando == "COMPACTAR") {
                entrada >> tabla;
                if (tabla.empty()) { std::cout << "ERROR: falta la tabla\n"; continue; }
                if (comando == "LISTAR") {
                    for (const auto& registro : base.listarTodo(tabla)) imprimir(registro);
                } else if (comando == "ESQUEMA") {
                    auto esquema = base.obtenerEsquema(tabla);
                    std::cout << PierodevSerializador().serializar(esquema) << '\n';
                } else {
                    std::cout << (base.compactar(tabla) ? "OK\n" : "ERROR\n");
                }
                continue;
            }
            if (comando == "BUSCAR") {
                std::string columna, valor;
                entrada >> tabla >> columna;
                std::getline(entrada >> std::ws, valor);
                if (tabla.empty() || columna.empty() || valor.empty()) {
                    std::cout << "ERROR: faltan datos\n";
                    continue;
                }
                for (const auto& registro : base.buscarColumna(tabla, columna, valor)) imprimir(registro);
                continue;
            }
            std::cout << "Comando desconocido. Escribe AYUDA.\n";
        }
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << '\n';
        return 1;
    }
}
