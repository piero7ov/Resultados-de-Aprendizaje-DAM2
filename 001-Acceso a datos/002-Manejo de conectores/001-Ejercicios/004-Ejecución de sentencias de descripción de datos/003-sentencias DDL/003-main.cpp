#include "002-PierodevBBDD.hpp"

#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <sstream>
#include <string>

namespace archivos = std::filesystem;

static std::string configuracionPredeterminada() {
    if (const char* perfil = std::getenv("APPDATA")) {
        archivos::path ruta = archivos::path(perfil) / "PierodevBBDD" / "config.json";
        if (archivos::is_regular_file(ruta)) return ruta.string();
    }
    return "config.json";
}

static std::vector<std::string> separar(const std::string& cadena) {
    return PierodevSerializador().deserializar(cadena);
}

static bool sinMasArgumentos(std::istringstream& entrada) {
    std::string sobrante;
    return !(entrada >> sobrante);
}

static void imprimir(const std::map<std::string, std::string>& registro) {
    for (const auto& [columna, valor] : registro) std::cout << columna << '=' << valor << "  ";
    std::cout << '\n';
}

static void resultado(bool correcto) {
    std::cout << (correcto ? "OK\n" : "ERROR\n");
}

static void ayuda() {
    std::cout << R"(Comandos:
  CREAR BASE nombre
  USAR nombre
  CREAR TABLA nombre columna1,columna2
  INSERTAR tabla valor1,valor2
  SELECCIONAR tabla id
  LISTAR tabla
  BUSCAR tabla columna valor
  ACTUALIZAR tabla id valor1,valor2
  ELIMINAR tabla id
  COMPACTAR tabla
  ESQUEMA tabla
  ALTERAR TABLA tabla ANADIR COLUMNA columna
  ALTERAR TABLA tabla ELIMINAR COLUMNA columna
  ALTERAR TABLA tabla RENOMBRAR COLUMNA anterior nueva
  RENOMBRAR TABLA anterior nueva
  TRUNCAR TABLA tabla
  ELIMINAR TABLA tabla
  ELIMINAR BASE nombre
  AYUDA
  SALIR
)";
}

int main(int cantidadArgumentos, char** argumentos) {
    try {
        std::string rutaConfiguracion = cantidadArgumentos > 1
            ? argumentos[1] : configuracionPredeterminada();
        PierodevBBDD base(rutaConfiguracion);
        std::string baseSeleccionada;
        std::cout << "PierodevBBDD - terminal\n";
        std::cout << "Configuracion: " << rutaConfiguracion << '\n';
        std::cout << "Datos: " << base.obtenerInstalacion() << '\n';
        ayuda();

        std::string linea;
        while (std::cout << (baseSeleccionada.empty() ? "pierodev> " :
                            "pierodev[" + baseSeleccionada + "]> ") &&
               std::getline(std::cin, linea)) {
            try {
                std::istringstream entrada(linea);
                std::string comando;
                entrada >> comando;
                if (comando.empty()) continue;
                if (comando == "SALIR") break;
                if (comando == "AYUDA") { ayuda(); continue; }

                if (comando == "CREAR") {
                    std::string objeto, nombre;
                    entrada >> objeto >> nombre;
                    if (objeto == "BASE") {
                        resultado(!nombre.empty() && sinMasArgumentos(entrada) &&
                                  base.creaBaseDatos(nombre));
                    } else if (objeto == "TABLA") {
                        std::string esquema;
                        std::getline(entrada >> std::ws, esquema);
                        resultado(!nombre.empty() && !esquema.empty() &&
                                  base.creaTabla(nombre, esquema));
                    } else resultado(false);
                    continue;
                }

                if (comando == "USAR") {
                    std::string nombre;
                    entrada >> nombre;
                    bool correcto = !nombre.empty() && sinMasArgumentos(entrada) &&
                                    base.usaBaseDatos(nombre);
                    if (correcto) baseSeleccionada = nombre;
                    resultado(correcto);
                    continue;
                }

                if (comando == "ALTERAR") {
                    std::string objeto, tabla, accion, tipo, anterior, nueva;
                    entrada >> objeto >> tabla >> accion >> tipo;
                    if (objeto != "TABLA" || tabla.empty()) { resultado(false); continue; }
                    if (accion == "ANADIR" && tipo == "COLUMNA") {
                        entrada >> nueva;
                        resultado(!nueva.empty() && sinMasArgumentos(entrada) &&
                                  base.alterarAnadirColumna(tabla, nueva));
                    } else if (accion == "ELIMINAR" && tipo == "COLUMNA") {
                        entrada >> anterior;
                        resultado(!anterior.empty() && sinMasArgumentos(entrada) &&
                                  base.alterarEliminarColumna(tabla, anterior));
                    } else if (accion == "RENOMBRAR" && tipo == "COLUMNA") {
                        entrada >> anterior >> nueva;
                        resultado(!anterior.empty() && !nueva.empty() &&
                                  sinMasArgumentos(entrada) &&
                                  base.alterarRenombrarColumna(tabla, anterior, nueva));
                    } else resultado(false);
                    continue;
                }

                if (comando == "RENOMBRAR") {
                    std::string objeto, anterior, nueva;
                    entrada >> objeto >> anterior >> nueva;
                    resultado(objeto == "TABLA" && !anterior.empty() && !nueva.empty() &&
                              sinMasArgumentos(entrada) &&
                              base.alterarRenombrarTabla(anterior, nueva));
                    continue;
                }

                if (comando == "TRUNCAR") {
                    std::string objeto, tabla;
                    entrada >> objeto >> tabla;
                    resultado(objeto == "TABLA" && !tabla.empty() &&
                              sinMasArgumentos(entrada) && base.truncarTabla(tabla));
                    continue;
                }

                if (comando == "ELIMINAR") {
                    std::string objeto, nombre;
                    entrada >> objeto >> nombre;
                    if (objeto == "TABLA") {
                        resultado(!nombre.empty() && sinMasArgumentos(entrada) &&
                                  base.eliminarTabla(nombre));
                    } else if (objeto == "BASE") {
                        bool correcto = !nombre.empty() && sinMasArgumentos(entrada) &&
                                        base.eliminarBaseDatos(nombre);
                        if (correcto && baseSeleccionada == nombre) baseSeleccionada.clear();
                        resultado(correcto);
                    } else {
                        long long id;
                        std::istringstream identificador(nombre);
                        resultado(!objeto.empty() && !nombre.empty() &&
                                  bool(identificador >> id) && sinMasArgumentos(identificador) &&
                                  sinMasArgumentos(entrada) && base.eliminar(objeto, id));
                    }
                    continue;
                }

                if (comando == "INSERTAR") {
                    std::string tabla, datos;
                    entrada >> tabla;
                    std::getline(entrada >> std::ws, datos);
                    long long id = tabla.empty() || datos.empty() ? -1 :
                                   base.insertarDatos(tabla, separar(datos));
                    std::cout << (id < 0 ? "ERROR" : "ID=" + std::to_string(id)) << '\n';
                    continue;
                }

                if (comando == "SELECCIONAR" || comando == "ACTUALIZAR") {
                    std::string tabla;
                    long long id;
                    if (!(entrada >> tabla >> id)) { resultado(false); continue; }
                    if (comando == "SELECCIONAR") {
                        if (!sinMasArgumentos(entrada)) { resultado(false); continue; }
                        auto registro = base.seleccionar(tabla, id);
                        if (registro.empty()) std::cout << "No encontrado\n";
                        else imprimir(registro);
                    } else {
                        std::string datos;
                        std::getline(entrada >> std::ws, datos);
                        resultado(!datos.empty() && base.actualizar(tabla, id, separar(datos)));
                    }
                    continue;
                }

                if (comando == "LISTAR" || comando == "ESQUEMA" || comando == "COMPACTAR") {
                    std::string tabla;
                    entrada >> tabla;
                    if (tabla.empty() || !sinMasArgumentos(entrada)) { resultado(false); continue; }
                    if (comando == "LISTAR") {
                        for (const auto& registro : base.listarTodo(tabla)) imprimir(registro);
                    } else if (comando == "ESQUEMA") {
                        std::cout << PierodevSerializador().serializar(base.obtenerEsquema(tabla)) << '\n';
                    } else resultado(base.compactar(tabla));
                    continue;
                }

                if (comando == "BUSCAR") {
                    std::string tabla, columna, valor;
                    entrada >> tabla >> columna;
                    std::getline(entrada >> std::ws, valor);
                    if (tabla.empty() || columna.empty() || valor.empty()) {
                        resultado(false);
                    } else {
                        for (const auto& registro : base.buscarColumna(tabla, columna, valor))
                            imprimir(registro);
                    }
                    continue;
                }

                std::cout << "Comando desconocido. Escribe AYUDA.\n";
            } catch (const std::exception& error) {
                std::cerr << "ERROR: " << error.what() << '\n';
            }
        }
    } catch (const std::exception& error) {
        std::cerr << "ERROR: " << error.what() << '\n';
        return 1;
    }
}
