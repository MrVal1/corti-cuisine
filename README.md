# Corti-Cuisine 🍽️

Application web de gestion de commandes pour restaurant avec interface de service et cuisine.

## Structure du Projet

- `/frontend` : Application React pour l'interface utilisateur
- `/backend` : Serveur Node.js/Express avec Socket.IO
- `server.js` : Point d'entrée du serveur

## Fonctionnalités

### 1. Gestion du Menu
- Interface admin pour gérer les plats
- Gestion des catégories
- Suivi des quantités disponibles

### 2. Système de Commande (Service)
- Prise de commande intuitive
- Gestion des remarques et noms clients
- Suivi en temps réel des quantités
- Tableau des commandes avec statuts

### 3. Interface Cuisine
- Vue en temps réel des commandes
- Gestion des statuts
- Mise à jour des quantités disponibles

### 4. Gestion et Statistiques
- Historique des commandes
- Statistiques de vente
- Tableau de bord

## Installation

1. **Backend :**
```bash
npm install
```

2. **Frontend :**
```bash
cd frontend
npm install
```

## Démarrage

1. **Backend :**
```bash
npm start
```

2. **Frontend :**
```bash
cd frontend
npm start
```

## Technologies Utilisées

- React
- Node.js
- Express
- Socket.IO
- MongoDB (base de données)

## Configuration

Le projet nécessite les variables d'environnement suivantes :
- `PORT` : Port du serveur (défaut: 3001)
- `MONGODB_URI` : URL de connexion MongoDB
