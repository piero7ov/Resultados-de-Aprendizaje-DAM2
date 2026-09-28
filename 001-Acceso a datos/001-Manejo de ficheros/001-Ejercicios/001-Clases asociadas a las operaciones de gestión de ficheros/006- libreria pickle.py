import pickle

class Libro:
    def __init__(self, titulo, autor):
        self.titulo = titulo
        self.autor = autor

    def __str__(self):
        return f"Libro(titulo='{self.titulo}', autor='{self.autor}')"


# Crear una instancia de la clase Libro
libro = Libro("El Quijote", "Miguel de Cervantes")

# Guardar el objeto en un archivo binario
with open('libro.pkl', 'wb') as file:
    pickle.dump(libro, file)

print("Objeto guardado en 'libro.pkl'")