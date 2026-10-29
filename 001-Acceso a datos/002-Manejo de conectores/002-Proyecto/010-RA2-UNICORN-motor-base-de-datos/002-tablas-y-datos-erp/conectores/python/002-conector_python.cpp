#define PY_SSIZE_T_CLEAN
#include <Python.h>
#include "002-UnicornBBDD.hpp"
#include <algorithm>
#include <cctype>
#include <memory>
#include <stdexcept>

static std::unique_ptr<UnicornBBDD> db;

static UnicornBBDD& motor() {
    if (!db) db = std::make_unique<UnicornBBDD>();
    return *db;
}

static PyObject* error_cpp(const std::exception& e) {
    PyErr_SetString(PyExc_RuntimeError, e.what());
    return nullptr;
}
static PyObject* cantidad_o_error(long long cantidad) {
    if (cantidad < 0) {
        PyErr_SetString(PyExc_RuntimeError, "La operacion no se pudo completar");
        return nullptr;
    }
    return PyLong_FromLongLong(cantidad);
}

static bool lista_a_vector(PyObject* lista, std::vector<std::string>& datos) {
    if (!PyList_Check(lista) && !PyTuple_Check(lista)) {
        PyErr_SetString(PyExc_TypeError, "Los datos deben ser una lista o tupla de strings o None");
        return false;
    }
    Py_ssize_t n = PySequence_Size(lista);
    for (Py_ssize_t i=0; i<n; ++i) {
        PyObject* item = PySequence_GetItem(lista, i);
        if (!item) return false;
        if (item == Py_None) { datos.push_back(UnicornBBDD::valorNulo()); Py_DECREF(item); continue; }
        if (!PyUnicode_Check(item)) {
            Py_DECREF(item);
            PyErr_SetString(PyExc_TypeError, "Todos los valores deben ser strings o None");
            return false;
        }
        const char* s = PyUnicode_AsUTF8(item);
        if (!s) { Py_DECREF(item); return false; }
        datos.emplace_back(s);
        Py_DECREF(item);
    }
    return true;
}

static PyObject* mapa_a_dict(const std::map<std::string,std::string>& m) {
    PyObject* d = PyDict_New();
    for (const auto& [k,v] : m) {
        PyObject* pv = UnicornBBDD::esNulo(v) ? Py_NewRef(Py_None) : PyUnicode_FromString(v.c_str());
        PyDict_SetItemString(d, k.c_str(), pv);
        Py_DECREF(pv);
    }
    return d;
}

static PyObject* crear_base(PyObject*, PyObject* args) {
    const char* n; if (!PyArg_ParseTuple(args,"s",&n)) return nullptr;
    try { return PyBool_FromLong(motor().creaBaseDatos(n)); } catch(const std::exception& e){ return error_cpp(e); }
}
static PyObject* usar_base(PyObject*, PyObject* args) {
    const char* n; if (!PyArg_ParseTuple(args,"s",&n)) return nullptr;
    try { return PyBool_FromLong(motor().usaBaseDatos(n)); } catch(const std::exception& e){ return error_cpp(e); }
}
static PyObject* crear_tabla(PyObject*, PyObject* args) {
    const char *t,*e; if (!PyArg_ParseTuple(args,"ss",&t,&e)) return nullptr;
    try { return PyBool_FromLong(motor().creaTabla(t,e)); } catch(const std::exception& ex){ return error_cpp(ex); }
}
static PyObject* insertar(PyObject*, PyObject* args) {
    const char* t; PyObject* l; if (!PyArg_ParseTuple(args,"sO",&t,&l)) return nullptr;
    std::vector<std::string> d; if(!lista_a_vector(l,d)) return nullptr;
    try { return cantidad_o_error(motor().insertarDatos(t,d)); } catch(const std::exception& e){ return error_cpp(e); }
}
static PyObject* seleccionar(PyObject*, PyObject* args) {
    const char* t; long long id; if(!PyArg_ParseTuple(args,"sL",&t,&id)) return nullptr;
    try { return mapa_a_dict(motor().seleccionar(t,id)); } catch(const std::exception& e){ return error_cpp(e); }
}
static PyObject* listar(PyObject*, PyObject* args) {
    const char* t; if(!PyArg_ParseTuple(args,"s",&t)) return nullptr;
    try {
        auto filas=motor().listarTodo(t); PyObject* l=PyList_New(0);
        for(const auto& f:filas){ PyObject* d=mapa_a_dict(f); PyList_Append(l,d); Py_DECREF(d); }
        return l;
    } catch(const std::exception& e){ return error_cpp(e); }
}
static PyObject* buscar(PyObject*, PyObject* args) {
    const char *t,*c,*v; if(!PyArg_ParseTuple(args,"sss",&t,&c,&v)) return nullptr;
    try {
        auto filas=motor().buscarColumna(t,c,v); PyObject* l=PyList_New(0);
        for(const auto& f:filas){ PyObject* d=mapa_a_dict(f); PyList_Append(l,d); Py_DECREF(d); }
        return l;
    } catch(const std::exception& e){ return error_cpp(e); }
}
static PyObject* actualizar(PyObject*, PyObject* args) {
    const char* t; long long id; PyObject* l; if(!PyArg_ParseTuple(args,"sLO",&t,&id,&l)) return nullptr;
    std::vector<std::string> d; if(!lista_a_vector(l,d)) return nullptr;
    try { return PyBool_FromLong(motor().actualizar(t,id,d)); } catch(const std::exception& e){ return error_cpp(e); }
}
static PyObject* eliminar(PyObject*, PyObject* args) {
    const char* t; long long id; if(!PyArg_ParseTuple(args,"sL",&t,&id)) return nullptr;
    try { return PyBool_FromLong(motor().eliminar(t,id)); } catch(const std::exception& e){ return error_cpp(e); }
}

static PyObject* alterar_anadir(PyObject*, PyObject* args) { const char *t,*c; if(!PyArg_ParseTuple(args,"ss",&t,&c)) return nullptr; try{return PyBool_FromLong(motor().alteraTablaAnadir(t,c));}catch(const std::exception&e){return error_cpp(e);} }
static PyObject* alterar_eliminar_columna(PyObject*, PyObject* args) { const char *t,*c; if(!PyArg_ParseTuple(args,"ss",&t,&c)) return nullptr; try{return PyBool_FromLong(motor().alteraTablaEliminarColumna(t,c));}catch(const std::exception&e){return error_cpp(e);} }
static PyObject* alterar_renombrar_columna(PyObject*, PyObject* args) { const char *t,*a,*n; if(!PyArg_ParseTuple(args,"sss",&t,&a,&n)) return nullptr; try{return PyBool_FromLong(motor().alteraTablaRenombrarColumna(t,a,n));}catch(const std::exception&e){return error_cpp(e);} }
static PyObject* alterar_renombrar_tabla(PyObject*, PyObject* args) { const char *a,*n; if(!PyArg_ParseTuple(args,"ss",&a,&n)) return nullptr; try{return PyBool_FromLong(motor().alterarRenombrarTabla(a,n));}catch(const std::exception&e){return error_cpp(e);} }
static PyObject* alterar_modificar_columna(PyObject*, PyObject* args) { const char *t,*a,*n; if(!PyArg_ParseTuple(args,"sss",&t,&a,&n)) return nullptr; try{return PyBool_FromLong(motor().alteraTablaModificarColumna(t,a,n));}catch(const std::exception&e){return error_cpp(e);} }
static PyObject* truncar_tabla(PyObject*, PyObject* args) { const char* t; if(!PyArg_ParseTuple(args,"s",&t)) return nullptr; try{return PyBool_FromLong(motor().truncarTabla(t));}catch(const std::exception&e){return error_cpp(e);} }
static PyObject* eliminar_tabla(PyObject*, PyObject* args) { const char* t; if(!PyArg_ParseTuple(args,"s",&t)) return nullptr; try{return PyBool_FromLong(motor().eliminarTabla(t));}catch(const std::exception&e){return error_cpp(e);} }
static PyObject* eliminar_base(PyObject*, PyObject* args) { const char* n; if(!PyArg_ParseTuple(args,"s",&n)) return nullptr; try{return PyBool_FromLong(motor().eliminarBaseDatos(n));}catch(const std::exception&e){return error_cpp(e);} }

static PyObject* insertar_columnas(PyObject*, PyObject* args) {
    const char* t; PyObject *cols,*vals; if(!PyArg_ParseTuple(args,"sOO",&t,&cols,&vals)) return nullptr;
    std::vector<std::string> c,v; if(!lista_a_vector(cols,c)||!lista_a_vector(vals,v)) return nullptr;
    try{return cantidad_o_error(motor().insertarConColumnas(t,c,v));}catch(const std::exception&e){return error_cpp(e);}
}
static PyObject* insertar_desde(PyObject*, PyObject* args) {
    const char *d,*o; if(!PyArg_ParseTuple(args,"ss",&d,&o)) return nullptr;
    try{return cantidad_o_error(motor().insertarDesdeSeleccion(d,o));}catch(const std::exception&e){return error_cpp(e);}
}
static bool dict_a_mapa(PyObject* d,std::map<std::string,std::string>& out){
    if(!PyDict_Check(d)){PyErr_SetString(PyExc_TypeError,"Los cambios deben ser un dict de strings");return false;}
    PyObject *k,*v; Py_ssize_t pos=0; while(PyDict_Next(d,&pos,&k,&v)){
        if(!PyUnicode_Check(k)||(!PyUnicode_Check(v)&&v!=Py_None)){PyErr_SetString(PyExc_TypeError,"Las claves deben ser strings y los valores strings o None");return false;}
        out[PyUnicode_AsUTF8(k)]=v==Py_None?UnicornBBDD::valorNulo():PyUnicode_AsUTF8(v);
    } return true;
}
static PyObject* actualizar_donde(PyObject*, PyObject* args) {
    const char* t; PyObject* d; const char *c="",*v=""; if(!PyArg_ParseTuple(args,"sO|ss",&t,&d,&c,&v)) return nullptr;
    std::map<std::string,std::string> cambios; if(!dict_a_mapa(d,cambios)) return nullptr;
    try{return cantidad_o_error(motor().actualizarDonde(t,cambios,c,v));}catch(const std::exception&e){return error_cpp(e);}
}
static PyObject* eliminar_donde(PyObject*, PyObject* args) {
    const char* t; const char *c="",*v=""; if(!PyArg_ParseTuple(args,"s|ss",&t,&c,&v)) return nullptr;
    try{return cantidad_o_error(motor().eliminarDonde(t,c,v));}catch(const std::exception&e){return error_cpp(e);}
}


static PyObject* consultar_dql(PyObject*, PyObject* args) {
    const char* q; if(!PyArg_ParseTuple(args,"s",&q)) return nullptr;
    try {
        auto r=motor().consultar(q); PyObject* lista=PyList_New(0);
        for(const auto& fila:r.filas){ PyObject* d=PyDict_New(); for(size_t i=0;i<r.columnas.size();++i){PyObject* v=UnicornBBDD::esNulo(fila[i])?Py_NewRef(Py_None):PyUnicode_FromString(fila[i].c_str());PyDict_SetItemString(d,r.columnas[i].c_str(),v);Py_DECREF(v);}PyList_Append(lista,d);Py_DECREF(d);}
        return lista;
    } catch(const std::exception& e){ return error_cpp(e); }
}

static PyObject* anadir_clave_foranea(PyObject*, PyObject* args) {
    const char *t,*c,*tr,*cr="id";
    if(!PyArg_ParseTuple(args,"sss|s",&t,&c,&tr,&cr)) return nullptr;
    try{return PyBool_FromLong(motor().anadirClaveForanea(t,c,tr,cr));}catch(const std::exception&e){return error_cpp(e);}
}

static PyObject* claves_foraneas(PyObject*, PyObject* args) {
    const char* t; if(!PyArg_ParseTuple(args,"s",&t)) return nullptr;
    try{
        auto fks=motor().obtenerClavesForaneas(t); PyObject* l=PyList_New(0);
        for(const auto&fk:fks){PyObject*d=PyDict_New();PyObject*v=PyUnicode_FromString(fk.columna.c_str());PyDict_SetItemString(d,"columna",v);Py_DECREF(v);v=PyUnicode_FromString(fk.tablaReferenciada.c_str());PyDict_SetItemString(d,"tabla_referenciada",v);Py_DECREF(v);v=PyUnicode_FromString(fk.columnaReferenciada.c_str());PyDict_SetItemString(d,"columna_referenciada",v);Py_DECREF(v);PyList_Append(l,d);Py_DECREF(d);}
        return l;
    }catch(const std::exception&e){return error_cpp(e);}
}
static PyObject* establecer_no_nulo(PyObject*, PyObject* args) {
    const char *t,*c; if(!PyArg_ParseTuple(args,"ss",&t,&c)) return nullptr;
    try{return PyBool_FromLong(motor().establecerNoNulo(t,c));}catch(const std::exception&e){return error_cpp(e);}
}
static PyObject* establecer_unico(PyObject*, PyObject* args) {
    const char *t,*c; if(!PyArg_ParseTuple(args,"ss",&t,&c)) return nullptr;
    try{return PyBool_FromLong(motor().establecerUnico(t,c));}catch(const std::exception&e){return error_cpp(e);}
}
static PyObject* establecer_por_defecto(PyObject*, PyObject* args) {
    const char *t,*c,*v; if(!PyArg_ParseTuple(args,"sss",&t,&c,&v)) return nullptr;
    try{return PyBool_FromLong(motor().establecerPorDefecto(t,c,v));}catch(const std::exception&e){return error_cpp(e);}
}

static TipoDato py_tipo(const std::string& n){
    std::string x=n;std::transform(x.begin(),x.end(),x.begin(),[](unsigned char c){return std::toupper(c);});
    if(x=="ENTERO"||x=="INT")return TipoDato::ENTERO;if(x=="REAL")return TipoDato::REAL;if(x=="DECIMAL")return TipoDato::DECIMAL;if(x=="FECHA")return TipoDato::FECHA;if(x=="BOOLEANO"||x=="BOOL")return TipoDato::BOOLEANO;return TipoDato::TEXTO;
}
static PyObject* crear_tabla_tipada(PyObject*,PyObject* args){
    const char*t;PyObject*d;if(!PyArg_ParseTuple(args,"sO",&t,&d))return nullptr;if(!PyDict_Check(d)){PyErr_SetString(PyExc_TypeError,"tipos debe ser dict {columna: tipo}");return nullptr;}
    std::vector<DefinicionColumna> defs;PyObject*k,*v;Py_ssize_t p=0;while(PyDict_Next(d,&p,&k,&v)){if(!PyUnicode_Check(k)||!PyUnicode_Check(v)){PyErr_SetString(PyExc_TypeError,"columna y tipo deben ser strings");return nullptr;}defs.push_back({PyUnicode_AsUTF8(k),py_tipo(PyUnicode_AsUTF8(v))});}
    try{return PyBool_FromLong(motor().creaTablaTipada(t,defs));}catch(const std::exception&e){return error_cpp(e);}
}
static PyObject* tipos_tabla(PyObject*,PyObject* args){
    const char*t;if(!PyArg_ParseTuple(args,"s",&t))return nullptr;try{auto m=motor().obtenerTipos(t);PyObject*d=PyDict_New();for(const auto&[c,tp]:m){const char*n=tp==TipoDato::ENTERO?"ENTERO":tp==TipoDato::REAL?"REAL":tp==TipoDato::DECIMAL?"DECIMAL":tp==TipoDato::FECHA?"FECHA":tp==TipoDato::BOOLEANO?"BOOLEANO":"TEXTO";PyObject*v=PyUnicode_FromString(n);PyDict_SetItemString(d,c.c_str(),v);Py_DECREF(v);}return d;}catch(const std::exception&e){return error_cpp(e);}
}
static PyObject* crear_vista(PyObject*,PyObject* args){const char*n,*q;if(!PyArg_ParseTuple(args,"ss",&n,&q))return nullptr;try{return PyBool_FromLong(motor().crearVista(n,q));}catch(const std::exception&e){return error_cpp(e);}}
static PyObject* eliminar_vista(PyObject*,PyObject* args){const char*n;if(!PyArg_ParseTuple(args,"s",&n))return nullptr;try{return PyBool_FromLong(motor().eliminarVista(n));}catch(const std::exception&e){return error_cpp(e);}}
static PyObject* listar_vistas(PyObject*,PyObject*){try{auto vs=motor().listarVistas();PyObject*l=PyList_New(0);for(auto&x:vs){PyObject*v=PyUnicode_FromString(x.c_str());PyList_Append(l,v);Py_DECREF(v);}return l;}catch(const std::exception&e){return error_cpp(e);}}
static PyObject* iniciar_transaccion(PyObject*,PyObject*){try{return PyBool_FromLong(motor().iniciarTransaccion());}catch(const std::exception&e){return error_cpp(e);}}
static PyObject* confirmar_transaccion(PyObject*,PyObject*){try{return PyBool_FromLong(motor().confirmarTransaccion());}catch(const std::exception&e){return error_cpp(e);}}
static PyObject* deshacer_transaccion(PyObject*,PyObject*){try{return PyBool_FromLong(motor().deshacerTransaccion());}catch(const std::exception&e){return error_cpp(e);}}

static PyObject* crear_procedimiento(PyObject*, PyObject* args) {
    const char* nombre; const char* cuerpo; PyObject* lista;
    if (!PyArg_ParseTuple(args, "sOs", &nombre, &lista, &cuerpo)) return nullptr;
    std::vector<std::string> parametros;
    if (!lista_a_vector(lista, parametros)) return nullptr;
    try { return PyBool_FromLong(motor().crearProcedimiento(nombre, parametros, cuerpo)); }
    catch (const std::exception& e) { return error_cpp(e); }
}
static PyObject* eliminar_procedimiento(PyObject*, PyObject* args) {
    const char* nombre;
    if (!PyArg_ParseTuple(args, "s", &nombre)) return nullptr;
    try { return PyBool_FromLong(motor().eliminarProcedimiento(nombre)); }
    catch (const std::exception& e) { return error_cpp(e); }
}
static PyObject* listar_procedimientos(PyObject*, PyObject*) {
    try {
        PyObject* lista = PyList_New(0);
        for (const auto& nombre : motor().listarProcedimientos()) {
            PyObject* valor = PyUnicode_FromString(nombre.c_str());
            PyList_Append(lista, valor);
            Py_DECREF(valor);
        }
        return lista;
    } catch (const std::exception& e) { return error_cpp(e); }
}
static PyObject* ejecutar_procedimiento(PyObject*, PyObject* args) {
    const char* nombre; PyObject* lista;
    if (!PyArg_ParseTuple(args, "sO", &nombre, &lista)) return nullptr;
    std::vector<std::string> argumentos;
    if (!lista_a_vector(lista, argumentos)) return nullptr;
    try {
        auto resultado = motor().ejecutarProcedimiento(nombre, argumentos);
        PyObject* diccionario = PyDict_New();
        PyObject* modificados = PyLong_FromLongLong(resultado.modificados);
        PyDict_SetItemString(diccionario, "modificados", modificados);
        Py_DECREF(modificados);
        PyObject* filas = PyList_New(0);
        if (resultado.tieneConsulta) {
            for (const auto& fila : resultado.consulta.filas) {
                PyObject* registro = PyDict_New();
                for (std::size_t i = 0; i < resultado.consulta.columnas.size(); ++i) {
                    PyObject* valor = UnicornBBDD::esNulo(fila[i]) ? Py_NewRef(Py_None) : PyUnicode_FromString(fila[i].c_str());
                    PyDict_SetItemString(registro, resultado.consulta.columnas[i].c_str(), valor);
                    Py_DECREF(valor);
                }
                PyList_Append(filas, registro);
                Py_DECREF(registro);
            }
        }
        PyDict_SetItemString(diccionario, "filas", filas);
        Py_DECREF(filas);
        return diccionario;
    } catch (const std::exception& e) { return error_cpp(e); }
}
static PyObject* crear_indice(PyObject*, PyObject* args) {
    const char *nombre, *tabla, *columna;
    if (!PyArg_ParseTuple(args, "sss", &nombre, &tabla, &columna)) return nullptr;
    try { return PyBool_FromLong(motor().crearIndice(nombre, tabla, columna)); }
    catch (const std::exception& e) { return error_cpp(e); }
}
static PyObject* eliminar_indice(PyObject*, PyObject* args) {
    const char *nombre,*tabla=nullptr;
    if (!PyArg_ParseTuple(args, "s|s", &nombre, &tabla)) return nullptr;
    try {
        if(tabla){auto indices=motor().listarIndicesTabla(tabla);if(std::find(indices.begin(),indices.end(),nombre)==indices.end())return PyBool_FromLong(0);}
        return PyBool_FromLong(motor().eliminarIndice(nombre));
    }
    catch (const std::exception& e) { return error_cpp(e); }
}
static PyObject* listar_indices(PyObject*, PyObject*) {
    try {
        PyObject* lista = PyList_New(0);
        for (const auto& nombre : motor().listarIndices()) {
            PyObject* valor = PyUnicode_FromString(nombre.c_str());
            PyList_Append(lista, valor);
            Py_DECREF(valor);
        }
        return lista;
    } catch (const std::exception& e) { return error_cpp(e); }
}
static PyObject* indices_tabla(PyObject*, PyObject* args) {
    const char* tabla;
    if (!PyArg_ParseTuple(args, "s", &tabla)) return nullptr;
    try {
        PyObject* lista=PyList_New(0);
        for (const auto& indice : motor().listarIndicesTabla(tabla)) {
            PyObject* valor=PyUnicode_FromString(indice.c_str());
            PyList_Append(lista,valor);
            Py_DECREF(valor);
        }
        return lista;
    } catch(const std::exception& e) { return error_cpp(e); }
}
static PyObject* explicar_consulta(PyObject*, PyObject* args) {
    const char* consulta;
    if (!PyArg_ParseTuple(args, "s", &consulta)) return nullptr;
    try { return PyUnicode_FromString(motor().explicar(consulta).c_str()); }
    catch(const std::exception& e) { return error_cpp(e); }
}

static PyObject* configuracion(PyObject*, PyObject*) {
    try {
        auto& m=motor(); PyObject* d=PyDict_New();
        PyObject* p=PyUnicode_FromString(m.instalacion.c_str()); PyDict_SetItemString(d,"instalacion",p); Py_DECREF(p);
        p=PyLong_FromSize_t(m.tamanoRegistro); PyDict_SetItemString(d,"tamanoRegistro",p); Py_DECREF(p);
        return d;
    } catch(const std::exception& e){ return error_cpp(e); }
}

static PyMethodDef Metodos[] = {
    {"crear_base",crear_base,METH_VARARGS,"Crea una base de datos"},
    {"usar_base",usar_base,METH_VARARGS,"Selecciona una base de datos"},
    {"crear_tabla",crear_tabla,METH_VARARGS,"Crea una tabla"},
    {"crear_tabla_tipada",crear_tabla_tipada,METH_VARARGS,"Crea una tabla con tipos"},
    {"tipos",tipos_tabla,METH_VARARGS,"Devuelve los tipos de una tabla"},
    {"crear_vista",crear_vista,METH_VARARGS,"Crea una vista"},
    {"eliminar_vista",eliminar_vista,METH_VARARGS,"Elimina una vista"},
    {"listar_vistas",listar_vistas,METH_NOARGS,"Lista las vistas"},
    {"crear_procedimiento",crear_procedimiento,METH_VARARGS,"Guarda un procedimiento"},
    {"eliminar_procedimiento",eliminar_procedimiento,METH_VARARGS,"Elimina un procedimiento"},
    {"listar_procedimientos",listar_procedimientos,METH_NOARGS,"Lista procedimientos"},
    {"ejecutar_procedimiento",ejecutar_procedimiento,METH_VARARGS,"Ejecuta un procedimiento"},
    {"crear_indice",crear_indice,METH_VARARGS,"Crea un indice de usuario"},
    {"eliminar_indice",eliminar_indice,METH_VARARGS,"Elimina un indice de usuario"},
    {"listar_indices",listar_indices,METH_NOARGS,"Lista indices de usuario"},
    {"indices",indices_tabla,METH_VARARGS,"Lista los indices de una tabla"},
    {"explicar",explicar_consulta,METH_VARARGS,"Explica una consulta"},
    {"iniciar_transaccion",iniciar_transaccion,METH_NOARGS,"Inicia una transaccion"},
    {"confirmar",confirmar_transaccion,METH_NOARGS,"Confirma la transaccion"},
    {"deshacer",deshacer_transaccion,METH_NOARGS,"Deshace la transaccion"},
    {"anadir_clave_foranea",anadir_clave_foranea,METH_VARARGS,"Anade una clave foranea"},
    {"claves_foraneas",claves_foraneas,METH_VARARGS,"Lista claves foraneas"},
    {"alterar_anadir",alterar_anadir,METH_VARARGS,"Anade una columna"},
    {"alterar_anadir_columna",alterar_anadir,METH_VARARGS,"Anade una columna"},
    {"alterar_eliminar_columna",alterar_eliminar_columna,METH_VARARGS,"Elimina una columna"},
    {"alterar_renombrar_columna",alterar_renombrar_columna,METH_VARARGS,"Renombra una columna"},
    {"alterar_renombrar_tabla",alterar_renombrar_tabla,METH_VARARGS,"Renombra una tabla"},
    {"alterar_modificar_columna",alterar_modificar_columna,METH_VARARGS,"Modifica una columna"},
    {"truncar_tabla",truncar_tabla,METH_VARARGS,"Vacia una tabla"},
    {"eliminar_tabla",eliminar_tabla,METH_VARARGS,"Elimina una tabla"},
    {"eliminar_base",eliminar_base,METH_VARARGS,"Elimina una base de datos"},
    {"insertar",insertar,METH_VARARGS,"Inserta un registro"},
    {"insertar_columnas",insertar_columnas,METH_VARARGS,"Inserta indicando columnas"},
    {"insertar_desde",insertar_desde,METH_VARARGS,"Inserta desde otra tabla"},
    {"actualizar_donde",actualizar_donde,METH_VARARGS,"Actualiza registros que cumplen una condicion"},
    {"eliminar_donde",eliminar_donde,METH_VARARGS,"Elimina registros que cumplen una condicion o todos"},
    {"seleccionar",seleccionar,METH_VARARGS,"Selecciona un registro por id"},
    {"consultar",consultar_dql,METH_VARARGS,"Ejecuta una consulta DQL en espanol"},
    {"listar",listar,METH_VARARGS,"Lista registros activos"},
    {"buscar",buscar,METH_VARARGS,"Busca por columna y valor"},
    {"actualizar",actualizar,METH_VARARGS,"Actualiza un registro"},
    {"eliminar",eliminar,METH_VARARGS,"Borrado logico"},
    {"establecer_no_nulo",establecer_no_nulo,METH_VARARGS,"Aplica NO NULO a una columna"},
    {"establecer_unico",establecer_unico,METH_VARARGS,"Aplica UNICO a una columna"},
    {"establecer_por_defecto",establecer_por_defecto,METH_VARARGS,"Define POR DEFECTO para una columna"},
    {"configuracion",configuracion,METH_NOARGS,"Devuelve la configuracion activa"},
    {nullptr,nullptr,0,nullptr}
};
static PyModuleDef modulo={PyModuleDef_HEAD_INIT,"unicornbbdd","Conector nativo Python para Unicorn BBDD",-1,Metodos};
PyMODINIT_FUNC PyInit_unicornbbdd(void){ return PyModule_Create(&modulo); }
