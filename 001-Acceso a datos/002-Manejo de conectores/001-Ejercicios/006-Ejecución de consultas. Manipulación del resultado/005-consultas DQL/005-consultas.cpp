#include "002-PierodevBBDD.hpp"

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <regex>
#include <set>
#include <stdexcept>
#include <utility>

namespace {

struct TokenConsulta {
    std::string texto;
    bool literal = false;
};

std::string mayusculas(std::string texto) {
    std::transform(texto.begin(), texto.end(), texto.begin(),
                   [](unsigned char caracter) { return std::toupper(caracter); });
    return texto;
}

std::vector<TokenConsulta> dividirConsulta(const std::string& consulta) {
    std::vector<TokenConsulta> tokens;
    std::size_t posicion = 0;
    while (posicion < consulta.size()) {
        unsigned char caracter = static_cast<unsigned char>(consulta[posicion]);
        if (std::isspace(caracter)) { ++posicion; continue; }
        if (caracter == ';') {
            ++posicion;
            if (consulta.find_first_not_of(" \t\r\n", posicion) != std::string::npos)
                throw std::runtime_error("Solo se permite una consulta por instruccion");
            break;
        }
        if (caracter == '\'' || caracter == '"') {
            char comilla = consulta[posicion++];
            std::string valor;
            bool cerrada = false;
            while (posicion < consulta.size()) {
                if (consulta[posicion] == comilla) {
                    if (posicion + 1 < consulta.size() && consulta[posicion + 1] == comilla) {
                        valor += comilla;
                        posicion += 2;
                    } else {
                        ++posicion;
                        cerrada = true;
                        break;
                    }
                } else valor += consulta[posicion++];
            }
            if (!cerrada) throw std::runtime_error("Falta cerrar una cadena entre comillas");
            tokens.push_back({valor, true});
            continue;
        }
        if (std::string("(),*").find(caracter) != std::string::npos) {
            tokens.push_back({std::string(1, consulta[posicion++]), false});
            continue;
        }
        if (std::string("=<>!").find(caracter) != std::string::npos) {
            std::string operador(1, consulta[posicion++]);
            if (posicion < consulta.size() &&
                (consulta[posicion] == '=' || (operador == "<" && consulta[posicion] == '>')))
                operador += consulta[posicion++];
            tokens.push_back({operador, false});
            continue;
        }
        std::string palabra;
        while (posicion < consulta.size() &&
               !std::isspace(static_cast<unsigned char>(consulta[posicion])) &&
               std::string("(),;*=<>!\"'").find(consulta[posicion]) == std::string::npos)
            palabra += consulta[posicion++];
        if (palabra.empty()) throw std::runtime_error("Caracter no valido en consulta");
        tokens.push_back({palabra, false});
    }
    return tokens;
}

bool numero(const std::string& texto, double& valor) {
    if (texto.empty()) return false;
    char* final = nullptr;
    valor = std::strtod(texto.c_str(), &final);
    return final != texto.c_str() && *final == '\0';
}

int comparar(const std::string& izquierda, const std::string& derecha) {
    double uno, dos;
    if (numero(izquierda, uno) && numero(derecha, dos))
        return uno < dos ? -1 : (uno > dos ? 1 : 0);
    return izquierda < derecha ? -1 : (izquierda > derecha ? 1 : 0);
}

bool coincidePatron(const std::string& valor, const std::string& patron) {
    std::string expresion = "^";
    for (char caracter : patron) {
        if (caracter == '%') expresion += ".*";
        else if (caracter == '_') expresion += '.';
        else {
            if (std::string(".^$|()[]{}*+?\\").find(caracter) != std::string::npos)
                expresion += '\\';
            expresion += caracter;
        }
    }
    return std::regex_match(valor, std::regex(expresion + "$"));
}

class CondicionConsulta {
    const std::vector<TokenConsulta>& tokens;
    const std::map<std::string, std::string>& fila;
    std::size_t posicion = 0;

    bool es(const std::string& palabra) const {
        return posicion < tokens.size() && !tokens[posicion].literal &&
               mayusculas(tokens[posicion].texto) == palabra;
    }
    bool tomar(const std::string& palabra) {
        if (!es(palabra)) return false;
        ++posicion;
        return true;
    }
    std::string valor(bool exigirColumna = false) {
        if (posicion >= tokens.size()) throw std::runtime_error("Falta valor en DONDE");
        auto token = tokens[posicion++];
        if (!token.literal) {
            auto columna = fila.find(token.texto);
            if (columna != fila.end()) return columna->second;
        }
        if (exigirColumna) throw std::runtime_error("Columna no encontrada: " + token.texto);
        return token.texto;
    }
    bool primaria() {
        if (tomar("(")) {
            bool resultado = alternativa();
            if (!tomar(")")) throw std::runtime_error("Falta ')' en DONDE");
            return resultado;
        }
        std::string izquierda = valor(true);
        bool negar = tomar("NO");
        if (tomar("ENTRE")) {
            std::string minimo = valor();
            if (!tomar("Y")) throw std::runtime_error("ENTRE necesita Y");
            std::string maximo = valor();
            bool resultado = comparar(izquierda, minimo) >= 0 && comparar(izquierda, maximo) <= 0;
            return negar ? !resultado : resultado;
        }
        if (tomar("EN")) {
            if (!tomar("(")) throw std::runtime_error("EN necesita '('");
            bool resultado = false;
            bool hayValor = false;
            do {
                if (es(")")) break;
                resultado = (izquierda == valor()) || resultado;
                hayValor = true;
            } while (tomar(","));
            if (!hayValor || !tomar(")")) throw std::runtime_error("Lista EN no valida");
            return negar ? !resultado : resultado;
        }
        if (tomar("COMO") || tomar("LIKE")) {
            bool resultado = coincidePatron(izquierda, valor());
            return negar ? !resultado : resultado;
        }
        if (negar) throw std::runtime_error("NO debe preceder ENTRE, EN, COMO o LIKE");
        if (posicion >= tokens.size()) throw std::runtime_error("Falta operador en DONDE");
        std::string operador = tokens[posicion++].texto;
        if (operador != "=" && operador != "<>" && operador != "!=" &&
            operador != ">" && operador != "<" && operador != ">=" && operador != "<=")
            throw std::runtime_error("Operador no admitido: " + operador);
        int resultado = comparar(izquierda, valor());
        if (operador == "=") return resultado == 0;
        if (operador == "<>" || operador == "!=") return resultado != 0;
        if (operador == ">") return resultado > 0;
        if (operador == "<") return resultado < 0;
        if (operador == ">=") return resultado >= 0;
        return resultado <= 0;
    }
    bool negacion() { return tomar("NO") ? !negacion() : primaria(); }
    bool conjuncion() {
        bool resultado = negacion();
        while (tomar("Y")) {
            bool siguiente = negacion();
            resultado = resultado && siguiente;
        }
        return resultado;
    }
    bool alternativa() {
        bool resultado = conjuncion();
        while (tomar("O")) {
            bool siguiente = conjuncion();
            resultado = resultado || siguiente;
        }
        return resultado;
    }
public:
    CondicionConsulta(const std::vector<TokenConsulta>& expresion,
                      const std::map<std::string, std::string>& registro)
        : tokens(expresion), fila(registro) {}
    bool evaluar() {
        if (tokens.empty()) throw std::runtime_error("Falta condicion tras DONDE");
        bool resultado = alternativa();
        if (posicion != tokens.size())
            throw std::runtime_error("Expresion DONDE no reconocida: " + tokens[posicion].texto);
        return resultado;
    }
};

struct CampoConsulta {
    std::string nombre;
    std::string alias;
};

} // namespace

ResultadoConsulta PierodevBBDD::consultar(const std::string& consulta) const {
    auto tokens = dividirConsulta(consulta);
    std::size_t posicion = 0;
    auto es = [&](const std::string& palabra) {
        return posicion < tokens.size() && !tokens[posicion].literal &&
               mayusculas(tokens[posicion].texto) == palabra;
    };
    auto tomar = [&](const std::string& palabra) {
        if (!es(palabra)) return false;
        ++posicion;
        return true;
    };
    auto identificador = [&]() {
        if (posicion >= tokens.size() || tokens[posicion].literal ||
            tokens[posicion].texto == "," || tokens[posicion].texto == "(")
            throw std::runtime_error("Falta identificador en consulta");
        return tokens[posicion++].texto;
    };

    if (!tomar("SELECCIONAR"))
        throw std::runtime_error("La consulta debe comenzar por SELECCIONAR");
    bool distinto = tomar("DISTINTO");
    std::vector<CampoConsulta> campos;
    bool todas = tomar("*");
    if (!todas) {
        do {
            if (es("DE")) throw std::runtime_error("Faltan columnas tras SELECCIONAR");
            CampoConsulta campo;
            campo.nombre = identificador();
            campo.alias = campo.nombre;
            if (tomar("COMO")) campo.alias = identificador();
            campos.push_back(campo);
        } while (tomar(","));
    }
    if (!tomar("DE")) throw std::runtime_error("Falta DE tabla");
    std::string tabla = identificador();
    auto esquema = obtenerEsquema(tabla);
    if (esquema.empty()) throw std::runtime_error("Tabla no encontrada: " + tabla);
    if (todas) for (const auto& nombre : esquema) campos.push_back({nombre, nombre});
    std::set<std::string> aliasUsados;
    for (const auto& campo : campos) {
        if (std::find(esquema.begin(), esquema.end(), campo.nombre) == esquema.end())
            throw std::runtime_error("Columna no encontrada: " + campo.nombre);
        if (!aliasUsados.insert(campo.alias).second)
            throw std::runtime_error("Alias repetido: " + campo.alias);
    }

    std::vector<TokenConsulta> condicion;
    if (tomar("DONDE")) {
        int profundidad = 0;
        while (posicion < tokens.size()) {
            if (!tokens[posicion].literal && profundidad == 0 &&
                (es("ORDENAR") || es("LIMITE"))) break;
            if (!tokens[posicion].literal && tokens[posicion].texto == "(") ++profundidad;
            if (!tokens[posicion].literal && tokens[posicion].texto == ")") --profundidad;
            condicion.push_back(tokens[posicion++]);
        }
        if (condicion.empty()) throw std::runtime_error("Falta condicion tras DONDE");
    }
    std::string orden;
    bool descendente = false;
    if (tomar("ORDENAR")) {
        if (!tomar("POR")) throw std::runtime_error("ORDENAR necesita POR");
        orden = identificador();
        if (tomar("DESCENDENTE")) descendente = true;
        else tomar("ASCENDENTE");
    }
    long long limite = -1;
    if (tomar("LIMITE")) {
        std::string texto = identificador();
        std::size_t caracteres = 0;
        try { limite = std::stoll(texto, &caracteres); }
        catch (const std::exception&) { throw std::runtime_error("LIMITE necesita un entero no negativo"); }
        if (limite < 0 || caracteres != texto.size())
            throw std::runtime_error("LIMITE necesita un entero no negativo");
    }
    if (posicion != tokens.size())
        throw std::runtime_error("Clausula no reconocida: " + tokens[posicion].texto);

    if (!orden.empty()) {
        for (const auto& campo : campos) if (orden == campo.alias) orden = campo.nombre;
        if (std::find(esquema.begin(), esquema.end(), orden) == esquema.end())
            throw std::runtime_error("Columna de ordenacion no encontrada: " + orden);
    }
    std::map<std::string, std::string> filaVacia;
    for (const auto& columna : esquema) filaVacia[columna] = "";
    if (!condicion.empty()) CondicionConsulta(condicion, filaVacia).evaluar();

    auto registros = listarTodo(tabla);
    std::vector<std::map<std::string, std::string>> filtrados;
    for (const auto& registro : registros)
        if (condicion.empty() || CondicionConsulta(condicion, registro).evaluar())
            filtrados.push_back(registro);
    if (!orden.empty()) {
        std::stable_sort(filtrados.begin(), filtrados.end(), [&](const auto& uno, const auto& dos) {
            int comparacion = comparar(uno.at(orden), dos.at(orden));
            return descendente ? comparacion > 0 : comparacion < 0;
        });
    }

    ResultadoConsulta resultado;
    for (const auto& campo : campos) resultado.columnas.push_back(campo.alias);
    std::set<std::vector<std::string>> vistos;
    for (const auto& registro : filtrados) {
        if (limite >= 0 && static_cast<long long>(resultado.filas.size()) >= limite) break;
        std::vector<std::string> fila;
        for (const auto& campo : campos) fila.push_back(registro.at(campo.nombre));
        if (distinto && !vistos.insert(fila).second) continue;
        resultado.filas.push_back(std::move(fila));
    }
    return resultado;
}
