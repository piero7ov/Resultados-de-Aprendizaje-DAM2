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
    {"insertar", insertar, METH_VARARGS, "Inserta un registro"},
    {"seleccionar", seleccionar, METH_VARARGS, "Selecciona por id"},
    {"listar", listar, METH_VARARGS, "Lista registros activos"},
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
