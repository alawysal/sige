#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -e .env.production ]; then
  echo '.env.production já existe; foi preservado. Não gere novos segredos para uma base já inicializada.'
  exit 0
fi
command -v openssl >/dev/null 2>&1 || { echo 'É necessário OpenSSL.' >&2; exit 1; }
umask 077
year=$(date +%Y)
month=$(date +%m)
case "$month" in 01|02|03|04|05|06|07|08) year=$((year - 1));; esac
db_secret=$(openssl rand -hex 24)
root_secret=$(openssl rand -hex 24)
jwt_secret=$(openssl rand -base64 48)
admin_secret=$(openssl rand -hex 16)
# noclobber also protects against concurrent invocations.
(set -C; cat > .env.production <<ENV
COMPOSE_PROJECT_NAME=sige-production
RELEASE_TAG=initial
WEB_BIND=127.0.0.1
WEB_PORT=8088
DB_NAME=sige
DB_USERNAME=sige
DB_PASSWORD=$db_secret
DB_ROOT_PASSWORD=$root_secret
JWT_SECRET=$jwt_secret
JWT_EXPIRATION_MS=28800000
ADMIN_PASSWORD=$admin_secret
INITIAL_SCHOOL_YEAR=$year/$((year + 1))
SCHOOL_NAME=Escola por configurar
ENV
)
echo '.env.production criado com permissões restritas e segredos próprios.'
echo 'Reveja SCHOOL_NAME, INITIAL_SCHOOL_YEAR e WEB_PORT. A senha inicial de admin está em ADMIN_PASSWORD.'
echo 'Guarde uma cópia segura deste ficheiro fora do servidor.'
