import pickle

class Libro:
    def __init__(self, titulo, autor):
        self.titulo = titulo
        self.autor = autor

    def __str__(self):
        return f"Libro(titulo='{self.titulo}', autor='{self.autor}')"

print("Objeto guardado en 'libro.pkl'")

# Leer el contenido del archivo binario
with open('libro.pkl', 'rb') as file:
    libro_cargado = pickle.load(file)

print("Objeto cargado desde 'libro.pkl':", libro_cargado)