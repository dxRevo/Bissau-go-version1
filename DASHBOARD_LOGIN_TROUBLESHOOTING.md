# 🔧 Guide de dépannage - Connexion Dashboard

## ✅ Améliorations apportées

- Logs de débogage ajoutés dans la console du navigateur
- Gestion d'erreur améliorée avec messages détaillés
- Intercepteur API pour voir les erreurs réseau

## 🔍 Étapes de diagnostic

### 1. Vérifier que le backend est démarré

```bash
cd backend
npm run start:dev
```

Le backend doit être accessible sur `http://localhost:3008`

### 2. Créer le compte admin (si pas déjà fait)

```bash
cd backend
npx ts-node scripts/create-admin.ts
```

Cela crée un admin avec:
- Email: `admin@vetigo.com`
- Password: `admin123`

### 3. Tester l'endpoint directement

```bash
curl -X POST http://localhost:3008/api/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vetigo.com","password":"admin123"}'
```

Si ça fonctionne, vous devriez recevoir un `accessToken`.

### 4. Vérifier l'URL de l'API dans le dashboard

Le dashboard utilise par défaut: `http://localhost:3008/api`

Pour changer l'URL, créez/modifiez `dashboard/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3008/api
```

### 5. Vérifier les logs dans la console du navigateur

Ouvrez la console du navigateur (F12) et regardez:
- Les logs commençant par `🔐`, `✅`, ou `❌`
- Les erreurs réseau dans l'onglet Network

## 🐛 Problèmes courants

### Erreur: "Network Error" ou "Failed to fetch"
- Le backend n'est pas démarré
- L'URL de l'API est incorrecte
- Problème de CORS (vérifiez que le backend a CORS activé)

### Erreur: "Invalid credentials"
- Le compte admin n'existe pas dans la base de données
- Le mot de passe est incorrect
- Le compte admin n'est pas actif (`isActive: false`)

### Erreur: "404 Not Found"
- L'endpoint `/api/auth/admin/login` n'existe pas
- Le backend n'a pas été redémarré après l'ajout de l'endpoint

## 💡 Solution rapide

1. Redémarrer le backend:
   ```bash
   cd backend
   npm run start:dev
   ```

2. Créer le compte admin:
   ```bash
   cd backend
   npx ts-node scripts/create-admin.ts
   ```

3. Redémarrer le dashboard:
   ```bash
   cd dashboard
   npm run dev
   ```

4. Ouvrir la console du navigateur (F12) et réessayer la connexion

5. Vérifier les logs dans la console pour voir l'erreur exacte
