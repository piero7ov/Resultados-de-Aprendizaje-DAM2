#define PY_SSIZE_T_CLEAN
#include <Python.h>

#include "002-PierodevBBDD.hpp"

#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

static std::unique_ptr<PierodevBBDD> base;

static PyObject* crear_base(PyObject*, PyObject* argumentos) {
    const char* nombre;
    if (!PyArg_ParseTuple(argumentos, "s", &nombre)) return nullptr;
    try {
        if (!base->creaBaseDatos(nombre)) {
            PyErr_SetString(PyExc_RuntimeError, "No se ha podido crear la base de datos");
            return nullptr;
        }
        Py_RETURN_TRUE;
    } catch (const std::exception& error) {
        PyErr_SetString(PyExc_RuntimeError, error.what());
        return nullptr;
    }
}

static PyObject* usar_base(PyObject*, PyObject* argumentos) {
    const char* nombre;
    if (!PyArg_ParseTuple(argumentos, "s", &nombre)) return nullptr;
    try {
        if (!base->usaBaseDatos(nombre)) {
            PyErr_SetString(PyExc_RuntimeError, "La base de datos no existe");
            return nullptr;
        }
        Py_RETURN_TRUE;
    } catch (const std::exception& error) {
        PyErr_SetString(PyExc_RuntimeError, error.what());
        return nullptr;
    }
}

static PyObject* crear_tabla(PyObject*, PyObject* argumentos) {
    const char* tabla;
    const char* esquema;
    if (!PyArg_ParseTuple(argumentos, "ss", &tabla, &esquema)) return nullptr;
    try {
        if (!base->creaTabla(tabla, esquema)) {
            PyErr_SetString(PyExc_RuntimeError, "No se ha podido crear la tabla");
            return nullptr;
        }
        Py_RETURN_TRUE;
    } catch (const std::exception& error) {
        PyErr_SetString(PyExc_RuntimeError, error.what());
        return nullptr;
    }
}

static PyObject* insertar(PyObject*, PyObject* argumentos) {
    const char* tabla;
    PyObject* lista;
    if (!PyArg_ParseTuple(argumentos, "sO!", &tabla, &PyList_Type, &lista)) return nullptr;
    std::vector<std::string> datos;
    for (Py_ssize_t i = 0; i < PyList_Size(lista); ++i) {
        PyObject* elemento = PyList_GetItem(lista, i);
        if (!PyUnicode_Check(elemento)) {
            PyErr_SetString(PyExc_TypeError, "Todos los valores deben ser cadenas de texto");
            return nullptr;
        }
        const char* valor = PyUnicode_AsUTF8(elemento);
        if (valor == nullptr) return nullptr;
        datos.emplace_back(valor);
    }
    try {
        long long id = base->insertarDatos(tabla, datos);
        if (id < 0) {
            PyErr_SetString(PyExc_RuntimeError, "No se ha podido insertar el registro");
            return nullptr;
        }
        return PyLong_FromLongLong(id);
    } catch (const std::exception& error) {
        PyErr_SetString(PyExc_RuntimeError, error.what());
        return nullptr;
    }
}

static PyMethodDef metodos[] = {
    {"crear_base", crear_base, METH_VARARGS, "Crea una base de datos"},
    {"usar_base", usar_base, METH_VARARGS, "Selecciona una base de datos"},
    {"crear_tabla", crear_tabla, METH_VARARGS, "Crea una tabla"},
    {"insertar", insertar, METH_VARARGS, "Inserta un registro y devuelve su id"},
    {nullptr, nullptr, 0, nullptr}
};

static PyModuleDef modulo = {
    PyModuleDef_HEAD_INIT,
    "pierodevbbdd",
    "Conector Python para el motor PierodevBBDD en C++",
    -1,
    metodos,
    nullptr,
    nullptr,
    nullptr,
    nullptr
};

PyMODINIT_FUNC PyInit_pierodevbbdd(void) {
    try {
        base = std::make_unique<PierodevBBDD>("config.json");
        return PyModule_Create(&modulo);
    } catch (const std::exception& error) {
        PyErr_SetString(PyExc_ImportError, error.what());
        return nullptr;
    }
}
