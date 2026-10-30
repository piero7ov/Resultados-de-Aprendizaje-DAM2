<?php
	switch($_GET['bloque']){
		case "menu":
			echo '["clientes","productos","pedidos","almacén","transporte","empleados"]';
			break;
		case "tabla":
			echo '
				{
					"clientes": [
						{
							"id": 1,
							"nombre": "Piero",
							"apellidos": "Olivares Velasquez",
							"email": "piero7ov@gmail.com",
							"telefono": "612 345 678",
							"ciudad": "Valencia"
						},
						{
							"id": 2,
							"nombre": "Carlos",
							"apellidos": "García Torres",
							"email": "carlos.garcia@example.com",
							"telefono": "623 456 789",
							"ciudad": "Madrid"
						},
						{
							"id": 3,
							"nombre": "Ana",
							"apellidos": "Sánchez Ruiz",
							"email": "ana.sanchez@example.com",
							"telefono": "634 567 890",
							"ciudad": "Alicante"
						},
						{
							"id": 4,
							"nombre": "David",
							"apellidos": "Navarro Pérez",
							"email": "david.navarro@example.com",
							"telefono": "645 678 901",
							"ciudad": "Castellón"
						},
						{
							"id": 5,
							"nombre": "María",
							"apellidos": "Romero Gil",
							"email": "maria.romero@example.com",
							"telefono": "656 789 012",
							"ciudad": "Sevilla"
						},
						{
							"id": 6,
							"nombre": "Javier",
							"apellidos": "Moreno Díaz",
							"email": "javier.moreno@example.com",
							"telefono": "667 890 123",
							"ciudad": "Murcia"
						},
						{
							"id": 7,
							"nombre": "Lucía",
							"apellidos": "Vidal Ferrer",
							"email": "lucia.vidal@example.com",
							"telefono": "678 901 234",
							"ciudad": "Valencia"
						},
						{
							"id": 8,
							"nombre": "Pedro",
							"apellidos": "Ortega Molina",
							"email": "pedro.ortega@example.com",
							"telefono": "689 012 345",
							"ciudad": "Barcelona"
						},
						{
							"id": 9,
							"nombre": "Sara",
							"apellidos": "Domínguez Cano",
							"email": "sara.dominguez@example.com",
							"telefono": "691 123 456",
							"ciudad": "Zaragoza"
						},
						{
							"id": 10,
							"nombre": "Daniel",
							"apellidos": "Herrera Soler",
							"email": "daniel.herrera@example.com",
							"telefono": "602 234 567",
							"ciudad": "Valencia"
						}
					]
				}
			';
			break;
	}
?>
