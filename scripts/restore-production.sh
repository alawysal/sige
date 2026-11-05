#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$#" -ne 2 ] || [ "$2" != --confirm ]; then
 echo 'Uso: ./scripts/restore-production.sh backups/ficheiro.sql.gz --confirm' >&2
 echo 'Substitui a base de produção. Interrompe os serviços e guarda primeiro um backup do estado actual.' >&2
 exit 1
fi
file=$1
[ -f "$file" ] || { echo 'Backup não encontrado.' >&2; exit 1; }
gzip -t "$file"
compose=(docker compose --env-file .env.production -f docker-compose.production.yml)
"${compose[@]}" stop frontend backend
./scripts/backup-production.sh
# Leave the application stopped if import fails, rather than exposing a partial database.
gzip -dc "$file" | "${compose[@]}" exec -T mysql sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysql -uroot "$MYSQL_DATABASE"'
"${compose[@]}" up -d --wait --wait-timeout 300 frontend
echo 'Backup reposto e aplicação novamente disponível.'
