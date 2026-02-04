# 🚗 Application de Transport et Livraison

Application complète de transport et livraison avec dashboard d'administration, applications mobiles client et conducteur, notifications push en temps réel et WebSocket.

## 📋 Table des matières

- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Démarrage](#démarrage)
- [Fonctionnalités](#fonctionnalités)
- [API](#api)
- [Dépannage](#dépannage)

## 🏗️ Architecture

Le projet est composé de 4 parties principales :

```
Curry/
├── backend/          # API NestJS (Port 3008)
├── dashboard/        # Dashboard Next.js (Port 3000)
├── mobile-client/    # App React Native (Expo) - Client
└── mobile-driver/    # App React Native (Expo) - Conducteur
```

### Stack technique

- **Backend**: NestJS, Prisma, PostgreSQL, Socket.io, Firebase Cloud Messaging
- **Dashboard**: Next.js 14, React, Tailwind CSS, Zustand
- **Mobile**: React Native (Expo), React Navigation, React Native Maps
- **Base de données**: PostgreSQL
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Temps réel**: WebSocket (Socket.io)

## 🚀 Installation

### Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Compte Firebase (pour les notifications push)

### 1. Cloner le projet

```bash
git clone <repository-url>
cd Curry
```

### 2. Installer les dépendances

```bash
# Backend
cd backend
npm install

# Dashboard
cd ../dashboard
npm install

# Mobile Client
cd ../mobile-client
npm install

# Mobile Driver
cd ../mobile-driver
npm install
```

### 3. Configuration de la base de données

```bash
cd backend

# Créer la base de données PostgreSQL
createdb bissau_go

# Configurer Prisma
npx prisma generate
npx prisma db push
```

## ⚙️ Configuration

### Backend (.env)

Créez un fichier `.env` dans le dossier `backend/` :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/bissau_go"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3008

# Firebase Cloud Messaging (JSON stringifié)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'

# Google Maps API (pour les directions)
GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

### Dashboard (.env.local)

Créez un fichier `.env.local` dans le dossier `dashboard/` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3008/api
```

### Mobile Apps (app.json)

Pour `mobile-client` et `mobile-driver`, configurez dans `app.json` :

```json
{
  "expo": {
    "extra": {
      "apiUrl": "http://YOUR_IP:3008/api"
    }
  }
}
```

**Important**: Remplacez `YOUR_IP` par votre adresse IP locale (pas `localhost`) pour que les apps mobiles puissent accéder au backend.

### Firebase Configuration

1. Créez un projet Firebase sur [Firebase Console](https://console.firebase.google.com/)
2. Activez Cloud Messaging
3. Téléchargez le fichier de credentials du service account
4. Copiez le contenu JSON dans `FIREBASE_SERVICE_ACCOUNT` (en tant que string JSON)

## 🎯 Démarrage

### 1. Démarrer PostgreSQL

```bash
# macOS (Homebrew)
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Ou utilisez Docker
docker-compose up -d postgres
```

### 2. Démarrer le Backend

```bash
cd backend
npm run start:dev
```

Le backend sera accessible sur `http://localhost:3008`

### 3. Créer le compte Admin

```bash
cd backend
npx ts-node scripts/create-admin.ts
```

Cela crée un admin avec :
- Email: `admin@bissaugo.com`
- Password: `admin123`

### 4. Démarrer le Dashboard

```bash
cd dashboard
npm run dev
```

Le dashboard sera accessible sur `http://localhost:3000`

### 5. Démarrer les Apps Mobiles

```bash
# Mobile Client
cd mobile-client
npm start

# Mobile Driver (dans un autre terminal)
cd mobile-driver
npm start
```

Utilisez l'app Expo Go sur votre téléphone pour scanner le QR code.

## ✨ Fonctionnalités

### Dashboard Admin

- ✅ Gestion des conducteurs (création, activation/désactivation, statut en ligne)
- ✅ Gestion des livraisons
- ✅ Gestion des courses
- ✅ Statistiques (revenus, courses, conducteurs)
- ✅ Authentification admin

### Application Client

- ✅ Authentification par OTP
- ✅ Réservation de courses
- ✅ Réservation de livraisons
- ✅ Suivi en temps réel des courses
- ✅ Historique des courses
- ✅ Notifications push
- ✅ WebSocket pour mises à jour en temps réel

### Application Conducteur

- ✅ Authentification par OTP
- ✅ Réception de courses en temps réel
- ✅ Acceptation/refus de courses
- ✅ Suivi GPS en temps réel
- ✅ Gestion du statut (en ligne/hors ligne)
- ✅ Historique des courses
- ✅ Gains et statistiques
- ✅ Notifications push
- ✅ WebSocket pour nouvelles courses

### Notifications et Temps Réel

- ✅ **Firebase Cloud Messaging (FCM)**: Notifications push
- ✅ **WebSocket (Socket.io)**: Mises à jour en temps réel
- ✅ **Système hybride**: WebSocket + Polling (10s) pour fiabilité
- ✅ **Filtrage intelligent**: Notifie seulement les conducteurs proches (10km) et avec la bonne catégorie de véhicule

## 📡 API

### Endpoints principaux

#### Authentification

- `POST /api/auth/request-otp` - Demander un code OTP
- `POST /api/auth/verify-otp` - Vérifier le code OTP
- `POST /api/auth/admin/login` - Connexion admin

#### Courses

- `POST /api/rides` - Créer une course
- `GET /api/rides` - Liste des courses
- `GET /api/rides/:id` - Détails d'une course
- `POST /api/rides/:id/accept` - Accepter une course
- `POST /api/rides/:id/cancel` - Annuler une course
- `POST /api/rides/:id/arrive` - Marquer l'arrivée du conducteur
- `POST /api/rides/:id/start` - Démarrer la course
- `POST /api/rides/:id/complete` - Terminer la course

#### Conducteurs

- `GET /api/drivers/me` - Profil du conducteur
- `PUT /api/drivers/me` - Mettre à jour le profil
- `POST /api/drivers/me/status` - Changer le statut (en ligne/hors ligne)
- `POST /api/drivers/me/location` - Mettre à jour la position GPS

#### Notifications

- `POST /api/notifications/register-token` - Enregistrer un token FCM
- `POST /api/notifications/remove-token` - Supprimer un token FCM

#### Admin

- `GET /api/admin/rides` - Toutes les courses
- `GET /api/admin/deliveries` - Toutes les livraisons
- `GET /api/admin/drivers` - Tous les conducteurs
- `GET /api/admin/drivers/:id` - Détails d'un conducteur
- `POST /api/admin/drivers` - Créer un conducteur
- `PUT /api/admin/drivers/:id` - Mettre à jour un conducteur
- `PUT /api/admin/drivers/:id/status` - Activer/désactiver un conducteur
- `GET /api/admin/statistics` - Statistiques

### WebSocket

Le WebSocket est accessible sur `/realtime` (même port que l'API).

**Événements émis par le serveur :**
- `new_ride` - Nouvelle course disponible
- `new_delivery` - Nouvelle livraison disponible
- `ride_accepted` - Course acceptée
- `delivery_accepted` - Livraison acceptée
- `ride_status_changed` - Changement de statut d'une course
- `ride_cancelled` - Course annulée

**Événements émis par le client :**
- `join_drivers_room` - Rejoindre la room des conducteurs
- `join_user_room` - Rejoindre la room d'un utilisateur

## 🔧 Dépannage

### Le backend ne démarre pas

1. Vérifiez que PostgreSQL est démarré
2. Vérifiez que `DATABASE_URL` est correct dans `.env`
3. Vérifiez que le port 3008 n'est pas utilisé : `lsof -i :3008`

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est accessible
psql -U postgres -d bissau_go

# Réinitialiser Prisma
cd backend
npx prisma db push --force-reset
```

### Les apps mobiles ne peuvent pas se connecter au backend

1. Vérifiez que vous utilisez votre IP locale (pas `localhost`) dans `app.json`
2. Vérifiez que le backend est accessible depuis votre téléphone
3. Vérifiez que le firewall n'bloque pas le port 3008

### Erreur de connexion au dashboard

1. Vérifiez que le backend est démarré sur le port 3008
2. Vérifiez que `NEXT_PUBLIC_API_URL` est correct dans `.env.local`
3. Créez le compte admin : `cd backend && npx ts-node scripts/create-admin.ts`
4. Vérifiez les logs dans la console du navigateur (F12)

### Les notifications push ne fonctionnent pas

1. Vérifiez que `FIREBASE_SERVICE_ACCOUNT` est correctement configuré
2. Vérifiez les logs du backend pour les erreurs Firebase
3. Vérifiez que le token FCM est bien enregistré (logs mobile)
4. Vérifiez que les permissions de notification sont accordées sur le téléphone

### WebSocket ne se connecte pas

1. Vérifiez que le backend est démarré
2. Vérifiez l'URL dans `websocketService.ts` (doit être sans `/api`)
3. Vérifiez que le token JWT est valide
4. Vérifiez les logs du backend pour les erreurs de connexion

### Erreur "Token expired" dans WebSocket

C'est normal si le token JWT a expiré. L'app devrait se reconnecter automatiquement avec un nouveau token après reconnexion.

### Les courses ne s'affichent pas pour les conducteurs

1. Vérifiez que le conducteur est en ligne (`isOnline: true`)
2. Vérifiez que le conducteur a une position GPS valide
3. Vérifiez que la distance est inférieure à 10km
4. Vérifiez que la catégorie de véhicule correspond

## 📝 Notes importantes

- Les prix sont en **FCFA** (Franc CFA)
- Les catégories de véhicules sont : `ECO` et `CONFORT`
- Les statuts de course : `PENDING`, `ACCEPTED`, `DRIVER_ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- L'authentification utilise des **tokens JWT** avec expiration de 7 jours
- Les apps s'actualisent automatiquement sans nécessiter de déconnexion/reconnexion
- Les tokens expirés sont automatiquement nettoyés (401 → clear storage)

## 🛠️ Scripts utiles

```bash
# Backend
cd backend
npm run start:dev          # Démarrer en mode développement
npm run build              # Build pour production
npx prisma studio          # Interface graphique pour la base de données
npx ts-node scripts/create-admin.ts  # Créer un admin

# Dashboard
cd dashboard
npm run dev                # Démarrer en mode développement
npm run build              # Build pour production

# Mobile
cd mobile-client  # ou mobile-driver
npm start                  # Démarrer Expo
```

## 📞 Support

Pour toute question ou problème, vérifiez :
1. Les logs du backend (console)
2. Les logs du dashboard (console navigateur F12)
3. Les logs des apps mobiles (Expo DevTools)

---

** Bissau Go**

try it
