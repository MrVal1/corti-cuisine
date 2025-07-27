# Guide de déploiement - Corti-Cuisine

Ce guide explique comment déployer l'application Corti-Cuisine sur un VPS.

## Prérequis

- Un VPS sous Linux (Ubuntu/Debian recommandé)
- Node.js 16+ et npm installés
- MongoDB installé et configuré
- Nginx installé
- (Optionnel) Un nom de domaine pointant vers votre VPS

## 1. Préparation du serveur

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer les dépendances nécessaires
sudo apt install -y nginx certbot python3-certbot-nginx

# Créer le répertoire pour l'application
sudo mkdir -p /var/www/corti-cuisine
sudo chown -R $USER:$USER /var/www/corti-cuisine
```

## 2. Configuration de MongoDB

```bash
# Créer un utilisateur MongoDB (à adapter)
mongosh
use corti-cuisine
db.createUser({
  user: "cortiuser",
  pwd: "votre_mot_de_passe_securise",
  roles: ["readWrite"]
})
```

## 3. Déploiement du backend

```bash
# Dans le répertoire backend
cd backend

# Installer les dépendances
npm install --production

# Créer le fichier .env
cat > .env << EOL
PORT=3001
MONGODB_URI=mongodb://cortiuser:votre_mot_de_passe_securise@localhost:27017/corti-cuisine
NODE_ENV=production
EOL

# Démarrer avec PM2 pour la persistance
npm install -g pm2
pm2 start server.js --name corti-cuisine-backend
pm2 save
pm2 startup
```

## 4. Build et déploiement du frontend

```bash
# Dans le répertoire frontend
cd frontend

# Installer les dépendances et builder
npm install
npm run build

# Copier le build vers le répertoire de production
sudo cp -r build/* /var/www/corti-cuisine/
```

## 5. Configuration Nginx

1. Copier le fichier de configuration nginx fourni :
```bash
sudo cp nginx.conf /etc/nginx/sites-available/corti-cuisine
```

2. Activer le site :
```bash
sudo ln -s /etc/nginx/sites-available/corti-cuisine /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Supprimer la config par défaut
sudo nginx -t  # Tester la configuration
sudo systemctl restart nginx
```

## 6. Configuration HTTPS (recommandé)

```bash
# Obtenir un certificat SSL avec Let's Encrypt
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Certbot modifiera automatiquement la configuration nginx
```

## 7. Vérification

1. Le frontend devrait être accessible sur :
   - http://votre-domaine.com (ou https:// si SSL configuré)
   - http://votre-ip (en l'absence de domaine)

2. L'API devrait être accessible sur :
   - http(s)://votre-domaine.com/api/
   - Socket.IO sur ws(s)://votre-domaine.com/socket.io/

## Maintenance

### Mettre à jour l'application

```bash
# Backend
cd backend
git pull
npm install
pm2 restart corti-cuisine-backend

# Frontend
cd frontend
git pull
npm install
npm run build
sudo cp -r build/* /var/www/corti-cuisine/
```

### Logs et monitoring

```bash
# Logs backend
pm2 logs corti-cuisine-backend

# Logs nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## Sécurité

1. Configurer un pare-feu :
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

2. Sécuriser MongoDB :
- Modifier `/etc/mongod.conf` pour limiter l'accès à localhost
- Utiliser des mots de passe forts
- Activer l'authentification

3. Maintenir le système à jour :
```bash
sudo apt update && sudo apt upgrade -y
```

## Dépannage

1. Si le frontend ne charge pas :
   - Vérifier les logs nginx
   - Vérifier les permissions du répertoire `/var/www/corti-cuisine`

2. Si l'API ne répond pas :
   - Vérifier que le backend tourne : `pm2 status`
   - Vérifier la connexion MongoDB
   - Vérifier les logs : `pm2 logs`

3. Si Socket.IO ne se connecte pas :
   - Vérifier la configuration proxy dans nginx
   - Vérifier les logs backend pour les erreurs de connexion
