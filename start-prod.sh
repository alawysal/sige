#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v docker >/dev/null 2>&1; then
  echo 'Instale/inicie o Docker Desktop antes de continuar.' >&2
  exit 1
fi
if [ ! -f .env ]; then
  cp .env.example .env
  if command -v openssl >/dev/null 2>&1; then
    printf '\nJWT_SECRET=%s\n' "$(openssl rand -base64 48 | tr -d '\n')" >> .env
  fi
fi
docker compose up --build -d --wait --wait-timeout 240
echo 'SIGE Nacional disponível em http://localhost (ou na porta WEB_PORT do .env).'
echo 'Demonstração: admin / admin123. Consulte README.md para os restantes perfis.'
echo 'Logs: docker compose logs -f'
