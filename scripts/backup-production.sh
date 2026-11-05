#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env.production ] || { echo '.env.production em falta.' >&2; exit 1; }
umask 077
out=${1:-backups}
mkdir -p "$out"
temporary=$(mktemp "$out/.sige-backup.XXXXXX")
trap 'rm -f -- "$temporary"' EXIT
file="$out/sige-$(date -u +%Y%m%dT%H%M%SZ)-$$.sql.gz"
docker compose --env-file .env.production -f docker-compose.production.yml exec -T mysql sh -c \
 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump -uroot --single-transaction --routines --events --triggers --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"' | gzip > "$temporary"
gzip -t "$temporary"
mv "$temporary" "$file"
echo "Backup criado: $file"
