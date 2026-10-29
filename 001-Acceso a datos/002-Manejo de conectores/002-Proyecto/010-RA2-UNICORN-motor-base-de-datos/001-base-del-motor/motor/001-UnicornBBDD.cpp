#include "001-UnicornBBDD.hpp"
#include <algorithm>
#include <cstdlib>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iomanip>
#include <regex>
#include <sstream>
#include <set>
#include <stdexcept>

namespace fs = std::filesystem;

const std::string& UnicornBBDD::valorNulo() {
    static const std::string valor = "__UNICORN_NULL__";
    return valor;
}
bool UnicornBBDD::esNulo(const std::string& valor) { return valor == valorNulo(); }

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
}

std::string UnicornSerializador::serializar(const std::vector<std::string>& lista, char delimitador) const {
    std::ostringstream out;
    for (std::size_t i=0; i<lista.size(); ++i) { if (i) out << delimitador; out << lista[i]; }
    return out.str();
}
std::vector<std::string> UnicornSerializador::desserializar(const std::string& cadena, char delimitador) const {
    std::vector<std::string> r; std::stringstream ss(cadena); std::string x;
    while (std::getline(ss,x,delimitador)) r.push_back(x);
    if (!cadena.empty() && cadena.back()==delimitador) r.push_back("");
    return r;
}

UnicornBBDD::UnicornBBDD(const std::string& config) {
    std::string rutaConfig = config;
    if (!fs::exists(rutaConfig)) {
        if (const char* variable = std::getenv("UNICORN_CONFIG"); variable && fs::exists(variable)) {
            rutaConfig = variable;
        } else if (const char* perfil = std::getenv("APPDATA")) {
            rutaConfig = (fs::path(perfil) / "UnicornBBDD" / "config.json").string();
        } else if (fs::exists("/etc/unicornbbdd/config.json")) {
            rutaConfig = "/etc/unicornbbdd/config.json";
        }
    }
    if (!fs::exists(rutaConfig)) throw std::runtime_error("No se ha encontrado config.json");
    std::ifstream f(rutaConfig); if (!f) throw std::runtime_error("No se puede abrir la configuracion: " + rutaConfig);
    std::string s((std::istreambuf_iterator<char>(f)), {});
    std::smatch m;
    if (!std::regex_search(s,m,std::regex("\\\"instalacion\\\"\\s*:\\s*\\\"([^\\\"]+)\\\""))) throw std::runtime_error("Falta 'instalacion' en config.json");
    instalacion=m[1].str();
    if (!std::regex_search(s,m,std::regex("\\\"tamanoRegistro\\\"\\s*:\\s*([0-9]+)"))) throw std::runtime_error("Falta 'tamanoRegistro' en config.json");
    tamanoRegistro=std::stoull(m[1].str());
    fs::create_directories(instalacion);
}
std::string UnicornBBDD::rutaTabla(const std::string& t,const std::string& e) const {
    if (!nombreValido(t) || basededatos.empty()) throw std::runtime_error("Nombre de tabla o base no valido");
    return (fs::path(instalacion)/basededatos/(t+e)).string();
}
std::string UnicornBBDD::trimDerecha(std::string s){ while(!s.empty() && (s.back()==' '||s.back()=='\n'||s.back()=='\r'||s.back()=='\t')) s.pop_back(); return s; }
bool UnicornBBDD::creaBaseDatos(const std::string& n){ if(!nombreValido(n))return false; fs::path p=fs::path(instalacion)/n; if(fs::exists(p)){std::cerr<<"La base de datos ya existe\n";return false;} return fs::create_directory(p); }
bool UnicornBBDD::usaBaseDatos(const std::string& n){ if(!nombreValido(n))return false; fs::path p=fs::path(instalacion)/n; if(!fs::is_directory(p)){std::cerr<<"La base de datos no existe\n";return false;} basededatos=n; return true; }

static std::string tipoNombre(TipoDato t){
    switch(t){case TipoDato::ENTERO:return "ENTERO";case TipoDato::REAL:return "REAL";case TipoDato::BOOLEANO:return "BOOLEANO";case TipoDato::FECHA:return "FECHA";case TipoDato::DECIMAL:return "DECIMAL";default:return "TEXTO";}
}
static TipoDato tipoDesdeNombre(std::string s){
    std::transform(s.begin(),s.end(),s.begin(),[](unsigned char c){return std::toupper(c);});
    if(s=="ENTERO"||s=="INT") return TipoDato::ENTERO;
    if(s=="REAL"||s=="FLOAT") return TipoDato::REAL;
    if(s=="DECIMAL") return TipoDato::DECIMAL;
    if(s=="FECHA") return TipoDato::FECHA;
    if(s=="BOOLEANO"||s=="BOOL") return TipoDato::BOOLEANO;
    return TipoDato::TEXTO;
}
bool UnicornBBDD::validarTipo(TipoDato t,const std::string& v) const{
    if(v.empty()||esNulo(v)) return true;
    try{
        size_t n=0;
        if(t==TipoDato::ENTERO){std::stoll(v,&n);return n==v.size();}
        if(t==TipoDato::REAL){std::stod(v,&n);return n==v.size();}
        if(t==TipoDato::DECIMAL){
            static const std::regex decimal(R"(^[+-]?([0-9]+(\.[0-9]+)?|\.[0-9]+)$)");
            return std::regex_match(v,decimal);
        }
        if(t==TipoDato::FECHA){
            static const std::regex formato(R"(^([0-9]{4})-([0-9]{2})-([0-9]{2})$)");
            std::smatch partes;
            if(!std::regex_match(v,partes,formato))return false;
            int anio=std::stoi(partes[1]),mes=std::stoi(partes[2]),dia=std::stoi(partes[3]);
            if(mes<1||mes>12)return false;
            int dias[]={31,28,31,30,31,30,31,31,30,31,30,31};
            if(mes==2 && (anio%400==0 || (anio%4==0 && anio%100!=0)))dias[1]=29;
            return dia>=1&&dia<=dias[mes-1];
        }
        if(t==TipoDato::BOOLEANO){std::string x=v;std::transform(x.begin(),x.end(),x.begin(),[](unsigned char c){return std::toupper(c);});return x=="1"||x=="0"||x=="VERDADERO"||x=="FALSO"||x=="TRUE"||x=="FALSE";}
        return true;
    }catch(...){return false;}
}
std::string UnicornBBDD::normalizarTipo(TipoDato t,const std::string& v) const{
    if(t!=TipoDato::BOOLEANO||v.empty()||esNulo(v)) return v;
    std::string x=v;std::transform(x.begin(),x.end(),x.begin(),[](unsigned char c){return std::toupper(c);});
    return (x=="1"||x=="VERDADERO"||x=="TRUE")?"1":"0";
}
std::map<std::string,TipoDato> UnicornBBDD::obtenerTipos(const std::string& t) const{
    std::map<std::string,TipoDato> r; for(const auto& c:obtenerEsquema(t)) r[c]=TipoDato::TEXTO;
    r["id"]=TipoDato::ENTERO; r["activo"]=TipoDato::BOOLEANO;
    std::ifstream f(rutaTabla(t,".tipos")); std::string l;
    while(std::getline(f,l)){auto q=l.find(',');if(q!=std::string::npos)r[l.substr(0,q)]=tipoDesdeNombre(l.substr(q+1));}
    return r;
}
bool UnicornBBDD::creaTablaTipada(const std::string& n,const std::vector<DefinicionColumna>& cols){
    std::string e;for(size_t i=0;i<cols.size();++i){if(i)e+=",";e+=cols[i].nombre;}
    if(!creaTabla(n,e))return false;
    std::ofstream f(rutaTabla(n,".tipos"),std::ios::trunc);f<<"id,ENTERO\nactivo,BOOLEANO\n";for(const auto&c:cols)f<<c.nombre<<","<<tipoNombre(c.tipo)<<"\n";return bool(f);
}
bool UnicornBBDD::esVista(const std::string& n) const{return !basededatos.empty()&&nombreValido(n)&&fs::exists(fs::path(instalacion)/basededatos/(n+".vista"));}
std::string UnicornBBDD::consultaVista(const std::string& n) const{if(!nombreValido(n))throw std::runtime_error("Nombre de vista no valido");std::ifstream f(fs::path(instalacion)/basededatos/(n+".vista"));return std::string((std::istreambuf_iterator<char>(f)),{});}
bool UnicornBBDD::crearVista(const std::string& n,const std::string& q){
    if(basededatos.empty()||!nombreValido(n)||q.empty())return false;try{(void)consultar(q);}catch(const std::exception&e){std::cerr<<"Vista invalida: "<<e.what()<<"\n";return false;}
    std::ofstream f(fs::path(instalacion)/basededatos/(n+".vista"),std::ios::trunc);f<<q;return bool(f);
}
bool UnicornBBDD::eliminarVista(const std::string& n){if(basededatos.empty()||!nombreValido(n))return false;auto p=fs::path(instalacion)/basededatos/(n+".vista");return fs::exists(p)&&fs::remove(p);}
std::vector<std::string> UnicornBBDD::listarVistas() const{std::vector<std::string>r;if(basededatos.empty())return r;for(auto&e:fs::directory_iterator(fs::path(instalacion)/basededatos))if(e.path().extension()==".vista")r.push_back(e.path().stem().string());std::sort(r.begin(),r.end());return r;}
bool UnicornBBDD::iniciarTransaccion(){
    if(transaccionActiva||basededatos.empty())return false;baseTransaccion=basededatos;rutaSnapshot=fs::path(instalacion)/(".txn_"+basededatos);
    if(fs::exists(rutaSnapshot))return false;
    fs::create_directories(rutaSnapshot);
    auto src=fs::path(instalacion)/basededatos;for(auto&e:fs::directory_iterator(src))if(e.is_regular_file())fs::copy_file(e.path(),rutaSnapshot/e.path().filename(),fs::copy_options::overwrite_existing);
    transaccionActiva=true;return true;
}
bool UnicornBBDD::confirmarTransaccion(){if(!transaccionActiva)return false;std::error_code ec;fs::remove_all(rutaSnapshot,ec);transaccionActiva=false;baseTransaccion.clear();return true;}
bool UnicornBBDD::deshacerTransaccion(){
    if(!transaccionActiva)return false;auto dst=fs::path(instalacion)/baseTransaccion;std::error_code ec;
    for(auto&e:fs::directory_iterator(dst))if(e.is_regular_file())fs::remove(e.path(),ec);
    for(auto&e:fs::directory_iterator(rutaSnapshot))if(e.is_regular_file())fs::copy_file(e.path(),dst/e.path().filename(),fs::copy_options::overwrite_existing);
    fs::remove_all(rutaSnapshot,ec);basededatos=baseTransaccion;transaccionActiva=false;baseTransaccion.clear();return true;
}

bool UnicornBBDD::creaTabla(const std::string& n,const std::string& e){ if(basededatos.empty()){std::cerr<<"No hay base seleccionada\n";return false;} auto csv=rutaTabla(n,".csv"); if(fs::exists(csv)){std::cerr<<"La tabla ya existe\n";return false;} std::ofstream(csv,std::ios::binary); std::ofstream(rutaTabla(n,".esquema"))<<"id,activo,"<<e; std::ofstream(rutaTabla(n,".idx")); std::ofstream(rutaTabla(n,".rel"))<<"PK,id\n"; std::ofstream tf(rutaTabla(n,".tipos")); tf<<"id,ENTERO\nactivo,BOOLEANO\n"; for(const auto&c:UnicornSerializador().desserializar(e)) if(!c.empty()) tf<<c<<",TEXTO\n"; return true; }

bool UnicornBBDD::alteraTablaAnadir(const std::string& t,const std::string& col){
    auto es=obtenerEsquema(t); if(es.empty()||!nombreValido(col)) return false;
    if(std::find(es.begin(),es.end(),col)!=es.end()){std::cerr<<"La columna ya existe\n";return false;}
    es.push_back(col);
    return cambiarColumnas(t,es,es.size()-1,true);
}

bool UnicornBBDD::alteraTablaEliminarColumna(const std::string& t,const std::string& col){
    if(col=="id"||col=="activo"){std::cerr<<"No se puede eliminar una columna interna\n";return false;}
    auto es=obtenerEsquema(t); auto it=std::find(es.begin(),es.end(),col); if(it==es.end()) return false;
    auto posicion=static_cast<std::size_t>(it-es.begin()); es.erase(it);
    return cambiarColumnas(t,es,posicion,false);
}

bool UnicornBBDD::alteraTablaRenombrarColumna(const std::string& t,const std::string& antigua,const std::string& nueva){
    if(antigua=="id"||antigua=="activo"||!nombreValido(nueva)) return false;
    auto es=obtenerEsquema(t); auto it=std::find(es.begin(),es.end(),antigua); if(it==es.end()) return false;
    if(std::find(es.begin(),es.end(),nueva)!=es.end()){std::cerr<<"La columna destino ya existe\n";return false;}
    *it=nueva; std::ofstream f(rutaTabla(t,".esquema"),std::ios::trunc); f<<UnicornSerializador().serializar(es); bool correcto=bool(f); f.close();
    if(!correcto)return false;
    for(const auto& extension:{".tipos",".rel"}){
        auto ruta=rutaTabla(t,extension); std::ifstream entrada(ruta); if(!entrada)continue;
        std::vector<std::string> lineas; std::string linea;
        while(std::getline(entrada,linea)){
            if(std::string(extension)==".tipos"){
                if(linea.rfind(antigua+",",0)==0)linea=nueva+linea.substr(antigua.size());
            }else{
                auto primera=linea.find(','); auto segunda=primera==std::string::npos?std::string::npos:linea.find(',',primera+1);
                if(primera!=std::string::npos&&linea.substr(primera+1,segunda-primera-1)==antigua)
                    linea=linea.substr(0,primera+1)+nueva+(segunda==std::string::npos?"":linea.substr(segunda));
            }
            lineas.push_back(linea);
        }
        entrada.close(); std::ofstream salida(ruta,std::ios::trunc); for(const auto& actual:lineas)salida<<actual<<"\n";
    }
    actualizarIndicesTabla(t); return true;
}

bool UnicornBBDD::alteraTablaModificarColumna(const std::string& t,const std::string& antigua,const std::string& nueva){
    return alteraTablaRenombrarColumna(t,antigua,nueva);
}

bool UnicornBBDD::truncarTabla(const std::string& t){
    if(basededatos.empty()||!fs::exists(rutaTabla(t,".csv"))) return false;
    std::ofstream csv(rutaTabla(t,".csv"),std::ios::binary|std::ios::trunc); std::ofstream idx(rutaTabla(t,".idx"),std::ios::trunc);
    bool correcto = bool(csv) && bool(idx); csv.close(); idx.close();
    if(correcto)std::ofstream(rutaTabla(t,".ultimo"),std::ios::trunc)<<0;
    if(correcto)actualizarIndicesTabla(t);
    return correcto;
}

bool UnicornBBDD::eliminarTabla(const std::string& t){
    if(basededatos.empty()) return false; bool habia=false;
    for(const auto&e:{".csv",".esquema",".idx",".rel",".tipos",".ultimo"}){auto p=rutaTabla(t,e);if(fs::exists(p)){fs::remove(p);habia=true;}}
    if(habia)eliminarIndicesTabla(t);
    return habia;
}

bool UnicornBBDD::eliminarBaseDatos(const std::string& n){
    if(!nombreValido(n)) return false; fs::path p=fs::path(instalacion)/n; if(!fs::exists(p)||!fs::is_directory(p)||fs::is_symlink(p)) return false;
    fs::remove_all(p); if(basededatos==n) basededatos.clear(); return true;
}
std::string UnicornBBDD::obtenerClavePrimaria(const std::string& t) const {
    // Compatibilidad: toda tabla UnicornBBDD tiene id como PK implicita.
    auto es=obtenerEsquema(t);
    return es.empty() ? "" : "id";
}

std::vector<ClaveForanea> UnicornBBDD::obtenerClavesForaneas(const std::string& t) const {
    std::vector<ClaveForanea> out;
    std::ifstream f(rutaTabla(t,".rel"));
    std::string linea;
    while(std::getline(f,linea)){
        auto v=UnicornSerializador().desserializar(linea);
        if(v.size()==4 && v[0]=="FK") out.push_back({v[1],v[2],v[3]});
    }
    return out;
}

RestriccionColumna UnicornBBDD::obtenerRestricciones(const std::string& t,const std::string& col) const {
    RestriccionColumna r; std::ifstream f(rutaTabla(t,".rel")); std::string linea;
    while(std::getline(f,linea)){
        auto v=UnicornSerializador().desserializar(linea);
        if(v.size()>=2 && v[1]==col){
            if(v[0]=="NN") r.noNulo=true;
            else if(v[0]=="UQ") r.unico=true;
            else if(v[0]=="DF" && v.size()>=3){r.tieneDefecto=true;r.valorDefecto=v[2];}
        }
    }
    return r;
}

bool UnicornBBDD::establecerNoNulo(const std::string& t,const std::string& col){
    auto es=obtenerEsquema(t); if(std::find(es.begin(),es.end(),col)==es.end()||col=="activo") return false;
    for(const auto&r:listarTodo(t)) if(r.at(col).empty()||esNulo(r.at(col))){std::cerr<<"No se puede aplicar NO NULO: existen valores vacios\n";return false;}
    if(obtenerRestricciones(t,col).noNulo) return true;
    std::ofstream(rutaTabla(t,".rel"),std::ios::app)<<"NN,"<<col<<"\n"; return true;
}

bool UnicornBBDD::establecerUnico(const std::string& t,const std::string& col){
    auto es=obtenerEsquema(t); if(std::find(es.begin(),es.end(),col)==es.end()||col=="activo") return false;
    std::set<std::string> vistos; for(const auto&r:listarTodo(t)){auto v=r.at(col);if(!v.empty()&&!esNulo(v)&&!vistos.insert(v).second){std::cerr<<"No se puede aplicar UNICO: hay valores duplicados\n";return false;}}
    if(obtenerRestricciones(t,col).unico) return true;
    std::ofstream(rutaTabla(t,".rel"),std::ios::app)<<"UQ,"<<col<<"\n"; return true;
}

bool UnicornBBDD::establecerPorDefecto(const std::string& t,const std::string& col,const std::string& valor){
    auto es=obtenerEsquema(t); if(std::find(es.begin(),es.end(),col)==es.end()||col=="id"||col=="activo") return false;
    // Reescribe solo la entrada DF de esta columna, conservando el resto de metadatos.
    std::vector<std::string> lineas; std::ifstream in(rutaTabla(t,".rel")); std::string l;
    while(std::getline(in,l)){auto v=UnicornSerializador().desserializar(l);if(!(v.size()>=2&&v[0]=="DF"&&v[1]==col))lineas.push_back(l);}
    std::ofstream out(rutaTabla(t,".rel"),std::ios::trunc);for(const auto&x:lineas)out<<x<<"\n";out<<"DF,"<<col<<","<<valor<<"\n";return bool(out);
}

bool UnicornBBDD::prepararYValidarRestricciones(const std::string& t,std::vector<std::string>& datos,long long idIgnorar) const {
    auto es=obtenerEsquema(t); if(es.size()<2||datos.size()!=es.size()-2) return false;
    for(size_t i=2;i<es.size();++i){
        auto rc=obtenerRestricciones(t,es[i]); auto& valor=datos[i-2];
        if(valor.empty()&&rc.tieneDefecto) valor=rc.valorDefecto;
        if(rc.noNulo&&(valor.empty()||esNulo(valor))){std::cerr<<"Violacion NO NULO: "<<t<<"."<<es[i]<<"\n";return false;}
        if(rc.unico&&!valor.empty()&&!esNulo(valor)) for(const auto&r:listarTodo(t)) if(r.at(es[i])==valor && std::stoll(r.at("id"))!=idIgnorar){std::cerr<<"Violacion UNICO: "<<t<<"."<<es[i]<<"="<<valor<<"\n";return false;}
    }
    return true;
}

bool UnicornBBDD::anadirClaveForanea(const std::string& t,const std::string& col,const std::string& tr,const std::string& cr){
    if(basededatos.empty()) return false;
    auto es=obtenerEsquema(t), er=obtenerEsquema(tr);
    if(es.empty()||er.empty()){std::cerr<<"Tabla local o referenciada no encontrada\n";return false;}
    if(std::find(es.begin(),es.end(),col)==es.end()){std::cerr<<"Columna local no encontrada: "<<col<<"\n";return false;}
    if(std::find(er.begin(),er.end(),cr)==er.end()){std::cerr<<"Columna referenciada no encontrada: "<<cr<<"\n";return false;}
    if(cr!="id"){std::cerr<<"En esta version la FK debe referenciar la PK id\n";return false;}
    for(const auto& fk:obtenerClavesForaneas(t)) if(fk.columna==col){std::cerr<<"La columna ya tiene clave foranea\n";return false;}
    // Los datos existentes tambien deben cumplir la nueva restriccion.
    for(const auto& r:listarTodo(t)){
        auto it=r.find(col); if(it!=r.end()&&!it->second.empty()&&!esNulo(it->second)&&!registroReferenciado(tr,cr,it->second)){
            std::cerr<<"No se puede crear FK: valor existente sin referencia: "<<it->second<<"\n";return false;
        }
    }
    std::ofstream f(rutaTabla(t,".rel"),std::ios::app);
    f<<"FK,"<<col<<","<<tr<<","<<cr<<"\n";
    return bool(f);
}

bool UnicornBBDD::registroReferenciado(const std::string& t,const std::string& col,const std::string& valor) const {
    if(valor.empty()||esNulo(valor)) return true;
    if(col=="id"){
        try { return !seleccionar(t,std::stoll(valor)).empty(); } catch(...) { return false; }
    }
    return !buscarColumna(t,col,valor).empty();
}

bool UnicornBBDD::validarClavesForaneas(const std::string& t,const std::vector<std::string>& datos) const {
    auto es=obtenerEsquema(t);
    if(es.size()<2||datos.size()!=es.size()-2) return false;
    for(const auto& fk:obtenerClavesForaneas(t)){
        auto it=std::find(es.begin()+2,es.end(),fk.columna);
        if(it==es.end()) return false;
        size_t pos=static_cast<size_t>(it-(es.begin()+2));
        const auto& valor=datos[pos];
        if(!valor.empty()&&!esNulo(valor)&&!registroReferenciado(fk.tablaReferenciada,fk.columnaReferenciada,valor)){
            std::cerr<<"Violacion de clave foranea: "<<t<<"."<<fk.columna<<"="<<valor
                     <<" no existe en "<<fk.tablaReferenciada<<"."<<fk.columnaReferenciada<<"\n";
            return false;
        }
    }
    return true;
}

bool UnicornBBDD::puedeEliminarRegistro(const std::string& t,const std::map<std::string,std::string>& registro) const {
    if(basededatos.empty()) return false;
    fs::path dir=fs::path(instalacion)/basededatos;
    if(!fs::exists(dir)) return false;
    for(const auto& entry:fs::directory_iterator(dir)){
        if(entry.path().extension()!=".rel") continue;
        std::string hija=entry.path().stem().string();
        for(const auto& fk:obtenerClavesForaneas(hija)){
            if(fk.tablaReferenciada!=t) continue;
            auto it=registro.find(fk.columnaReferenciada);
            if(it==registro.end()) continue;
            if(!buscarColumna(hija,fk.columna,it->second).empty()){
                std::cerr<<"No se puede eliminar: registro referenciado desde "<<hija<<"."<<fk.columna<<"\n";
                return false;
            }
        }
    }
    return true;
}

std::vector<std::string> UnicornBBDD::obtenerEsquema(const std::string& t) const { std::ifstream f(rutaTabla(t,".esquema")); if(!f) return {}; std::string s((std::istreambuf_iterator<char>(f)),{}); return UnicornSerializador().desserializar(s); }
long long UnicornBBDD::siguienteId(const std::string& t) const { std::ifstream f(rutaTabla(t,".idx")); long long ultimo=0,id,pos; char c; while(f>>id>>c>>pos) ultimo=std::max(ultimo,id); std::ifstream contador(rutaTabla(t,".ultimo")); if(contador>>id)ultimo=std::max(ultimo,id); return ultimo+1; }
std::string UnicornBBDD::prepararRegistro(const std::vector<std::string>& e) const { auto s=UnicornSerializador().serializar(e); if(s.size()>tamanoRegistro-1) throw std::runtime_error("Registro demasiado grande"); s.append(tamanoRegistro-1-s.size(),' '); s.push_back('\n'); return s; }
long long UnicornBBDD::insertarDatos(const std::string& t,const std::vector<std::string>& entrada){
    if(basededatos.empty()||!fs::exists(rutaTabla(t,".csv"))) return -1;
    auto es=obtenerEsquema(t); std::vector<std::string> datos=entrada;
    if(es.size()<2||datos.size()!=es.size()-2){std::cerr<<"Numero de valores incorrecto\n";return -1;}
    auto tipos=obtenerTipos(t); for(size_t i=0;i<datos.size();++i){auto tipo=tipos[es[i+2]];datos[i]=normalizarTipo(tipo,datos[i]);if(!validarTipo(tipo,datos[i])){std::cerr<<"Tipo invalido para "<<es[i+2]<<": "<<datos[i]<<" (esperado "<<tipoNombre(tipo)<<")\n";return -1;}} if(!prepararYValidarRestricciones(t,datos)||!validarClavesForaneas(t,datos)) return -1;
    auto id=siguienteId(t); std::vector<std::string> e={std::to_string(id),"1"}; e.insert(e.end(),datos.begin(),datos.end());
    auto reg=prepararRegistro(e); std::ofstream f(rutaTabla(t,".csv"),std::ios::binary|std::ios::app); auto pos=fs::file_size(rutaTabla(t,".csv"));
    f.write(reg.data(),reg.size()); if(!f) return -1; f.close();
    std::ofstream indice(rutaTabla(t,".idx"),std::ios::app); indice<<id<<","<<pos<<"\n"; indice.close();
    if(!indice)return -1;
    std::ofstream(rutaTabla(t,".ultimo"),std::ios::trunc)<<id;
    actualizarIndicesTabla(t);
    return id;
}
std::int64_t UnicornBBDD::buscarPosicion(const std::string& t,long long buscado) const { std::ifstream f(rutaTabla(t,".idx")); long long id,pos; char c; while(f>>id>>c>>pos) if(id==buscado) return pos; return -1; }
std::vector<std::string> UnicornBBDD::leerRegistro(const std::string& t,long long id) const { auto pos=buscarPosicion(t,id); if(pos<0)return{}; std::ifstream f(rutaTabla(t,".csv"),std::ios::binary); f.seekg(pos); std::string b(tamanoRegistro,'\0'); f.read(b.data(),tamanoRegistro); b.resize(f.gcount()); auto e=UnicornSerializador().desserializar(trimDerecha(b)); if(e.size()<2||e[1]=="0")return{}; return e; }
std::map<std::string,std::string> UnicornBBDD::seleccionar(const std::string& t,long long id) const { auto e=leerRegistro(t,id), es=obtenerEsquema(t); std::map<std::string,std::string> r; if(e.size()!=es.size())return r; for(size_t i=0;i<es.size();++i)r[es[i]]=e[i]; return r; }
std::vector<std::map<std::string,std::string>> UnicornBBDD::listarTodo(const std::string& t) const { std::vector<std::map<std::string,std::string>> out; auto es=obtenerEsquema(t); std::ifstream f(rutaTabla(t,".csv"),std::ios::binary); while(f){std::string b(tamanoRegistro,'\0');f.read(b.data(),tamanoRegistro);if(f.gcount()==0)break;b.resize(f.gcount());auto e=UnicornSerializador().desserializar(trimDerecha(b));if(e.size()==es.size()&&e.size()>1&&e[1]=="1"){std::map<std::string,std::string> r;for(size_t i=0;i<es.size();++i)r[es[i]]=e[i];out.push_back(r);}}return out; }
std::vector<std::map<std::string,std::string>> UnicornBBDD::buscarColumna(const std::string& t,const std::string& col,const std::string& val) const { auto es=obtenerEsquema(t); auto it=std::find(es.begin(),es.end(),col); if(it==es.end())return{}; size_t p=it-es.begin(); std::vector<std::map<std::string,std::string>> out; if(buscarConIndice(t,col,val,out))return out; for(auto&r:listarTodo(t)) if(r.at(es[p])==val) out.push_back(r); return out; }
bool UnicornBBDD::actualizar(const std::string& t,long long id,const std::vector<std::string>& datos){
    auto pos=buscarPosicion(t,id); auto es=obtenerEsquema(t);
    if(pos<0||leerRegistro(t,id).empty()||datos.size()!=es.size()-2) return false;
    std::vector<std::string> validados=datos; auto tipos=obtenerTipos(t);for(size_t i=0;i<validados.size();++i){auto tipo=tipos[es[i+2]];validados[i]=normalizarTipo(tipo,validados[i]);if(!validarTipo(tipo,validados[i])){std::cerr<<"Tipo invalido para "<<es[i+2]<<"\n";return false;}} if(!prepararYValidarRestricciones(t,validados,id)||!validarClavesForaneas(t,validados)) return false;
    std::vector<std::string> e={std::to_string(id),"1"}; e.insert(e.end(),validados.begin(),validados.end()); auto reg=prepararRegistro(e);
    std::fstream f(rutaTabla(t,".csv"),std::ios::binary|std::ios::in|std::ios::out); f.seekp(pos); f.write(reg.data(),reg.size()); bool correcto=bool(f); f.close(); if(correcto)actualizarIndicesTabla(t); return correcto;
}
/*OLD*/
#if 0
    std::vector<std::string> e={std::to_string(id),"1"}; e.insert(e.end(),datos.begin(),datos.end()); auto reg=prepararRegistro(e);
    std::fstream f(rutaTabla(t,".csv"),std::ios::binary|std::ios::in|std::ios::out); f.seekp(pos); f.write(reg.data(),reg.size()); return bool(f);
}
#endif
bool UnicornBBDD::eliminar(const std::string& t,long long id){
    auto pos=buscarPosicion(t,id); auto e=leerRegistro(t,id); if(pos<0||e.empty()) return false;
    auto registro=seleccionar(t,id); if(!puedeEliminarRegistro(t,registro)) return false;
    e[1]="0"; auto reg=prepararRegistro(e); std::fstream f(rutaTabla(t,".csv"),std::ios::binary|std::ios::in|std::ios::out); f.seekp(pos); f.write(reg.data(),reg.size()); bool correcto=bool(f); f.close(); if(correcto)actualizarIndicesTabla(t); return correcto;
}

long long UnicornBBDD::insertarConColumnas(const std::string& t,const std::vector<std::string>& columnas,const std::vector<std::string>& valores){
    auto es=obtenerEsquema(t); if(es.size()<2||columnas.size()!=valores.size()) return -1;
    std::vector<std::string> datos(es.size()-2,"");
    for(size_t i=0;i<columnas.size();++i){
        auto it=std::find(es.begin()+2,es.end(),columnas[i]);
        if(it==es.end()){std::cerr<<"Columna no encontrada: "<<columnas[i]<<"\n";return -1;}
        datos[static_cast<size_t>(it-(es.begin()+2))]=valores[i];
    }
    return insertarDatos(t,datos);
}

long long UnicornBBDD::insertarDesdeSeleccion(const std::string& destino,const std::string& origen){
    auto ed=obtenerEsquema(destino), eo=obtenerEsquema(origen);
    if(ed.size()<2||eo.size()<2||ed.size()!=eo.size()){std::cerr<<"Los esquemas no son compatibles\n";return -1;}
    long long n=0;
    for(const auto&r:listarTodo(origen)){
        std::vector<std::string> datos;
        for(size_t i=2;i<eo.size();++i) datos.push_back(r.at(eo[i]));
        if(insertarDatos(destino,datos)<0) return -1;
        ++n;
    }
    return n;
}

long long UnicornBBDD::actualizarDonde(const std::string& t,const std::map<std::string,std::string>& cambios,const std::string& colDonde,const std::string& valDonde){
    auto es=obtenerEsquema(t); if(es.size()<2||cambios.empty()) return -1;
    for(const auto&[c,v]:cambios){(void)v;if(c=="id"||c=="activo"||std::find(es.begin(),es.end(),c)==es.end()){std::cerr<<"Columna no modificable: "<<c<<"\n";return -1;}}
    if(!colDonde.empty()&&std::find(es.begin(),es.end(),colDonde)==es.end()){std::cerr<<"Columna WHERE/DONDE no encontrada\n";return -1;}
    long long n=0;
    auto filas=listarTodo(t);
    for(auto&r:filas){
        if(!colDonde.empty() && r.at(colDonde)!=valDonde) continue;
        std::vector<std::string> datos;
        for(size_t i=2;i<es.size();++i){auto it=cambios.find(es[i]);datos.push_back(it==cambios.end()?r.at(es[i]):it->second);}
        if(actualizar(t,std::stoll(r.at("id")),datos)) ++n;
        else return -1;
    }
    return n;
}

long long UnicornBBDD::eliminarDonde(const std::string& t,const std::string& colDonde,const std::string& valDonde){
    auto es=obtenerEsquema(t); if(es.size()<2) return -1;
    if(!colDonde.empty()&&std::find(es.begin(),es.end(),colDonde)==es.end()){std::cerr<<"Columna WHERE/DONDE no encontrada\n";return -1;}
    long long n=0;
    auto filas=listarTodo(t);
    for(const auto&r:filas){
        if(!colDonde.empty() && r.at(colDonde)!=valDonde) continue;
        if(eliminar(t,std::stoll(r.at("id")))) ++n;
    }
    return n;
}

// -----------------------------------------------------------------------------
// DQL: SELECCIONAR ... DE ...
// Subconjunto implementado: DISTINTO, COMO (alias y LIKE), DONDE, = <> != > <
// >= <=, Y/O/NO, ENTRE, EN, ORDENAR POR, ASCENDENTE/DESCENDENTE y LIMITE.
// -----------------------------------------------------------------------------
namespace {
struct TokenDQL { std::string texto; bool literal=false; };
static std::string dqlMayus(std::string s){std::transform(s.begin(),s.end(),s.begin(),[](unsigned char c){return std::toupper(c);});return s;}
static bool dqlNumero(const std::string&s,double&v){char*e=nullptr;v=std::strtod(s.c_str(),&e);return e&&*e=='\0'&&e!=s.c_str();}
static int dqlComparar(const std::string&a,const std::string&b){double x,y;if(dqlNumero(a,x)&&dqlNumero(b,y))return x<y?-1:(x>y?1:0);return a<b?-1:(a>b?1:0);}
static std::vector<TokenDQL> dqlTokens(const std::string&s){
 std::vector<TokenDQL> r; size_t i=0;
 while(i<s.size()){
  if(std::isspace((unsigned char)s[i])||s[i]==';'){++i;continue;}
  if(s[i]=='\''||s[i]=='"'){char q=s[i++];std::string v;bool cerrada=false;while(i<s.size()){if(s[i]==q){if(i+1<s.size()&&s[i+1]==q){v+=q;i+=2;continue;}++i;cerrada=true;break;}v+=s[i++];}if(!cerrada)throw std::runtime_error("Comillas sin cerrar en la consulta");r.push_back({v,true});continue;}
  if(std::string("(),*").find(s[i])!=std::string::npos){r.push_back({std::string(1,s[i++]),false});continue;}
  if(std::string("=<>!").find(s[i])!=std::string::npos){std::string v(1,s[i++]);if(i<s.size()&&(s[i]=='='||(v=="<"&&s[i]=='>')))v+=s[i++];r.push_back({v,false});continue;}
  std::string v;while(i<s.size()&&!std::isspace((unsigned char)s[i])&&std::string("(),;*=<>!\"'").find(s[i])==std::string::npos)v+=s[i++];
  if(!v.empty())r.push_back({v,false});
 }
 return r;
}
class ExprDQL {
 const std::vector<TokenDQL>&t; size_t p=0; const std::map<std::string,std::string>&f;
 bool kw(const std::string&x)const{return p<t.size()&&!t[p].literal&&dqlMayus(t[p].texto)==x;}
 bool tomar(const std::string&x){if(kw(x)){++p;return true;}return false;}
 std::string valor(bool exigeColumna=false){if(p>=t.size())throw std::runtime_error("Falta un valor en DONDE");auto x=t[p++];if(!x.literal){auto it=f.find(x.texto);if(it!=f.end())return it->second;if(dqlMayus(x.texto)=="NULL")return UnicornBBDD::valorNulo();double numero;if(exigeColumna&&!dqlNumero(x.texto,numero))throw std::runtime_error("Columna no encontrada: "+x.texto);}return x.texto;}
 bool prim(){
  if(p<t.size()&&t[p].texto=="("){++p;bool v=o();if(p>=t.size()||t[p].texto!=")")throw std::runtime_error("Falta ')' en DONDE");++p;return v;}
  std::string izq=valor(true); bool neg=tomar("NO");
  if(tomar("ENTRE")){std::string a=valor();if(!tomar("Y"))throw std::runtime_error("ENTRE necesita Y");std::string b=valor();bool v=!UnicornBBDD::esNulo(izq)&&!UnicornBBDD::esNulo(a)&&!UnicornBBDD::esNulo(b)&&dqlComparar(izq,a)>=0&&dqlComparar(izq,b)<=0;return neg?!v:v;}
  if(tomar("EN")){if(p>=t.size()||t[p++].texto!="(")throw std::runtime_error("EN necesita '('");bool v=false;while(p<t.size()&&t[p].texto!=")"){auto actual=valor();if(!UnicornBBDD::esNulo(izq)&&!UnicornBBDD::esNulo(actual)&&izq==actual)v=true;if(p<t.size()&&t[p].texto==",")++p;else break;}if(p>=t.size()||t[p++].texto!=")")throw std::runtime_error("EN necesita ')'");return neg?!v:v;}
  if(tomar("COMO")||tomar("LIKE")){std::string patron=valor(), rx="^";for(char c:patron){if(c=='%')rx+=".*";else if(c=='_')rx+='.';else{if(std::string(".^$|()[]{}*+?\\").find(c)!=std::string::npos)rx+='\\';rx+=c;}}rx+="$";bool v=!UnicornBBDD::esNulo(izq)&&!UnicornBBDD::esNulo(patron)&&std::regex_match(izq,std::regex(rx));return neg?!v:v;}
  if(neg) throw std::runtime_error("NO debe preceder una condicion, ENTRE, EN o COMO");
  if(p>=t.size())throw std::runtime_error("Falta operador de comparacion");std::string op=t[p++].texto;std::string der=valor();if(UnicornBBDD::esNulo(izq)||UnicornBBDD::esNulo(der))return false;int c=dqlComparar(izq,der);
  if(op=="=")return c==0;if(op=="<>"||op=="!=")return c!=0;if(op==">")return c>0;if(op=="<")return c<0;if(op==">=")return c>=0;if(op=="<=")return c<=0;throw std::runtime_error("Operador no soportado: "+op);
 }
 bool no(){if(tomar("NO"))return !no();return prim();}
 bool y(){bool v=no();while(tomar("Y")){bool d=no();v=v&&d;}return v;}
 bool o(){bool v=y();while(tomar("O")){bool d=y();v=v||d;}return v;}
public: ExprDQL(const std::vector<TokenDQL>&tt,const std::map<std::string,std::string>&ff):t(tt),f(ff){} bool evaluar(){if(t.empty())return true;bool v=o();if(p!=t.size())throw std::runtime_error("Expresion DONDE no reconocida cerca de: "+t[p].texto);return v;}
};
struct CampoDQL{
 std::string nombre,alias,funcion;
 bool agregado() const { return !funcion.empty(); }
};
static std::string dqlNumeroTexto(double v){
 std::ostringstream o; o<<std::setprecision(15)<<v; std::string s=o.str();
 if(s.find('.')!=std::string::npos){while(!s.empty()&&s.back()=='0')s.pop_back();if(!s.empty()&&s.back()=='.')s.pop_back();}
 return s;
}
}

ResultadoConsulta UnicornBBDD::consultarInterno(const std::string& consulta, int profundidad) const {
    auto t=dqlTokens(consulta); size_t p=0;
    auto kw=[&](const std::string&x){return p<t.size()&&!t[p].literal&&dqlMayus(t[p].texto)==x;};
    auto toma=[&](const std::string&x){if(kw(x)){++p;return true;}return false;};
    if(!toma("SELECCIONAR")) throw std::runtime_error("La consulta debe comenzar por SELECCIONAR");
    bool distinto=toma("DISTINTO");
    std::vector<CampoDQL> campos; bool estrella=false;
    if(p<t.size()&&t[p].texto=="*"){estrella=true;++p;}
    else while(p<t.size()&&!kw("DE")){
        CampoDQL c;
        std::string posible=dqlMayus(t[p].texto);
        if((posible=="CONTAR"||posible=="SUMA"||posible=="MEDIA"||posible=="MINIMO"||posible=="MAXIMO") && p+1<t.size() && t[p+1].texto=="("){
            c.funcion=posible; p+=2;
            if(p>=t.size()) throw std::runtime_error("Falta argumento de funcion agregada");
            c.nombre=t[p++].texto;
            if(p>=t.size()||t[p++].texto!=")") throw std::runtime_error("Falta ')' en funcion agregada");
            c.alias=c.funcion+"("+c.nombre+")";
        } else { c.nombre=t[p++].texto; c.alias=c.nombre; }
        if(toma("COMO")){if(p>=t.size())throw std::runtime_error("Falta alias tras COMO");c.alias=t[p++].texto;}
        campos.push_back(c);
        if(p<t.size()&&t[p].texto==","){++p;continue;}
        if(!kw("DE")) throw std::runtime_error("Se esperaba ',' o DE");
    }
    if(!toma("DE")||p>=t.size()) throw std::runtime_error("Falta DE tabla");
    std::string tablaBase=t[p++].texto; std::vector<std::string> esquemaBase; std::vector<std::map<std::string,std::string>> filasVistaBase;
    auto esInicioClausula=[&](){return kw("JOIN")||kw("UNIR")||kw("INNER")||kw("LEFT")||kw("IZQUIERDA")||kw("RIGHT")||kw("FULL")||kw("CROSS")||kw("DONDE")||kw("AGRUPAR")||kw("TENIENDO")||kw("ORDENAR")||kw("LIMITE");};
    std::string aliasBase=tablaBase;
    if(toma("COMO")){if(p>=t.size())throw std::runtime_error("Falta alias de tabla");aliasBase=t[p++].texto;}
    else if(p<t.size()&&!esInicioClausula())aliasBase=t[p++].texto;
    if(esVista(tablaBase)){if(profundidad>12)throw std::runtime_error("Demasiada recursion de vistas");auto rv=consultarInterno(consultaVista(tablaBase),profundidad+1);esquemaBase=rv.columnas;for(const auto&fila:rv.filas){std::map<std::string,std::string> m;for(size_t i=0;i<rv.columnas.size();++i)m[rv.columnas[i]]=fila[i];filasVistaBase.push_back(std::move(m));}}
    else esquemaBase=obtenerEsquema(tablaBase);
    if(esquemaBase.empty()) throw std::runtime_error("Tabla o vista no encontrada: "+tablaBase);

    struct JoinInfo{std::string tabla,alias,izq,der,tipo;}; std::vector<JoinInfo> joins;
    while(kw("JOIN")||kw("UNIR")||kw("INNER")||kw("LEFT")||kw("IZQUIERDA")||kw("RIGHT")||kw("FULL")||kw("CROSS")){
        std::string tipo="INNER";
        if(!kw("JOIN")&&!kw("UNIR")){tipo=dqlMayus(t[p++].texto);if(tipo=="IZQUIERDA")tipo="LEFT";}
        if(!(toma("JOIN")||toma("UNIR")))throw std::runtime_error("Se esperaba JOIN");
        if(p>=t.size())throw std::runtime_error("Falta tabla tras JOIN"); std::string tj=t[p++].texto;
        if(obtenerEsquema(tj).empty())throw std::runtime_error("Tabla JOIN no encontrada: "+tj);
        std::string alias=tj;
        if(toma("COMO")){if(p>=t.size())throw std::runtime_error("Falta alias JOIN");alias=t[p++].texto;}
        else if(p<t.size()&&!kw("EN")&&!kw("ON")&&!esInicioClausula())alias=t[p++].texto;
        std::string izq,der;
        if(tipo!="CROSS"){
            if(!(toma("EN")||toma("ON")))throw std::runtime_error("JOIN necesita EN");
            if(p>=t.size())throw std::runtime_error("Falta columna izquierda en JOIN");izq=t[p++].texto;
            if(p>=t.size()||t[p++].texto!="=")throw std::runtime_error("JOIN solo admite igualdad en esta version");
            if(p>=t.size())throw std::runtime_error("Falta columna derecha en JOIN");der=t[p++].texto;
        }
        joins.push_back({tj,alias,izq,der,tipo});
    }

    auto cualificar=[&](const std::string& tabla,const std::string& alias,const std::map<std::string,std::string>& fila){
        std::map<std::string,std::string> r; for(const auto&[k,v]:fila){r[alias+"."+k]=v;r[tabla+"."+k]=v;if(!r.count(k))r[k]=v;} return r;
    };
    std::vector<std::map<std::string,std::string>> filas;
    std::vector<std::map<std::string,std::string>> filasBase;
    bool usaIndice=false;
    if(!esVista(tablaBase)&&kw("DONDE")&&p+4<=t.size()&&t[p+2].texto=="="&&
       (p+4==t.size()||dqlMayus(t[p+4].texto)=="ORDENAR"||dqlMayus(t[p+4].texto)=="LIMITE"||dqlMayus(t[p+4].texto)=="AGRUPAR"||dqlMayus(t[p+4].texto)=="TENIENDO")){
        std::string columna=t[p+1].texto;
        auto punto=columna.find('.');
        if(punto!=std::string::npos){if(columna.substr(0,punto)==aliasBase||columna.substr(0,punto)==tablaBase)columna=columna.substr(punto+1);else columna.clear();}
        double numeroIndice=0;
        if(!columna.empty()&&(t[p+3].literal||dqlNumero(t[p+3].texto,numeroIndice))&&
           !indicePara(tablaBase,columna).empty()&&!esNulo(t[p+3].texto))
            usaIndice=buscarConIndice(tablaBase,columna,t[p+3].texto,filasBase);
    }
    if(esVista(tablaBase))filasBase=filasVistaBase;
    else if(!usaIndice)filasBase=listarTodo(tablaBase);
    for(const auto&f:filasBase)filas.push_back(cualificar(tablaBase,aliasBase,f));
    std::vector<std::string> esquemaSalida; for(const auto&c:esquemaBase) esquemaSalida.push_back(joins.empty()?c:aliasBase+"."+c);
    for(const auto&j:joins){
        auto ej=obtenerEsquema(j.tabla);auto esquemaAnterior=esquemaSalida;
        for(const auto&c:ej) esquemaSalida.push_back(j.alias+"."+c);
        std::vector<std::map<std::string,std::string>> nuevas; auto derechas=listarTodo(j.tabla);
        std::vector<bool> coincidioDerecha(derechas.size(),false);
        for(const auto&acum:filas){ bool encontrado=false;
            for(size_t posicion=0;posicion<derechas.size();++posicion){
                auto q=cualificar(j.tabla,j.alias,derechas[posicion]); auto comb=acum; for(const auto&[k,v]:q) if(k.find('.')!=std::string::npos||!comb.count(k)) comb[k]=v;
                auto valor=[&](const std::string&n){auto it=comb.find(n);if(it==comb.end())throw std::runtime_error("Columna JOIN no encontrada: "+n);return it->second;};
                if(j.tipo=="CROSS"||(!esNulo(valor(j.izq))&&!esNulo(valor(j.der))&&valor(j.izq)==valor(j.der))){nuevas.push_back(std::move(comb));encontrado=true;coincidioDerecha[posicion]=true;}
            }
            if((j.tipo=="LEFT"||j.tipo=="FULL")&&!encontrado){auto comb=acum;for(const auto&c:ej){comb[j.alias+"."+c]=valorNulo();comb[j.tabla+"."+c]=valorNulo();if(!comb.count(c))comb[c]=valorNulo();}nuevas.push_back(std::move(comb));}
        } filas=std::move(nuevas);
        if(j.tipo=="RIGHT"||j.tipo=="FULL")for(size_t posicion=0;posicion<derechas.size();++posicion)if(!coincidioDerecha[posicion]){
            std::map<std::string,std::string> comb;for(const auto&c:esquemaAnterior){
                comb[c]=valorNulo();auto punto=c.find('.');
                if(punto!=std::string::npos){
                    auto nombre=c.substr(punto+1),alias=c.substr(0,punto),tabla=alias;
                    if(alias==aliasBase)tabla=tablaBase;
                    for(const auto& anterior:joins)if(anterior.alias==alias)tabla=anterior.tabla;
                    comb[tabla+"."+nombre]=valorNulo();
                    if(!comb.count(nombre))comb[nombre]=valorNulo();
                }
            }
            auto q=cualificar(j.tabla,j.alias,derechas[posicion]);for(const auto&[k,v]:q)if(k.find('.')!=std::string::npos||!comb.count(k))comb[k]=v;
            filas.push_back(std::move(comb));
        }
    }
    if(estrella){for(const auto&c:esquemaSalida)campos.push_back({c,c,""});}
    auto existeCampo=[&](const std::string& c){
        if(c=="*")return true;
        if(!filas.empty())return filas.front().count(c)>0;
        if(c.find('.')!=std::string::npos){auto q=c.find('.');std::string tabla=c.substr(0,q);if(tabla==aliasBase)tabla=tablaBase;for(const auto&j:joins)if(tabla==j.alias)tabla=j.tabla;auto e=obtenerEsquema(tabla);return std::find(e.begin(),e.end(),c.substr(q+1))!=e.end();}
        return std::find(esquemaBase.begin(),esquemaBase.end(),c)!=esquemaBase.end();
    };
    for(const auto&c:campos)if(!existeCampo(c.nombre))throw std::runtime_error("Columna no encontrada: "+c.nombre);

    std::vector<TokenDQL> donde,having; std::vector<std::string> grupos; std::string orden; bool desc=false; long long limite=-1;
    if(toma("DONDE")){int nivel=0;while(p<t.size()){if(t[p].texto=="(")++nivel;if(t[p].texto==")")--nivel;if(nivel==0&&(kw("AGRUPAR")||kw("TENIENDO")||kw("ORDENAR")||kw("LIMITE")))break;donde.push_back(t[p++]);}if(donde.empty())throw std::runtime_error("Falta expresion DONDE");}
    if(toma("AGRUPAR")){if(!toma("POR"))throw std::runtime_error("AGRUPAR necesita POR");while(p<t.size()&&!kw("TENIENDO")&&!kw("ORDENAR")&&!kw("LIMITE")){grupos.push_back(t[p++].texto);if(p<t.size()&&t[p].texto==",")++p;else break;}}
    if(toma("TENIENDO")){int nivel=0;while(p<t.size()){if(t[p].texto=="(")++nivel;if(t[p].texto==")")--nivel;if(nivel==0&&(kw("ORDENAR")||kw("LIMITE")))break;having.push_back(t[p++]);}}
    if(toma("ORDENAR")){if(!toma("POR")||p>=t.size())throw std::runtime_error("ORDENAR necesita POR columna");orden=t[p++].texto;if(toma("DESCENDENTE"))desc=true;else toma("ASCENDENTE");}
    if(toma("LIMITE")){if(p>=t.size())throw std::runtime_error("Falta numero tras LIMITE");limite=std::stoll(t[p++].texto);if(limite<0)throw std::runtime_error("LIMITE no puede ser negativo");}
    if(p!=t.size())throw std::runtime_error("Clausula no reconocida: "+t[p].texto);
    for(const auto&g:grupos)if(!existeCampo(g))throw std::runtime_error("Columna AGRUPAR no encontrada: "+g);

    std::vector<std::map<std::string,std::string>> filtradas;
    for(const auto&f:filas)if(donde.empty()||ExprDQL(donde,f).evaluar())filtradas.push_back(f);
    bool hayAgregados=std::any_of(campos.begin(),campos.end(),[](const CampoDQL&c){return c.agregado();});
    if(!hayAgregados&&!grupos.empty()) throw std::runtime_error("AGRUPAR POR requiere al menos una funcion agregada");
    if(!hayAgregados&&!having.empty()) throw std::runtime_error("TENIENDO requiere una consulta agregada");
    if(hayAgregados){for(const auto&c:campos)if(!c.agregado()&&std::find(grupos.begin(),grupos.end(),c.nombre)==grupos.end())throw std::runtime_error("Columna no agregada debe aparecer en AGRUPAR POR: "+c.nombre);}

    ResultadoConsulta r; for(const auto&c:campos)r.columnas.push_back(c.alias);
    std::vector<std::map<std::string,std::string>> salidaMap;
    if(hayAgregados){
        std::map<std::string,std::vector<std::map<std::string,std::string>>> bolsas;
        if(grupos.empty()) bolsas[""]=filtradas;
        else for(const auto&f:filtradas){std::string k;for(const auto&g:grupos)k+=std::to_string(f.at(g).size())+":"+f.at(g)+"|";bolsas[k].push_back(f);}
        if(filtradas.empty()&&grupos.empty()) bolsas[""]={};
        for(const auto&[clave,bolsa]:bolsas){(void)clave;std::map<std::string,std::string> out;
            for(const auto&c:campos){std::string v;
                if(!c.agregado()) v=bolsa.empty()?"":bolsa.front().at(c.nombre);
                else if(c.funcion=="CONTAR"){
                    if(c.nombre=="*")v=std::to_string(bolsa.size());else{long long n=0;for(const auto&f:bolsa)if(f.count(c.nombre)&&!esNulo(f.at(c.nombre)))++n;v=std::to_string(n);}
                } else if(c.funcion=="SUMA"||c.funcion=="MEDIA"){
                    double suma=0;long long n=0;for(const auto&f:bolsa){if(esNulo(f.at(c.nombre)))continue;double x;if(!dqlNumero(f.at(c.nombre),x))throw std::runtime_error(c.funcion+" requiere valores numericos en "+c.nombre);suma+=x;++n;}v=n?dqlNumeroTexto(c.funcion=="MEDIA"?suma/n:suma):valorNulo();
                } else if(c.funcion=="MINIMO"||c.funcion=="MAXIMO"){
                    v=valorNulo();for(const auto&f:bolsa){auto actual=f.at(c.nombre);if(esNulo(actual))continue;int cmp=esNulo(v)?0:dqlComparar(actual,v);if(esNulo(v)||(c.funcion=="MINIMO"&&cmp<0)||(c.funcion=="MAXIMO"&&cmp>0))v=actual;}
                }
                out[c.alias]=v;out[c.funcion+"("+c.nombre+")"]=v;if(!c.agregado())out[c.nombre]=v;
            }
            if(having.empty()||ExprDQL(having,out).evaluar())salidaMap.push_back(std::move(out));
        }
    } else {
        for(const auto&f:filtradas){std::map<std::string,std::string> out=f;for(const auto&c:campos)out[c.alias]=f.at(c.nombre);salidaMap.push_back(std::move(out));}
    }
    if(!orden.empty()){
        auto tieneOrden=[&](const auto&f){return f.count(orden)>0;}; if(!salidaMap.empty()&&!tieneOrden(salidaMap.front()))throw std::runtime_error("Columna de ordenacion no encontrada: "+orden);
        std::stable_sort(salidaMap.begin(),salidaMap.end(),[&](const auto&a,const auto&b){int c=dqlComparar(a.at(orden),b.at(orden));return desc?c>0:c<0;});
    }
    std::set<std::string> vistos;
    if(limite==0)return r;
    for(const auto&f:salidaMap){std::vector<std::string> fila;std::string clave;for(const auto&c:campos){auto v=f.at(c.alias);fila.push_back(v);clave+=std::to_string(v.size())+":"+v+"|";}if(distinto&&!vistos.insert(clave).second)continue;r.filas.push_back(std::move(fila));if(limite>=0&&(long long)r.filas.size()>=limite)break;}
    return r;
}


ResultadoConsulta UnicornBBDD::consultar(const std::string& consulta) const{
    std::string q=consulta;
    // Subconsultas no correlacionadas. Se resuelven de dentro hacia fuera.
    for(int guard=0;guard<16;++guard){
        size_t ini=std::string::npos,fin=std::string::npos;int nivel=0,nivelObjetivo=-1;bool comilla=false;char qc=0;
        for(size_t i=0;i<q.size();++i){char c=q[i];if((c=='\''||c=='"')){if(!comilla){comilla=true;qc=c;}else if(qc==c)comilla=false;continue;}if(comilla)continue;
            if(c=='('){++nivel;size_t j=i+1;while(j<q.size()&&std::isspace((unsigned char)q[j]))++j;std::string pref=q.substr(j,std::min<size_t>(11,q.size()-j));std::transform(pref.begin(),pref.end(),pref.begin(),[](unsigned char x){return std::toupper(x);});if(pref.rfind("SELECCIONAR",0)==0){ini=i;nivelObjetivo=nivel;}}
            else if(c==')'&&nivel>0){if(ini!=std::string::npos&&nivel==nivelObjetivo){fin=i;break;}--nivel;}
        }
        if(ini==std::string::npos||fin==std::string::npos)break;
        auto sub=q.substr(ini+1,fin-ini-1);auto rr=consultarInterno(sub,1);if(rr.columnas.size()!=1)throw std::runtime_error("La subconsulta debe devolver una sola columna");
        std::string rep;
        // Si aparece tras EN, producir lista; en otro caso exigir un unico valor escalar.
        size_t k=ini;while(k>0&&std::isspace((unsigned char)q[k-1]))--k;size_t b=k;while(b>0&&std::isalpha((unsigned char)q[b-1]))--b;std::string antes=q.substr(b,k-b);std::transform(antes.begin(),antes.end(),antes.begin(),[](unsigned char x){return std::toupper(x);});
        if(antes=="EN"){rep="(";for(size_t i=0;i<rr.filas.size();++i){if(i)rep+=",";std::string v=rr.filas[i][0];std::string esc;for(char c:v){if(c=='\'')esc+="''";else esc+=c;}rep+="'"+esc+"'";}rep+=")";}
        else {if(rr.filas.size()!=1)throw std::runtime_error("Subconsulta escalar debe devolver exactamente una fila");std::string v=rr.filas[0][0];std::string esc;for(char c:v){if(c=='\'')esc+="''";else esc+=c;}rep="'"+esc+"'";}
        q.replace(ini,fin-ini+1,rep);
    }
    return consultarInterno(q,0);
}

std::string UnicornBBDD::explicar(const std::string& consulta) const {
    auto tokens=dqlTokens(consulta);
    if(tokens.empty()||dqlMayus(tokens[0].texto)!="SELECCIONAR")
        throw std::runtime_error("EXPLICAR necesita una consulta SELECCIONAR");
    size_t de=0;
    while(de<tokens.size()&&dqlMayus(tokens[de].texto)!="DE")++de;
    if(de+1>=tokens.size())throw std::runtime_error("Falta DE tabla en EXPLICAR");
    std::string tabla=tokens[de+1].texto, alias=tabla;
    if(obtenerEsquema(tabla).empty()&&!esVista(tabla))throw std::runtime_error("Tabla o vista no encontrada: "+tabla);
    size_t posicion=de+2;
    if(posicion<tokens.size()&&dqlMayus(tokens[posicion].texto)=="COMO"){
        if(++posicion>=tokens.size())throw std::runtime_error("Falta alias de tabla");
        alias=tokens[posicion++].texto;
    }else if(posicion<tokens.size()){
        auto siguiente=dqlMayus(tokens[posicion].texto);
        if(siguiente!="DONDE"&&siguiente!="JOIN"&&siguiente!="INNER"&&siguiente!="LEFT"&&siguiente!="RIGHT"&&siguiente!="FULL"&&siguiente!="CROSS"&&siguiente!="ORDENAR"&&siguiente!="AGRUPAR"&&siguiente!="LIMITE")alias=tokens[posicion++].texto;
    }
    std::string indice,columna;
    for(size_t i=posicion;i+3<tokens.size();++i){
        if(dqlMayus(tokens[i].texto)!="DONDE"||tokens[i+2].texto!="=")continue;
        if(i+4<tokens.size()){
            auto siguiente=dqlMayus(tokens[i+4].texto);
            if(siguiente!="ORDENAR"&&siguiente!="AGRUPAR"&&siguiente!="TENIENDO"&&siguiente!="LIMITE")continue;
        }
        columna=tokens[i+1].texto;
        auto punto=columna.find('.');
        if(punto!=std::string::npos){if(columna.substr(0,punto)!=tabla&&columna.substr(0,punto)!=alias)break;columna=columna.substr(punto+1);}
        double numero=0;
        if(!tokens[i+3].literal&&!dqlNumero(tokens[i+3].texto,numero))break;
        indice=indicePara(tabla,columna);
        break;
    }
    std::string plan="PLAN DE EJECUCION\nFUENTE: "+tabla+"\nMETODO: "+(indice.empty()?"TABLE SCAN":"INDEX SCAN");
    if(!indice.empty())plan+="\nINDICE: "+indice+"\nCOLUMNA: "+columna;
    plan+="\nFUENTE TIPO: "+std::string(esVista(tabla)?"VISTA":"TABLA");
    return plan;
}
