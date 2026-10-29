#define PY_SSIZE_T_CLEAN
#include <Python.h>

#include "002-PierodevBBDD.hpp"

#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

static std::unique_ptr<PierodevBBDD> base;

static PierodevBBDD& motor() {
    if (!base) base = std::make_unique<PierodevBBDD>();
    return *base;
}

static PyObject* errorCpp(const std::exception& error) {
    PyErr_SetString(PyExc_RuntimeError, error.what());
    return nullptr;
}

static bool convertirLista(PyObject* lista, std::vector<std::string>& datos) {
    if (!PyList_Check(lista) && !PyTuple_Check(lista)) {
        PyErr_SetString(PyExc_TypeError, "Los datos deben ser una lista o tupla de cadenas");
        return false;
    }
    Py_ssize_t cantidad = PySequence_Size(lista);
    for (Py_ssize_t i = 0; i < cantidad; ++i) {
        PyObject* elemento = PySequence_GetItem(lista, i);
        if (!elemento) return false;
        if (!PyUnicode_Check(elemento)) {
            Py_DECREF(elemento);
            PyErr_SetString(PyExc_TypeError, "Todos los valores deben ser cadenas");
            return false;
        }
        const char* valor = PyUnicode_AsUTF8(elemento);
        if (!valor) { Py_DECREF(elemento); return false; }
        datos.emplace_back(valor);
        Py_DECREF(elemento);
    }
    return true;
}

static bool convertirCambios(PyObject* diccionario,
                            std::map<std::string, std::string>& cambios) {
    if (!PyDict_Check(diccionario)) {
        PyErr_SetString(PyExc_TypeError, "Los cambios deben ser un diccionario de cadenas");
        return false;
    }
    PyObject *clave, *valor;
    Py_ssize_t posicion = 0;
    while (PyDict_Next(diccionario, &posicion, &clave, &valor)) {
        if (!PyUnicode_Check(clave) || !PyUnicode_Check(valor)) {
            PyErr_SetString(PyExc_TypeError, "Las columnas y los valores deben ser cadenas");
            return false;
        }
        const char* columna = PyUnicode_AsUTF8(clave);
        const char* texto = PyUnicode_AsUTF8(valor);
        if (!columna || !texto) return false;
        cambios[columna] = texto;
    }
    return true;
}

static PyObject* devolverCantidad(long long cantidad, const char* error) {
    if (cantidad < 0) {
        PyErr_SetString(PyExc_RuntimeError, error);
        return nullptr;
    }
    return PyLong_FromLongLong(cantidad);
}

static PyObject* convertirMapa(const std::map<std::string, std::string>& registro) {
    PyObject* resultado = PyDict_New();
    if (!resultado) return nullptr;
    for (const auto& [columna, valor] : registro) {
        PyObject* texto = PyUnicode_FromString(valor.c_str());
        if (!texto || PyDict_SetItemString(resultado, columna.c_str(), texto) < 0) {
            Py_XDECREF(texto);
            Py_DECREF(resultado);
            return nullptr;
        }
        Py_DECREF(texto);
    }
    return resultado;
}

static PyObject* convertirFilas(const std::vector<std::map<std::string, std::string>>& filas) {
    PyObject* resultado = PyList_New(0);
    if (!resultado) return nullptr;
    for (const auto& fila : filas) {
        PyObject* registro = convertirMapa(fila);
        if (!registro || PyList_Append(resultado, registro) < 0) {
            Py_XDECREF(registro);
            Py_DECREF(resultado);
            return nullptr;
        }
        Py_DECREF(registro);
    }
    return resultado;
}

static PyObject* crear_base(PyObject*, PyObject* argumentos) {
    const char* nombre;
    if (!PyArg_ParseTuple(argumentos, "s", &nombre)) return nullptr;
    try { return PyBool_FromLong(motor().creaBaseDatos(nombre)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* usar_base(PyObject*, PyObject* argumentos) {
    const char* nombre;
    if (!PyArg_ParseTuple(argumentos, "s", &nombre)) return nullptr;
    try { return PyBool_FromLong(motor().usaBaseDatos(nombre)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* crear_tabla(PyObject*, PyObject* argumentos) {
    const char* tabla;
    const char* esquema;
    if (!PyArg_ParseTuple(argumentos, "ss", &tabla, &esquema)) return nullptr;
    try { return PyBool_FromLong(motor().creaTabla(tabla, esquema)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* alterar_anadir_columna(PyObject*, PyObject* argumentos) {
    const char *tabla, *columna;
    if (!PyArg_ParseTuple(argumentos, "ss", &tabla, &columna)) return nullptr;
    try { return PyBool_FromLong(motor().alterarAnadirColumna(tabla, columna)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* alterar_eliminar_columna(PyObject*, PyObject* argumentos) {
    const char *tabla, *columna;
    if (!PyArg_ParseTuple(argumentos, "ss", &tabla, &columna)) return nullptr;
    try { return PyBool_FromLong(motor().alterarEliminarColumna(tabla, columna)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* alterar_renombrar_columna(PyObject*, PyObject* argumentos) {
    const char *tabla, *anterior, *nueva;
    if (!PyArg_ParseTuple(argumentos, "sss", &tabla, &anterior, &nueva)) return nullptr;
    try { return PyBool_FromLong(motor().alterarRenombrarColumna(tabla, anterior, nueva)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* alterar_renombrar_tabla(PyObject*, PyObject* argumentos) {
    const char *anterior, *nueva;
    if (!PyArg_ParseTuple(argumentos, "ss", &anterior, &nueva)) return nullptr;
    try { return PyBool_FromLong(motor().alterarRenombrarTabla(anterior, nueva)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* truncar_tabla(PyObject*, PyObject* argumentos) {
    const char* tabla;
    if (!PyArg_ParseTuple(argumentos, "s", &tabla)) return nullptr;
    try { return PyBool_FromLong(motor().truncarTabla(tabla)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* eliminar_tabla(PyObject*, PyObject* argumentos) {
    const char* tabla;
    if (!PyArg_ParseTuple(argumentos, "s", &tabla)) return nullptr;
    try { return PyBool_FromLong(motor().eliminarTabla(tabla)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* eliminar_base(PyObject*, PyObject* argumentos) {
    const char* nombre;
    if (!PyArg_ParseTuple(argumentos, "s", &nombre)) return nullptr;
    try { return PyBool_FromLong(motor().eliminarBaseDatos(nombre)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* insertar(PyObject*, PyObject* argumentos) {
    const char* tabla;
    PyObject* lista;
    if (!PyArg_ParseTuple(argumentos, "sO", &tabla, &lista)) return nullptr;
    std::vector<std::string> datos;
    if (!convertirLista(lista, datos)) return nullptr;
    try {
        long long id = motor().insertarDatos(tabla, datos);
        if (id < 0) {
            PyErr_SetString(PyExc_RuntimeError, "No se ha podido insertar el registro");
            return nullptr;
        }
        return PyLong_FromLongLong(id);
    } catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* insertar_columnas(PyObject*, PyObject* argumentos) {
    const char* tabla;
    PyObject *listaColumnas, *listaValores;
    if (!PyArg_ParseTuple(argumentos, "sOO", &tabla, &listaColumnas, &listaValores)) return nullptr;
    std::vector<std::string> columnas, valores;
    if (!convertirLista(listaColumnas, columnas) ||
        !convertirLista(listaValores, valores)) return nullptr;
    try {
        return devolverCantidad(motor().insertarConColumnas(tabla, columnas, valores),
                               "No se ha podido insertar con las columnas indicadas");
    } catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* insertar_desde(PyObject*, PyObject* argumentos) {
    const char *destino, *origen;
    if (!PyArg_ParseTuple(argumentos, "ss", &destino, &origen)) return nullptr;
    try {
        return devolverCantidad(motor().insertarDesdeTabla(destino, origen),
                               "No se ha podido insertar desde otra tabla");
    } catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* actualizar_donde(PyObject*, PyObject* argumentos) {
    const char *tabla, *columna = "", *valor = "";
    PyObject* diccionario;
    if (!PyArg_ParseTuple(argumentos, "sO|ss", &tabla, &diccionario, &columna, &valor)) return nullptr;
    std::map<std::string, std::string> cambios;
    if (!convertirCambios(diccionario, cambios)) return nullptr;
    try {
        return devolverCantidad(motor().actualizarDonde(tabla, cambios, columna, valor),
                               "No se han podido actualizar los registros");
    } catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* eliminar_donde(PyObject*, PyObject* argumentos) {
    const char *tabla, *columna = "", *valor = "";
    if (!PyArg_ParseTuple(argumentos, "s|ss", &tabla, &columna, &valor)) return nullptr;
    try {
        return devolverCantidad(motor().eliminarDonde(tabla, columna, valor),
                               "No se han podido eliminar los registros");
    } catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* seleccionar(PyObject*, PyObject* argumentos) {
    const char* tabla;
    long long id;
    if (!PyArg_ParseTuple(argumentos, "sL", &tabla, &id)) return nullptr;
    try { return convertirMapa(motor().seleccionar(tabla, id)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* listar(PyObject*, PyObject* argumentos) {
    const char* tabla;
    if (!PyArg_ParseTuple(argumentos, "s", &tabla)) return nullptr;
    try { return convertirFilas(motor().listarTodo(tabla)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* consultar(PyObject*, PyObject* argumentos) {
    const char* instruccion;
    if (!PyArg_ParseTuple(argumentos, "s", &instruccion)) return nullptr;
    try {
        auto resultado = motor().consultar(instruccion);
        PyObject* filas = PyList_New(0);
        if (!filas) return nullptr;
        for (const auto& fila : resultado.filas) {
            PyObject* registro = PyDict_New();
            if (!registro) { Py_DECREF(filas); return nullptr; }
            for (std::size_t i = 0; i < fila.size(); ++i) {
                PyObject* valor = PyUnicode_FromString(fila[i].c_str());
                if (!valor || PyDict_SetItemString(registro, resultado.columnas[i].c_str(), valor) < 0) {
                    Py_XDECREF(valor);
                    Py_DECREF(registro);
                    Py_DECREF(filas);
                    return nullptr;
                }
                Py_DECREF(valor);
            }
            if (PyList_Append(filas, registro) < 0) {
                Py_DECREF(registro);
                Py_DECREF(filas);
                return nullptr;
            }
            Py_DECREF(registro);
        }
        return filas;
    } catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* buscar(PyObject*, PyObject* argumentos) {
    const char *tabla, *columna, *valor;
    if (!PyArg_ParseTuple(argumentos, "sss", &tabla, &columna, &valor)) return nullptr;
    try { return convertirFilas(motor().buscarColumna(tabla, columna, valor)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* actualizar(PyObject*, PyObject* argumentos) {
    const char* tabla;
    long long id;
    PyObject* lista;
    if (!PyArg_ParseTuple(argumentos, "sLO", &tabla, &id, &lista)) return nullptr;
    std::vector<std::string> datos;
    if (!convertirLista(lista, datos)) return nullptr;
    try { return PyBool_FromLong(motor().actualizar(tabla, id, datos)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* eliminar(PyObject*, PyObject* argumentos) {
    const char* tabla;
    long long id;
    if (!PyArg_ParseTuple(argumentos, "sL", &tabla, &id)) return nullptr;
    try { return PyBool_FromLong(motor().eliminar(tabla, id)); }
    catch (const std::exception& error) { return errorCpp(error); }
}

static PyObject* configuracion(PyObject*, PyObject*) {
    try {
        auto& baseActual = motor();
        PyObject* resultado = PyDict_New();
        if (!resultado) return nullptr;
        PyObject* ruta = PyUnicode_FromString(baseActual.obtenerInstalacion().c_str());
        PyObject* tamano = PyLong_FromSize_t(baseActual.obtenerTamanoRegistro());
        if (!ruta || !tamano || PyDict_SetItemString(resultado, "instalacion", ruta) < 0 ||
            PyDict_SetItemString(resultado, "tamanoRegistro", tamano) < 0) {
            Py_XDECREF(ruta);
            Py_XDECREF(tamano);
            Py_DECREF(resultado);
            return nullptr;
        }
        Py_DECREF(ruta);
        Py_DECREF(tamano);
        return resultado;
    } catch (const std::exception& error) { return errorCpp(error); }
}

static PyMethodDef metodos[] = {
    {"crear_base", crear_base, METH_VARARGS, "Crea una base de datos"},
    {"usar_base", usar_base, METH_VARARGS, "Selecciona una base de datos"},
    {"crear_tabla", crear_tabla, METH_VARARGS, "Crea una tabla"},
    {"alterar_anadir_columna", alterar_anadir_columna, METH_VARARGS, "Anade una columna"},
    {"alterar_eliminar_columna", alterar_eliminar_columna, METH_VARARGS, "Elimina una columna"},
    {"alterar_renombrar_columna", alterar_renombrar_columna, METH_VARARGS, "Renombra una columna"},
    {"alterar_renombrar_tabla", alterar_renombrar_tabla, METH_VARARGS, "Renombra una tabla"},
    {"truncar_tabla", truncar_tabla, METH_VARARGS, "Vacia una tabla"},
    {"eliminar_tabla", eliminar_tabla, METH_VARARGS, "Elimina una tabla"},
    {"eliminar_base", eliminar_base, METH_VARARGS, "Elimina una base de datos"},
    {"insertar", insertar, METH_VARARGS, "Inserta un registro"},
    {"insertar_columnas", insertar_columnas, METH_VARARGS, "Inserta indicando columnas"},
    {"insertar_desde", insertar_desde, METH_VARARGS, "Inserta desde otra tabla"},
    {"actualizar_donde", actualizar_donde, METH_VARARGS, "Actualiza registros con una condicion"},
    {"eliminar_donde", eliminar_donde, METH_VARARGS, "Elimina registros con una condicion"},
    {"seleccionar", seleccionar, METH_VARARGS, "Selecciona por id"},
    {"listar", listar, METH_VARARGS, "Lista registros activos"},
    {"consultar", consultar, METH_VARARGS, "Ejecuta una consulta DQL en espanol"},
    {"buscar", buscar, METH_VARARGS, "Busca por columna y valor"},
    {"actualizar", actualizar, METH_VARARGS, "Actualiza un registro"},
    {"eliminar", eliminar, METH_VARARGS, "Borrado logico"},
    {"configuracion", configuracion, METH_NOARGS, "Muestra la configuracion activa"},
    {nullptr, nullptr, 0, nullptr}
};

static PyModuleDef modulo = {
    PyModuleDef_HEAD_INIT,
    "pierodevbbdd",
    "Conector nativo Python para PierodevBBDD",
    -1,
    metodos,
    nullptr,
    nullptr,
    nullptr,
    nullptr
};

PyMODINIT_FUNC PyInit_pierodevbbdd(void) { return PyModule_Create(&modulo); }
