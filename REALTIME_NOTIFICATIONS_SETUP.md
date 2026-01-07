# Configuration des Notifications Push et WebSocket

## ✅ Fonctionnalités implémentées

### Backend

1. **Service FCM (Firebase Cloud Messaging)**
   - Fichier: `backend/src/notifications/notifications.service.ts`
   - Enregistrement des tokens FCM
   - Envoi de notifications push aux clients et conducteurs
   - Notifications automatiques pour:
     - Nouvelle course disponible (tous les drivers en ligne)
     - Nouvelle livraison disponible (tous les livreurs en ligne)
     - Course acceptée (client)
     - Livraison acceptée (client)

2. **WebSocket Gateway**
   - Fichier: `backend/src/websocket/websocket.gateway.ts`
   - Connexion en temps réel via Socket.io
   - Namespace: `/realtime`
   - Événements:
     - `new_ride` - Nouvelle course disponible
     - `new_delivery` - Nouvelle livraison disponible
     - `ride_accepted` - Course acceptée
     - `delivery_accepted` - Livraison acceptée
     - `ride_status_changed` - Changement de statut

3. **Endpoints API**
   - `POST /api/notifications/register-token` - Enregistrer un token FCM
   - `POST /api/notifications/remove-token` - Supprimer un token FCM

### Mobile Driver

1. **Service FCM**
   - Fichier: `mobile-driver/src/services/notificationsService.ts`
   - Enregistrement automatique du token au démarrage
   - Écoute des notifications reçues
   - Navigation automatique vers la course/livraison quand une notification est tapée

2. **Service WebSocket**
   - Fichier: `mobile-driver/src/services/websocketService.ts`
   - Connexion automatique quand le driver est en ligne
   - Réception en temps réel des nouvelles courses/livraisons
   - Reconnexion automatique en cas de déconnexion

3. **Polling optimisé**
   - Intervalle augmenté de 3s à 10s
   - WebSocket comme source principale
   - Polling comme système de secours

### Mobile Client

1. **Service FCM**
   - Fichier: `mobile-client/src/services/notificationsService.ts`
   - Enregistrement automatique du token
   - Écoute des notifications (course acceptée, etc.)

2. **Service WebSocket**
   - Fichier: `mobile-client/src/services/websocketService.ts`
   - Connexion automatique
   - Réception des mises à jour de statut en temps réel

## 🔧 Configuration requise

### Backend

1. **Variables d'environnement** (`.env`):
   ```env
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
   ```
   
   Ou utilisez le fichier de credentials Firebase et configurez le chemin dans le code.

2. **Port WebSocket**: Le WebSocket utilise le même port que l'API (3008 par défaut)

### Mobile

1. **Project ID Expo**: 
   - Remplacer `'your-project-id'` dans `notificationsService.ts` par votre Expo Project ID
   - Trouvable dans `app.json` ou sur le dashboard Expo

2. **URL API**:
   - Vérifier que `EXPO_PUBLIC_API_URL` est correctement configuré
   - Le WebSocket utilise la même URL (sans `/api`)

## 📊 Architecture

```
Client crée course
    ↓
Backend: RidesService.createRide()
    ↓
    ├─→ WebSocketGateway.notifyNewRide()
    │   └─→ Filtre par distance (10km) et catégorie véhicule
    │   └─→ Envoie aux 10 drivers les plus proches via WebSocket
    │
    └─→ NotificationsService.notifyDriversNewRide()
        └─→ Filtre par distance (10km) et catégorie véhicule
        └─→ Envoie aux 10 drivers les plus proches via FCM
```

### Critères de sélection des drivers

1. **Distance**: Maximum 10 km du point de départ
2. **Catégorie véhicule**: Doit correspondre à la catégorie demandée (ECO, CONFORT)
3. **Statut**: En ligne (`isOnline = true`)
4. **Position**: Doit avoir une position GPS valide
5. **Limite**: Maximum 10 drivers les plus proches sont notifiés

Driver accepte course
    ↓
Backend: RidesService.acceptRide()
    ↓
    ├─→ WebSocketGateway.notifyRideAccepted()
    │   └─→ Client reçoit via WebSocket
    │
    └─→ NotificationsService.notifyClientRideAccepted()
        └─→ Client reçoit notification push
```

## 🚀 Utilisation

### Pour les drivers

1. L'app s'enregistre automatiquement pour les notifications au démarrage
2. Quand le driver se met en ligne, WebSocket se connecte automatiquement
3. Les nouvelles courses arrivent en temps réel via WebSocket ET notification push
4. Le polling de secours vérifie toutes les 10 secondes (au lieu de 3)

### Pour les clients

1. L'app s'enregistre automatiquement pour les notifications
2. WebSocket se connecte automatiquement après connexion
3. Les notifications arrivent quand:
   - Un driver accepte leur course
   - Le statut de la course change

## 🔍 Dépannage

### Les notifications ne fonctionnent pas

1. Vérifier que `FIREBASE_SERVICE_ACCOUNT` est configuré dans `.env`
2. Vérifier les logs du backend pour les erreurs Firebase
3. Vérifier que le token FCM est bien enregistré (logs mobile)

### WebSocket ne se connecte pas

1. Vérifier que le backend est démarré
2. Vérifier l'URL dans `websocketService.ts`
3. Vérifier que le token JWT est valide
4. Vérifier les logs du backend pour les erreurs de connexion

### Le polling est trop fréquent

- L'intervalle est maintenant à 10 secondes
- WebSocket devrait être la source principale
- Le polling ne devrait être utilisé qu'en secours

## 📝 Notes

- Les notifications push nécessitent une configuration Firebase valide
- WebSocket fonctionne même sans Firebase (mais moins fiable)
- Le système hybride (WebSocket + Polling) assure une meilleure fiabilité
- Les tokens FCM sont automatiquement nettoyés s'ils deviennent invalides


