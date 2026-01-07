





#!/bin/bash

echo "🚀 Démarrage de tous les services Curry..."
echo ""

# 1. Démarrer PostgreSQL
echo "1️⃣ Démarrage de PostgreSQL..."
./START_POSTGRES.sh

# Vérifier que PostgreSQL est accessible
if ! docker ps | grep -q curry_postgres; then
    # Vérifier si PostgreSQL local est en cours d'exécution
    if ! brew services list | grep -q "postgresql@14.*started"; then
        echo "❌ PostgreSQL n'est pas démarré. Arrêt du script."
        exit 1
    else
        echo "ℹ️  Utilisation de PostgreSQL local (Homebrew)"
    fi
fi

# 2. Attendre un peu pour que PostgreSQL soit complètement prêt
echo ""
echo "⏳ Attente que PostgreSQL soit complètement prêt..."
sleep 3

# 3. Vérifier la connexion
echo ""
echo "2️⃣ Vérification de la connexion à la base de données..."
if docker ps | grep -q curry_postgres; then
    if docker exec curry_postgres pg_isready -U mac > /dev/null 2>&1; then
        echo "✅ Connexion à PostgreSQL réussie!"
    else
        echo "⚠️  PostgreSQL n'est pas encore prêt. Attente supplémentaire..."
        sleep 5
    fi
elif brew services list | grep -q "postgresql@14.*started"; then
    if psql -d bissau_go -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Connexion à PostgreSQL local réussie!"
    else
        echo "⚠️  Impossible de se connecter à PostgreSQL local"
    fi
fi

echo ""
echo "✅ Tous les services sont prêts !"
echo ""
echo "📝 Prochaines étapes:"
echo "   1. Vérifiez que backend/.env contient:"
echo "      DATABASE_URL=\"postgresql://mac:@localhost:5432/bissau_go?schema=public\""
echo ""
echo "   2. Exécutez les migrations Prisma (si nécessaire):"
echo "      cd backend && npx prisma migrate dev"
echo ""
echo "   3. Démarrez le backend:"
echo "      cd backend && npm run start:dev"
echo ""
echo "   4. Démarrez les applications mobiles:"
echo "      cd mobile-client && npm start"
echo "      cd mobile-driver && npm start"



