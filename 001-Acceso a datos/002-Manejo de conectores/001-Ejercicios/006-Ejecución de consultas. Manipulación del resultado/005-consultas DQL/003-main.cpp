#include "002-PierodevBBDD.hpp"

#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

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

static std::string recortar(const std::string& texto) {
    auto inicio = texto.find_first_not_of(" \t\r\n");
    if (inicio == std::string::npos) return "";
    auto fin = texto.find_last_not_of(" \t\r\n");
    return texto.substr(inicio, fin - inicio + 1);
}

static std::string sinComillas(std::string texto) {
    texto = recortar(texto);
    if (texto.size() >= 2 &&
        ((texto.front() == '\'' && texto.back() == '\'') ||
         (texto.front() == '"' && texto.back() == '"')))
        return texto.substr(1, texto.size() - 2);
    return texto;
}

static bool separarArgumentos(const std::string& texto, std::vector<std::string>& valores) {
    std::string contenido = recortar(texto);
    if (contenido.size() >= 2 && contenido.front() == '(' && contenido.back() == ')')
        contenido = contenido.substr(1, contenido.size() - 2);
    if (contenido.empty()) return false;
    std::string actual;
    char comilla = '\0';
    for (char caracter : contenido) {
        if ((caracter == '\'' || caracter == '"') && (comilla == '\0' || comilla == caracter)) {
            comilla = comilla == '\0' ? caracter : '\0';
            actual += caracter;
        } else if (caracter == ',' && comilla == '\0') {
            if (recortar(actual).empty()) return false;
            valores.push_back(sinComillas(actual));
            actual.clear();
        } else actual += caracter;
    }
    if (comilla != '\0' || recortar(actual).empty()) return false;
    valores.push_back(sinComillas(actual));
    for (const auto& valor : valores) if (valor.find(',') != std::string::npos) return false;
    return true;
}

static bool asignaciones(const std::string& texto,
                         std::map<std::string, std::string>& cambios) {
    std::vector<std::string> partes;
    if (!separarArgumentos(texto, partes)) return false;
    for (const auto& parte : partes) {
        auto igual = parte.find('=');
        if (igual == std::string::npos) return false;
        std::string columna = recortar(parte.substr(0, igual));
        if (columna.empty() || cambios.count(columna)) return false;
        cambios[columna] = sinComillas(parte.substr(igual + 1));
    }
    return true;
}

static bool condicion(const std::string& texto, std::string& columna, std::string& valor) {
    auto igual = texto.find('=');
    if (igual == std::string::npos) return false;
    columna = recortar(texto.substr(0, igual));
    valor = sinComillas(texto.substr(igual + 1));
    return !columna.empty();
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
  INSERTAR EN tabla VALORES (valor1,valor2)
  INSERTAR EN tabla (columna1,columna2) VALORES (valor1,valor2)
  INSERTAR EN destino SELECCIONAR * DE origen
  SELECCIONAR tabla id
  SELECCIONAR * DE tabla
  SELECCIONAR columna1,columna2 DE tabla DONDE columna >= valor
  SELECCIONAR DISTINTO columna DE tabla ORDENAR POR columna DESCENDENTE LIMITE 10
  LISTAR tabla
  BUSCAR tabla columna valor
  ACTUALIZAR tabla id valor1,valor2
  ACTUALIZAR tabla ESTABLECER columna=valor
  ACTUALIZAR tabla ESTABLECER columna=valor DONDE columna=valor
  ELIMINAR tabla id
  ELIMINAR DE tabla
  ELIMINAR DE tabla DONDE columna=valor
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
                linea = recortar(linea);
                if (!linea.empty() && linea.back() == ';') linea.pop_back();
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
                    } else if (objeto == "DE") {
                        std::string resto, columna, valor;
                        std::getline(entrada, resto);
                        resto = recortar(resto);
                        if (!resto.empty()) {
                            if (resto.rfind("DONDE ", 0) != 0 ||
                                !condicion(resto.substr(6), columna, valor)) {
                                resultado(false);
                                continue;
                            }
                        }
                        long long cantidad = nombre.empty() ? -1 :
                                             base.eliminarDonde(nombre, columna, valor);
                        std::cout << (cantidad < 0 ? "ERROR" :
                                      "ELIMINADOS=" + std::to_string(cantidad)) << '\n';
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
                    if (tabla == "EN") {
                        std::istringstream resto(datos);
                        resto >> tabla;
                        std::string instruccion;
                        std::getline(resto >> std::ws, instruccion);
                        instruccion = recortar(instruccion);
                        long long cantidad = -1;
                        if (instruccion.rfind("SELECCIONAR * DE ", 0) == 0) {
                            std::string origen = recortar(instruccion.substr(17));
                            if (!tabla.empty() && !origen.empty() &&
                                origen.find_first_of(" \t") == std::string::npos)
                                cantidad = base.insertarDesdeTabla(tabla, origen);
                            std::cout << (cantidad < 0 ? "ERROR" :
                                          "INSERTADOS=" + std::to_string(cantidad)) << '\n';
                        } else {
                            std::vector<std::string> columnas, valores;
                            if (instruccion.rfind("VALORES ", 0) == 0) {
                                if (separarArgumentos(instruccion.substr(8), valores))
                                    cantidad = base.insertarDatos(tabla, valores);
                            } else if (!instruccion.empty() && instruccion.front() == '(') {
                                auto cierre = instruccion.find(')');
                                if (cierre != std::string::npos &&
                                    separarArgumentos(instruccion.substr(0, cierre + 1), columnas)) {
                                    std::string despues = recortar(instruccion.substr(cierre + 1));
                                    if (despues.rfind("VALORES ", 0) == 0 &&
                                        separarArgumentos(despues.substr(8), valores))
                                        cantidad = base.insertarConColumnas(tabla, columnas, valores);
                                }
                            }
                            std::cout << (cantidad < 0 ? "ERROR" :
                                          "ID=" + std::to_string(cantidad)) << '\n';
                        }
                        continue;
                    }
                    long long id = tabla.empty() || datos.empty() ? -1 :
                                   base.insertarDatos(tabla, separar(datos));
                    std::cout << (id < 0 ? "ERROR" : "ID=" + std::to_string(id)) << '\n';
                    continue;
                }

                if (comando == "ACTUALIZAR") {
                    std::string tabla, resto;
                    entrada >> tabla;
                    std::getline(entrada >> std::ws, resto);
                    resto = recortar(resto);
                    if (tabla.empty()) { resultado(false); continue; }
                    if (resto.rfind("ESTABLECER ", 0) == 0) {
                        resto = recortar(resto.substr(10));
                        std::string columna, valor;
                        auto donde = resto.find(" DONDE ");
                        if (donde != std::string::npos) {
                            if (!condicion(resto.substr(donde + 7), columna, valor)) {
                                resultado(false);
                                continue;
                            }
                            resto = recortar(resto.substr(0, donde));
                        }
                        std::map<std::string, std::string> cambios;
                        long long cantidad = asignaciones(resto, cambios) ?
                            base.actualizarDonde(tabla, cambios, columna, valor) : -1;
                        std::cout << (cantidad < 0 ? "ERROR" :
                                      "ACTUALIZADOS=" + std::to_string(cantidad)) << '\n';
                    } else {
                        std::istringstream anterior(resto);
                        long long id;
                        std::string datos;
                        if (!(anterior >> id)) { resultado(false); continue; }
                        std::getline(anterior >> std::ws, datos);
                        resultado(!datos.empty() && base.actualizar(tabla, id, separar(datos)));
                    }
                    continue;
                }

                if (comando == "SELECCIONAR") {
                    std::string resto;
                    std::getline(entrada, resto);
                    std::istringstream seleccionAnterior(resto);
                    std::string tabla;
                    long long id;
                    if (seleccionAnterior >> tabla >> id && sinMasArgumentos(seleccionAnterior)) {
                        auto registro = base.seleccionar(tabla, id);
                        if (registro.empty()) std::cout << "No encontrado\n";
                        else imprimir(registro);
                    } else {
                        auto consulta = base.consultar(linea);
                        for (std::size_t i = 0; i < consulta.columnas.size(); ++i)
                            std::cout << (i ? " | " : "") << consulta.columnas[i];
                        std::cout << '\n';
                        for (const auto& fila : consulta.filas) {
                            for (std::size_t i = 0; i < fila.size(); ++i)
                                std::cout << (i ? " | " : "") << fila[i];
                            std::cout << '\n';
                        }
                        std::cout << consulta.filas.size() << " fila(s)\n";
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
