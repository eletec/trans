#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  Easy Packing — Script d'installation VPS (OVH Debian 12 + Docker)
#  VPS : vps-8b39cecf.vps.ovh.net  /  IP : 141.227.149.79
# ═══════════════════════════════════════════════════════════════════════
set -euo pipefail

# ── CONFIGURATION ───────────────────────────────────────────────────────
# Modifier ces variables avant de lancer le script
DOMAIN="${DOMAIN:-vps-8b39cecf.vps.ovh.net}"   # Remplacer par votre domaine si disponible
ACME_EMAIL="${ACME_EMAIL:-admin@example.com}"   # Email Let's Encrypt
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
TRAEFIK_USER="${TRAEFIK_USER:-admin}"
# Mot de passe dashboard Traefik — généré ci-dessous s'il est vide
TRAEFIK_PASS="${TRAEFIK_PASS:-}"

APP_DIR="/opt/easypacking"
GITHUB_REPO="https://github.com/eletec/trans.git"
BRANCH="master"

# ── COULEURS ────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ── VÉRIFICATIONS PRÉALABLES ────────────────────────────────────────────
[ "$(id -u)" -eq 0 ] || error "Ce script doit être lancé en tant que root (sudo ./install-vps.sh)"

info "=== Easy Packing — Déploiement VPS ==="
echo "  Domaine    : $DOMAIN"
echo "  Email ACME : $ACME_EMAIL"
echo "  Répertoire : $APP_DIR"
echo ""

# ── DÉPENDANCES SYSTÈME ─────────────────────────────────────────────────
info "Mise à jour du système..."
apt-get update -qq && apt-get upgrade -y -qq

# Docker (peut être pré-installé sur OVH Debian 12)
if ! command -v docker &>/dev/null; then
  info "Installation de Docker..."
  curl -fsSL https://get.docker.com | sh
else
  info "Docker déjà installé : $(docker --version)"
fi

# Docker Compose plugin
if ! docker compose version &>/dev/null; then
  info "Installation de Docker Compose plugin..."
  apt-get install -y -qq docker-compose-plugin
else
  info "Docker Compose déjà disponible : $(docker compose version)"
fi

# apache2-utils pour htpasswd (dashboard Traefik)
apt-get install -y -qq apache2-utils git

# ── RÉSEAU TRAEFIK ──────────────────────────────────────────────────────
if ! docker network inspect traefik &>/dev/null; then
  info "Création du réseau Docker 'traefik'..."
  docker network create traefik
else
  info "Réseau 'traefik' déjà existant."
fi

# ── RÉPERTOIRE DE L'APPLICATION ─────────────────────────────────────────
info "Déploiement de l'application dans $APP_DIR..."
if [ -d "$APP_DIR/.git" ]; then
  info "Mise à jour du dépôt Git..."
  git -C "$APP_DIR" pull origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$GITHUB_REPO" "$APP_DIR"
fi

# ── GÉNÉRATION DU MOT DE PASSE TRAEFIK ──────────────────────────────────
if [ -z "$TRAEFIK_PASS" ]; then
  TRAEFIK_PASS=$(openssl rand -base64 16)
  warn "Mot de passe Traefik auto-généré : $TRAEFIK_PASS  (notez-le !)"
fi
TRAEFIK_AUTH=$(htpasswd -nb "$TRAEFIK_USER" "$TRAEFIK_PASS")

# ── FICHIER .env TRAEFIK ─────────────────────────────────────────────────
info "Écriture de $APP_DIR/.env.traefik..."
cat > "$APP_DIR/.env.traefik" <<EOF
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL
TRAEFIK_AUTH=$TRAEFIK_AUTH
EOF
chmod 600 "$APP_DIR/.env.traefik"

# ── FICHIER .env APPLICATION ─────────────────────────────────────────────
info "Écriture de $APP_DIR/.env..."
cat > "$APP_DIR/.env" <<EOF
DOMAIN=$DOMAIN
JWT_SECRET=$JWT_SECRET
EOF
chmod 600 "$APP_DIR/.env"

# ── DÉMARRAGE TRAEFIK ────────────────────────────────────────────────────
info "Démarrage de Traefik..."
docker compose \
  -f "$APP_DIR/docker-compose.traefik.yml" \
  --env-file "$APP_DIR/.env.traefik" \
  up -d --remove-orphans

# ── BUILD ET DÉMARRAGE DE L'APPLICATION ──────────────────────────────────
info "Build et démarrage de Easy Packing..."
docker compose \
  -f "$APP_DIR/docker-compose.yml" \
  --env-file "$APP_DIR/.env" \
  up -d --build --remove-orphans

# ── RÉSULTAT ─────────────────────────────────────────────────────────────
echo ""
info "=== Déploiement terminé ! ==="
echo ""
echo "  Application  : https://$DOMAIN"
echo "  Traefik      : https://traefik.$DOMAIN"
echo "  User Traefik : $TRAEFIK_USER / $TRAEFIK_PASS"
echo ""
echo "  JWT_SECRET sauvegardé dans $APP_DIR/.env"
echo ""
info "Statut des conteneurs :"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
