#include "004-UnicornBBDD.hpp"
#include <algorithm>
#include <cctype>
#include <iostream>
#include <map>
#include <regex>
#include <sstream>
#include <cstdlib>
#include <filesystem>
#ifdef _WIN32
#include <windows.h>
#endif

static bool activarColor(){
#ifdef _WIN32
 const char* sinColor=std::getenv("NO_COLOR");if(sinColor)return false;
 HANDLE salida=GetStdHandle(STD_OUTPUT_HANDLE);DWORD modo=0;
 return salida!=INVALID_HANDLE_VALUE&&GetConsoleMode(salida,&modo)&&SetConsoleMode(salida,modo|ENABLE_VIRTUAL_TERMINAL_PROCESSING);
#else
 return false;
#endif
}
static void cabecera(bool color){
 const char* acento=color?"\033[1;95m":"",*titulo=color?"\033[1;96m":"",*fin=color?"\033[0m":"";
 std::cout<<acento<<R"(U   U  N   N  III   CCC   OOO   RRRR   N   N
U   U  NN  N   I   C     O   O  R   R  NN  N
U   U  N N N   I   C     O   O  RRRR   N N N
U   U  N  NN   I   C     O   O  R  R   N  NN
 UUU   N   N  III   CCC   OOO   R   R  N   N)"<<fin<<"\n";
 std::cout<<titulo<<"+=======================================================+\n"
          <<"|  UNICORN  /  MOTOR DE BASES DE DATOS                 |\n"
          <<"+=======================================================+"<<fin<<"\n\n";
}

static std::string trim(std::string s){while(!s.empty()&&std::isspace((unsigned char)s.front()))s.erase(s.begin());while(!s.empty()&&std::isspace((unsigned char)s.back()))s.pop_back();return s;}
static std::string mayus(std::string s){std::transform(s.begin(),s.end(),s.begin(),[](unsigned char c){return std::toupper(c);});return s;}
static std::string sinComillas(std::string s){s=trim(s);if(s.size()>=2&&((s.front()=='\''&&s.back()=='\'')||(s.front()=='"'&&s.back()=='"')))return s.substr(1,s.size()-2);return mayus(s)=="NULL"?UnicornBBDD::valorNulo():s;}
static std::vector<std::string> lista(std::string s){s=trim(s);if(s.size()>=2&&s.front()=='('&&s.back()==')')s=s.substr(1,s.size()-2);std::vector<std::string> r;std::string x;bool q=false;char qc=0;for(char c:s){if((c=='\''||c=='"')){if(!q){q=true;qc=c;}else if(qc==c)q=false;x+=c;}else if(c==','&&!q){r.push_back(sinComillas(x));x.clear();}else x+=c;}if(!x.empty()||!s.empty())r.push_back(sinComillas(x));return r;}
static bool condicion(std::string s,std::string& c,std::string& v){auto p=s.find('=');if(p==std::string::npos)return false;c=trim(s.substr(0,p));v=sinComillas(s.substr(p+1));return !c.empty();}
static std::map<std::string,std::string> asignaciones(std::string s){std::map<std::string,std::string> r;for(auto&x:lista(s)){std::string c,v;if(condicion(x,c,v))r[c]=v;}return r;}
static std::string visible(const std::string& valor){return UnicornBBDD::esNulo(valor)?"NULL":valor;}
static void imprimir(const std::map<std::string,std::string>& r){for(auto const&[k,v]:r)std::cout<<k<<"="<<visible(v)<<"  ";std::cout<<"\n";}
static void ayuda(){std::cout<<R"(
Comandos DDL:
  CREAR BASE nombre
  USAR nombre
  LISTAR BASES
  CREAR TABLA nombre campo1,campo2,campo3
  CREAR TABLA productos nombre:TEXTO,stock:ENTERO,precio:DECIMAL,fecha:FECHA
  CREAR VISTA nombre COMO SELECCIONAR ...
  CREAR PROCEDIMIENTO nombre(parametro) COMO SELECCIONAR ... DONDE columna = {parametro}
  CREAR INDICE nombre EN tabla columna
  LLAMAR nombre('valor')
  LISTAR PROCEDIMIENTOS | ELIMINAR PROCEDIMIENTO nombre
  MOSTRAR INDICES tabla | LISTAR INDICES | ELIMINAR INDICE nombre EN tabla
  ELIMINAR VISTA nombre
  LISTAR VISTAS
  ALTERAR TABLA nombre ANADIR columna
  ALTERAR TABLA pedidos ANADIR CLAVE FORANEA id_cliente REFERENCIAS clientes id
  ALTERAR TABLA nombre ELIMINAR COLUMNA columna
  ALTERAR TABLA nombre RENOMBRAR COLUMNA antigua nueva
  ALTERAR TABLA nombre MODIFICAR COLUMNA antigua nueva
  ALTERAR TABLA clientes MODIFICAR email NO NULO
  ALTERAR TABLA clientes MODIFICAR email UNICO
  ALTERAR TABLA clientes MODIFICAR ciudad POR DEFECTO 'Valencia' 
  TRUNCAR TABLA nombre
  RENOMBRAR TABLA anterior nuevo | COMPACTAR tabla
  ELIMINAR TABLA nombre
  ELIMINAR BASE nombre

Transacciones:
  INICIAR TRANSACCION
  CONFIRMAR
  DESHACER

Comandos DML (nomenclatura en espanol):
  INSERTAR EN clientes VALORES ('Ana','30')
  INSERTAR EN clientes (nombre) VALORES ('Ana')
  INSERTAR EN copia SELECCIONAR * DE clientes
  ACTUALIZAR clientes ESTABLECER nombre='Ana'
  ACTUALIZAR clientes ESTABLECER edad='30' DONDE id='1'
  ELIMINAR DE clientes
  ELIMINAR DE clientes DONDE id='1'

Consultas DQL:
  SELECCIONAR * DE clientes
  SELECCIONAR nombre,edad DE clientes DONDE edad >= 18
  SELECCIONAR DISTINTO ciudad DE clientes
  SELECCIONAR nombre COMO cliente DE clientes
  SELECCIONAR * DE clientes DONDE ciudad = 'Valencia' Y edad ENTRE 18 Y 65
  SELECCIONAR * DE clientes DONDE ciudad EN ('Valencia','Madrid')
  SELECCIONAR * DE clientes DONDE nombre COMO 'Jos%'
  SELECCIONAR * DE clientes ORDENAR POR edad DESCENDENTE LIMITE 10
  SELECCIONAR clientes.nombre,pedidos.total DE clientes JOIN pedidos EN clientes.id = pedidos.id_cliente
  SELECCIONAR clientes.nombre,pedidos.total DE clientes LEFT JOIN pedidos EN clientes.id = pedidos.id_cliente
  SELECCIONAR c.nombre,p.total DE clientes c RIGHT JOIN pedidos p EN c.id = p.id_cliente
  SELECCIONAR c.nombre,p.total DE clientes c FULL JOIN pedidos p EN c.id = p.id_cliente
  SELECCIONAR c.nombre,p.total DE clientes c CROSS JOIN pedidos p
  EXPLICAR SELECCIONAR * DE clientes DONDE email = 'ana@correo.com'

Agregaciones y agrupacion:
  SELECCIONAR CONTAR(*) COMO total DE pedidos
  SELECCIONAR SUMA(total),MEDIA(total),MINIMO(total),MAXIMO(total) DE pedidos
  SELECCIONAR id_cliente,CONTAR(*) COMO pedidos,SUMA(total) COMO importe DE pedidos AGRUPAR POR id_cliente
  SELECCIONAR id_cliente,SUMA(total) COMO importe DE pedidos AGRUPAR POR id_cliente TENIENDO importe > 100
  SELECCIONAR clientes.nombre COMO cliente,SUMA(pedidos.total) COMO facturacion DE clientes JOIN pedidos EN clientes.id = pedidos.id_cliente AGRUPAR POR clientes.nombre ORDENAR POR facturacion DESCENDENTE

Compatibilidad con comandos anteriores:
  INSERTAR tabla valor1,valor2
  ACTUALIZAR tabla id valor1,valor2
  ELIMINAR tabla id
  SELECCIONAR tabla id | LISTAR tabla | BUSCAR tabla columna valor | ESQUEMA tabla
  AYUDA | SALIR
)";}
int main(int argc,char**argv){
 try{
  std::string cfg=argc>1?argv[1]:"config.json"; UnicornBBDD db(cfg);bool color=activarColor();cabecera(color);ayuda();std::string linea;
  while(std::cout<<(color?"\033[93m":"")<<(db.basededatos.empty()?"unicorn> ":("unicorn["+db.basededatos+"]> "))<<(color?"\033[0m":"")&&std::getline(std::cin,linea)){
   linea=trim(linea);if(linea.empty())continue;std::istringstream ss(linea);std::string a,b,c;ss>>a;auto A=mayus(a);
   if(A=="SALIR")break;if(A=="AYUDA"){ayuda();continue;}
   if(A=="INICIAR"){ss>>b;std::cout<<((mayus(b)=="TRANSACCION"&&db.iniciarTransaccion())?"OK TRANSACCION INICIADA\n":"ERROR\n");continue;}
   if(A=="CONFIRMAR"){std::cout<<(db.confirmarTransaccion()?"OK TRANSACCION CONFIRMADA\n":"ERROR\n");continue;}
   if(A=="DESHACER"){std::cout<<(db.deshacerTransaccion()?"OK TRANSACCION DESHECHA\n":"ERROR\n");continue;}
   if(A=="CREAR"){ss>>b;
    if(mayus(b)=="BASE"){ss>>c;std::cout<<(db.creaBaseDatos(c)?"OK\n":"ERROR\n");}
    else if(mayus(b)=="TABLA"){
      ss>>c;std::string e;std::getline(ss,e);e=trim(e);bool tipada=e.find(':')!=std::string::npos;
      if(!tipada)std::cout<<(db.creaTabla(c,e)?"OK\n":"ERROR\n");
      else{std::vector<DefinicionColumna> defs;bool bien=true;for(auto x:lista(e)){auto q=x.find(':');if(q==std::string::npos){bien=false;break;}std::string n=trim(x.substr(0,q)),tn=mayus(trim(x.substr(q+1)));TipoDato t=TipoDato::TEXTO;if(tn=="ENTERO"||tn=="INT")t=TipoDato::ENTERO;else if(tn=="REAL")t=TipoDato::REAL;else if(tn=="DECIMAL")t=TipoDato::DECIMAL;else if(tn=="FECHA")t=TipoDato::FECHA;else if(tn=="BOOLEANO"||tn=="BOOL")t=TipoDato::BOOLEANO;else if(tn!="TEXTO")bien=false;defs.push_back({n,t});}std::cout<<((bien&&db.creaTablaTipada(c,defs))?"OK\n":"ERROR\n");}
    }else if(mayus(b)=="VISTA"){ss>>c;std::string como;ss>>como;std::string q;std::getline(ss,q);std::cout<<((mayus(como)=="COMO"&&db.crearVista(c,trim(q)))?"OK\n":"ERROR\n");}
    else if(mayus(b)=="PROCEDIMIENTO"){
      std::string resto;std::getline(ss,resto);std::smatch partes;
      static const std::regex patron(R"(^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s+COMO\s+(.+)$)",std::regex::icase);
      if(!std::regex_match(resto,partes,patron)){std::cout<<"ERROR sintaxis\n";continue;}
      auto parametros=trim(partes[2].str()).empty()?std::vector<std::string>{}:lista(partes[2].str());
      std::cout<<(db.crearProcedimiento(partes[1].str(),parametros,partes[3].str())?"OK\n":"ERROR\n");
    }
    else if(mayus(b)=="INDICE"){
      std::string resto;std::getline(ss,resto);std::smatch partes;
      static const std::regex patron(R"(^\s*([A-Za-z_][A-Za-z0-9_]*)\s+EN\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)|([A-Za-z_][A-Za-z0-9_]*))\s*$)",std::regex::icase);
      std::cout<<((std::regex_match(resto,partes,patron)&&db.crearIndice(partes[1].str(),partes[2].str(),partes[3].matched?partes[3].str():partes[4].str()))?"OK\n":"ERROR\n");
    }
    continue;
   }
   if(A=="USAR"){ss>>b;std::cout<<(db.usaBaseDatos(b)?"OK\n":"ERROR\n");continue;}
   if(A=="EXPLICAR"){std::string consulta;std::getline(ss,consulta);try{std::cout<<db.explicar(trim(consulta))<<"\n";}catch(const std::exception&e){std::cout<<"ERROR: "<<e.what()<<"\n";}continue;}
   if(A=="MOSTRAR"){ss>>b>>c;if(mayus(b)=="INDICES"){for(const auto& nombre:c.empty()?db.listarIndices():db.listarIndicesTabla(c))std::cout<<nombre<<"\n";continue;}}
   if(A=="RENOMBRAR"){ss>>b>>c;std::string nuevo;ss>>nuevo;std::cout<<((mayus(b)=="TABLA"&&db.alterarRenombrarTabla(c,nuevo))?"OK\n":"ERROR\n");continue;}
   if(A=="COMPACTAR"){ss>>b;std::cout<<(db.compactar(b)?"OK\n":"ERROR\n");continue;}
   if(A=="LLAMAR"){
    std::string resto;std::getline(ss,resto);std::smatch partes;
    static const std::regex patron(R"(^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)\s*$)");
    if(!std::regex_match(resto,partes,patron)){std::cout<<"ERROR sintaxis\n";continue;}
    auto argumentos=trim(partes[2].str()).empty()?std::vector<std::string>{}:lista(partes[2].str());
    try{auto resultado=db.ejecutarProcedimiento(partes[1].str(),argumentos);
      std::cout<<"MODIFICADOS="<<resultado.modificados<<"\n";
      if(resultado.tieneConsulta){for(size_t i=0;i<resultado.consulta.columnas.size();++i)std::cout<<(i?" | ":"")<<resultado.consulta.columnas[i];std::cout<<"\n";for(const auto&fila:resultado.consulta.filas){for(size_t i=0;i<fila.size();++i)std::cout<<(i?" | ":"")<<visible(fila[i]);std::cout<<"\n";}}
    }catch(const std::exception&e){std::cout<<"ERROR: "<<e.what()<<"\n";}continue;
   }
   if(A=="ALTERAR"){
    ss>>b; if(mayus(b)!="TABLA"){std::cout<<"Sintaxis: ALTERAR TABLA ...\n";continue;}
    std::string tabla,accion; ss>>tabla>>accion; bool ok=false; auto AC=mayus(accion);
    if(AC=="ANADIR"||AC=="AÑADIR"){
      std::string primero; ss>>primero;
      if(mayus(primero)=="CLAVE"){
        std::string tipo,col,ref,tr,cr="id"; ss>>tipo>>col>>ref>>tr;
        if(mayus(tipo)!="FORANEA"||mayus(ref)!="REFERENCIAS"){std::cout<<"Sintaxis FK incorrecta\n";continue;}
        if(ss>>cr){} ok=db.anadirClaveForanea(tabla,col,tr,cr);
      }else if(mayus(primero)=="COLUMNA"){std::string columna;ss>>columna;ok=db.alteraTablaAnadir(tabla,columna);}
      else ok=db.alteraTablaAnadir(tabla,primero);
    }else if(AC=="ELIMINAR"){
      std::string q,col;ss>>q;if(mayus(q)=="COLUMNA")ss>>col;else col=q;ok=db.alteraTablaEliminarColumna(tabla,col);
    }else if(AC=="RENOMBRAR"){
      std::string q,x,y;ss>>q;if(mayus(q)=="COLUMNA")ss>>x>>y;else{x=q;ss>>y;}ok=db.alteraTablaRenombrarColumna(tabla,x,y);
    }else if(AC=="MODIFICAR"){
      std::string q,col,regla; ss>>q; if(mayus(q)=="COLUMNA") ss>>col; else col=q; ss>>regla;
      auto R=mayus(regla);
      if(R=="NO"){std::string nulo;ss>>nulo;ok=mayus(nulo)=="NULO"&&db.establecerNoNulo(tabla,col);}
      else if(R=="UNICO"||R=="ÚNICO") ok=db.establecerUnico(tabla,col);
      else if(R=="POR"){std::string defecto;ss>>defecto;std::string valor;std::getline(ss,valor);valor=sinComillas(trim(valor));ok=mayus(defecto)=="DEFECTO"&&db.establecerPorDefecto(tabla,col,valor);}
      else ok=db.alteraTablaModificarColumna(tabla,col,regla); // compatibilidad antigua: renombrado
    }
    std::cout<<(ok?"OK\n":"ERROR\n");continue;
   }
   if(A=="TRUNCAR"){ss>>b>>c;std::cout<<((mayus(b)=="TABLA"&&db.truncarTabla(c))?"OK\n":"ERROR\n");continue;}

   if(A=="INSERTAR"){
    ss>>b;
    if(mayus(b)=="EN"){
      std::string tabla;ss>>tabla;std::string resto;std::getline(ss,resto);resto=trim(resto);
      if(!resto.empty()&&resto.front()=='('){auto fin=resto.find(')');if(fin==std::string::npos){std::cout<<"ERROR sintaxis\n";continue;}auto cols=lista(resto.substr(0,fin+1));auto despues=trim(resto.substr(fin+1));if(mayus(despues.substr(0,std::min<size_t>(7,despues.size())))!="VALORES"){std::cout<<"Falta VALORES\n";continue;}auto vals=lista(trim(despues.substr(7)));auto id=db.insertarConColumnas(tabla,cols,vals);std::cout<<(id<0?"ERROR":"ID="+std::to_string(id))<<"\n";continue;}
      if(mayus(resto.substr(0,std::min<size_t>(7,resto.size())))=="VALORES"){auto vals=lista(trim(resto.substr(7)));auto id=db.insertarDatos(tabla,vals);std::cout<<(id<0?"ERROR":"ID="+std::to_string(id))<<"\n";continue;}
      std::istringstream rs(resto);std::string s1,asterisco,de,origen;rs>>s1>>asterisco>>de>>origen;if(mayus(s1)=="SELECCIONAR"&&asterisco=="*"&&mayus(de)=="DE"){auto n=db.insertarDesdeSeleccion(tabla,origen);std::cout<<(n<0?"ERROR":"INSERTADOS="+std::to_string(n))<<"\n";continue;}
      std::cout<<"Sintaxis INSERTAR no reconocida\n";continue;
    }
    std::string d;std::getline(ss,d);auto id=db.insertarDatos(b,lista(trim(d)));std::cout<<(id<0?"ERROR":"ID="+std::to_string(id))<<"\n";continue;
   }

   if(A=="ACTUALIZAR"){
    ss>>b;std::string resto;std::getline(ss,resto);resto=trim(resto);
    if(mayus(resto.substr(0,std::min<size_t>(10,resto.size())))=="ESTABLECER"){
      resto=trim(resto.substr(10));std::string izq=resto,where;auto up=mayus(resto);auto p=up.find(" DONDE ");if(p!=std::string::npos){izq=trim(resto.substr(0,p));where=trim(resto.substr(p+7));}
      auto cambios=asignaciones(izq);std::string wc,wv;if(!where.empty()&&!condicion(where,wc,wv)){std::cout<<"ERROR DONDE\n";continue;}auto n=db.actualizarDonde(b,cambios,wc,wv);std::cout<<(n<0?"ERROR":"ACTUALIZADOS="+std::to_string(n))<<"\n";continue;
    }
    std::istringstream old(resto);long long id;old>>id;std::string d;std::getline(old,d);std::cout<<(db.actualizar(b,id,lista(trim(d)))?"OK\n":"ERROR\n");continue;
   }

   if(A=="ELIMINAR"){
    ss>>b;
    if(mayus(b)=="PROCEDIMIENTO"){ss>>c;std::cout<<(db.eliminarProcedimiento(c)?"OK\n":"ERROR\n");continue;}
    if(mayus(b)=="INDICE"){
      ss>>c;std::string en,tabla;ss>>en;
      bool valido=true;
      if(!en.empty()){
        if(mayus(en)!="EN"||!(ss>>tabla))valido=false;
        else {auto indices=db.listarIndicesTabla(tabla);valido=std::find(indices.begin(),indices.end(),c)!=indices.end();}
      }
      std::cout<<((valido&&db.eliminarIndice(c))?"OK\n":"ERROR\n");continue;
    }
    if(mayus(b)=="VISTA"){ss>>c;std::cout<<(db.eliminarVista(c)?"OK\n":"ERROR\n");continue;}
    if(mayus(b)=="TABLA"){ss>>c;std::cout<<(db.eliminarTabla(c)?"OK\n":"ERROR\n");continue;}
    if(mayus(b)=="BASE"){ss>>c;std::cout<<(db.eliminarBaseDatos(c)?"OK\n":"ERROR\n");continue;}
    if(mayus(b)=="DE"){std::string tabla;ss>>tabla;std::string resto;std::getline(ss,resto);resto=trim(resto);std::string wc,wv;if(!resto.empty()){std::istringstream rs(resto);std::string d;rs>>d;if(mayus(d)!="DONDE"){std::cout<<"ERROR sintaxis\n";continue;}std::string cond;std::getline(rs,cond);if(!condicion(trim(cond),wc,wv)){std::cout<<"ERROR DONDE\n";continue;}}auto n=db.eliminarDonde(tabla,wc,wv);std::cout<<(n<0?"ERROR":"ELIMINADOS="+std::to_string(n))<<"\n";continue;}
    long long id;ss>>id;std::cout<<(db.eliminar(b,id)?"OK\n":"ERROR\n");continue;
   }
   if(A=="SELECCIONAR"){
    auto U=mayus(linea);
    if(U.find(" DE ")!=std::string::npos){
      try{auto r=db.consultar(linea);for(size_t i=0;i<r.columnas.size();++i)std::cout<<(i?" | ":"")<<r.columnas[i];std::cout<<"\n";for(const auto&fila:r.filas){for(size_t i=0;i<fila.size();++i)std::cout<<(i?" | ":"")<<visible(fila[i]);std::cout<<"\n";}std::cout<<r.filas.size()<<" fila(s)\n";}catch(const std::exception&e){std::cout<<"ERROR: "<<e.what()<<"\n";}continue;
    }
    long long id;ss>>b>>id;auto r=db.seleccionar(b,id);if(r.empty())std::cout<<"No encontrado\n";else imprimir(r);continue;
   }
   if(A=="LISTAR"){std::streampos pos=ss.tellg();ss>>b;if(mayus(b)=="BASES"){std::vector<std::string> bases;for(const auto& entrada:std::filesystem::directory_iterator(db.obtenerInstalacion()))if(entrada.is_directory()&&entrada.path().filename().string().rfind(".txn_",0)!=0)bases.push_back(entrada.path().filename().string());std::sort(bases.begin(),bases.end());for(const auto&nombre:bases)std::cout<<nombre<<"\n";continue;}if(mayus(b)=="VISTAS"){for(const auto&v:db.listarVistas())std::cout<<v<<"\n";continue;}if(mayus(b)=="PROCEDIMIENTOS"){for(const auto&nombre:db.listarProcedimientos())std::cout<<nombre<<"\n";continue;}if(mayus(b)=="INDICES"){for(const auto&nombre:db.listarIndices())std::cout<<nombre<<"\n";continue;}ss.clear();ss.seekg(pos);ss>>b;for(auto&r:db.listarTodo(b))imprimir(r);continue;}
   if(A=="BUSCAR"){ss>>b>>c;std::string v;std::getline(ss,v);for(auto&r:db.buscarColumna(b,c,sinComillas(trim(v))))imprimir(r);continue;}
   if(A=="ESQUEMA"){ss>>b;auto e=db.obtenerEsquema(b);for(size_t i=0;i<e.size();++i)std::cout<<(i?",":"")<<e[i];std::cout<<"\nPK: "<<db.obtenerClavePrimaria(b)<<"\n";for(const auto&fk:db.obtenerClavesForaneas(b))std::cout<<"FK: "<<fk.columna<<" -> "<<fk.tablaReferenciada<<"."<<fk.columnaReferenciada<<"\n";for(const auto&col:e){auto r=db.obtenerRestricciones(b,col);if(r.noNulo)std::cout<<"NO NULO: "<<col<<"\n";if(r.unico)std::cout<<"UNICO: "<<col<<"\n";if(r.tieneDefecto)std::cout<<"POR DEFECTO: "<<col<<" = '"<<r.valorDefecto<<"'\n";}continue;}
   std::cout<<"Comando desconocido. Escribe AYUDA.\n";
  }
 }catch(const std::exception&e){std::cerr<<"Error: "<<e.what()<<"\n";return 1;}
}
