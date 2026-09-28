import random

# range llega hasta 999: tenemos 1.000 índices distintos.
indices = list(range(1000))
random.shuffle(indices)

print(indices)
print("Cantidad de índices:", len(indices))
