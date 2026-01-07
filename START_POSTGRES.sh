





#!/bin/bash

echo "🚀 Démarrage de PostgreSQL avec Docker..."

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution. Veuillez démarrer Docker."
    exit 1
fi

# Arrêter PostgreSQL local si en cours d'exécution (Homebrew)
if brew services list | grep -q "postgresql@14.*started"; then
    echo "⚠️  PostgreSQL local (Homebrew) est en cours d'exécution."
    read -p "Voulez-vous l'arrêter et utiliser Docker à la place? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 Arrêt de PostgreSQL local..."
        brew services stop postgresql@14
    else
        echo "ℹ️  Utilisation de PostgreSQL local. Docker ne sera pas démarré."
        exit 0
    fi
fi

# Démarrer PostgreSQL avec Docker
echo "🐳 Démarrage de PostgreSQL avec Docker..."
docker-compose up -d postgres

# Attendre que PostgreSQL soit prêt
echo "⏳ Attente que PostgreSQL soit prêt..."
for i in {1..30}; do
    if docker exec curry_postgres pg_isready -U mac > /dev/null 2>&1; then
        echo "✅ PostgreSQL est prêt!"
        break
    fi
    sleep 1
done

# Vérifier le statut
if docker ps | grep -q curry_postgres; then
    echo ""
    echo "✅ PostgreSQL est démarré et accessible sur le port 5432"
    echo ""
    echo "📋 Informations de connexion:"
    echo "   - Host: localhost"
    echo "   - Port: 5432"
    echo "   - Database: bissau_go"
    echo "   - User: mac"
    echo "   - Password: (aucun)"
    echo ""
    echo "🔗 URL de connexion:"
    echo "   postgresql://mac:@localhost:5432/bissau_go?schema=public"
    echo ""
    echo "💡 Pour vous connecter:"
    echo "   psql -h localhost -U mac -d bissau_go"
else
    echo "❌ Erreur lors du démarrage de PostgreSQL"
    exit 1
fi



