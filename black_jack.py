import random

palos = ["Diamantes", "Picas", "Corazones", "Treboles"]
valores = [2,3,4,5,6,7,8,9,10,"J","Q","K","A"]

Dinero = 100

def valor_carta(carta):
    valor = carta[0]
    if valor in ["J","Q","K"]:
        return 10
    elif valor == "A":
        return 11
    else:
        return valor

def calcular_total(mano):
    total = 0
    ases = 0

    for carta in mano:
        v = valor_carta(carta)
        total += v
        if carta[0] == "A":
            ases += 1

    while total > 21 and ases > 0:
        total -= 10
        ases -= 1

    return total

def pedir_carta(mano):
    carta = (random.choice(valores), random.choice(palos))
    mano.append(carta)
    print(f"Has robado: {carta[0]} de {carta[1]}")

def mostrar_mano(mano):
    for carta in mano:
        print(f"{carta[0]} de {carta[1]}")
    print(f"Total: {calcular_total(mano)}\n")

def comienzo_juego():
    Cartas_rival = []
    Cartas_mano = []

    for i in range(2):
        Cartas_rival.append((random.choice(valores), random.choice(palos)))
        Cartas_mano.append((random.choice(valores), random.choice(palos)))

    print("\n--- Mano del rival ---")
    print(f"{Cartas_rival[0][0]} de {Cartas_rival[0][1]}, Carta oculta\n")

    print("--- Tu mano ---")
    mostrar_mano(Cartas_mano)

    while True:
        opcion2 = int(input("1: pedir carta | 2: plantarse "))

        if opcion2 == 1:
            pedir_carta(Cartas_mano)
            mostrar_mano(Cartas_mano)

            if calcular_total(Cartas_mano) > 21:
                print("Te pasaste de 21. Pierdes.")
                return False

        elif opcion2 == 2:
            break

    print("\n--- Turno del rival ---")
    mostrar_mano(Cartas_rival)

    while calcular_total(Cartas_rival) < 17:
        pedir_carta(Cartas_rival)

    total_jugador = calcular_total(Cartas_mano)
    total_rival = calcular_total(Cartas_rival)

    print("\n--- RESULTADO ---")
    print(f"Tu total: {total_jugador}")
    print(f"Rival total: {total_rival}")

    if total_rival > 21 or total_jugador > total_rival:
        print("¡Ganaste!")
        return True
    elif total_jugador < total_rival:
        print("Perdiste.")
        return False
    else:
        print("Empate.")
        return None


while True:
    opcion = int(input("\n1: jugar | 2: salir "))

    match opcion:
        case 1:
            if Dinero > 0:
                apuesta = int(input("Cuánto quieres apostar: "))

                resultado = comienzo_juego()

                if resultado == True:
                    Dinero += apuesta
                elif resultado == False:
                    Dinero -= apuesta

                print(f"Dinero actual: {Dinero}")

            else:
                print("Te has quedado sin dinero")
                break

        case 2:
            print("Saliendo del blackjack")
            break