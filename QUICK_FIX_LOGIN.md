# 🔧 Solution Rapide - Problème de Connexion

## 🐛 Problème Identifié

Le dashboard Next.js et le backend NestJS essayaient tous les deux d'utiliser le port 3000, ce qui causait des conflits.

## ✅ Solution Appliquée

Le dashboard est maintenant configuré pour utiliser le port **3001** par défaut.

## 🔄 Actions à Effectuer

### 1. Arrêter les processus actuels

```bash
pkill -f 'nest start'
pkill -f 'next dev'
```

### 2. Redémarrer le Backend (Port 3000)

```bash
cd backend
npm run start:dev
```

Attendez de voir :
```
🚀 Vetigo API running on http://localhost:3000
```

### 3. Redémarrer le Dashboard (Port 3001)

Dans un **nouveau terminal** :

```bash
cd dashboard
npm run dev
```

Attendez de voir :
```
- Local:        http://localhost:3001
```

### 4. Accéder au Dashboard

Ouvrez votre navigateur :
```
http://localhost:3001/login
```

### 5. Se Connecter

- **Email** : `admin@vetigo.com`
- **Password** : `admin123`

## ✅ Vérification

Une fois connecté, vous devriez voir :
- Le dashboard avec la sidebar
- La page d'accueil avec les statistiques
- La navigation fonctionnelle

## 🆘 Si ça ne marche toujours pas

1. **Vérifiez les ports** :
   ```bash
   lsof -ti:3000  # Devrait être le backend
   lsof -ti:3001  # Devrait être le dashboard
   ```

2. **Vérifiez le localStorage** :
   - Console (F12) > Application > Local Storage
   - Supprimez `admin-auth-storage` si nécessaire

3. **Vérifiez les logs** :
   - Console du navigateur (F12)
   - Terminaux du backend et dashboard

---

💡 **Astuce** : Utilisez le script `./START_ALL.sh` pour démarrer tous les services automatiquement.
