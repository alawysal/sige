#!/bin/sh
set -eu
cd "$(dirname "$0")"
command -v docker >/dev/null 2>&1 || { echo 'Docker não está instalado.' >&2; exit 1; }
docker compose version >/dev/null
[ -f .env.production ] || ./scripts/prepare-production.sh
# Validate silently: rendered Compose configuration contains secrets.
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
if [ -n "$(docker compose --env-file .env.production -f docker-compose.production.yml ps --status running -q mysql)" ]; then
  ./scripts/backup-production.sh
fi
echo 'A iniciar a instalação de produção, com volume independente dos dados locais...'
docker compose --env-file .env.production -f docker-compose.production.yml up --build -d --wait --wait-timeout 300
echo 'Produção iniciada. Acesso inicial: http://127.0.0.1:WEB_PORT/sige (WEB_PORT em .env.production).'
echo 'Conta inicial: admin; senha em ADMIN_PASSWORD de .env.production.'
echo 'Antes do acesso público, configure um proxy HTTPS conforme docs/PRODUCAO.md.'
