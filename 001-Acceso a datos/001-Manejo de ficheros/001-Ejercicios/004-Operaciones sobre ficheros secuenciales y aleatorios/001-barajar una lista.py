import random

lista = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

print("Lista original:", lista)

# shuffle modifica la propia lista y devuelve None.
random.shuffle(lista)

print("Lista barajada:", lista)
