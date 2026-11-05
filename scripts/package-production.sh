#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p releases
file="releases/sige-initial-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
tar -czf "$file" --exclude='node_modules' --exclude='target' --exclude='.angular' --exclude='.bloop' --exclude='dist' \
 README.md docs deploy docker-compose.production.yml .env.production.example start-prod.sh \
 backend/Dockerfile backend/.dockerignore backend/pom.xml backend/src \
 frontend/Dockerfile frontend/.dockerignore frontend/nginx.conf frontend/package.json frontend/package-lock.json \
 frontend/angular.json frontend/tsconfig.json frontend/tsconfig.app.json frontend/tsconfig.spec.json frontend/proxy.conf.json frontend/src \
 scripts tests
filename=${file#releases/}
if command -v sha256sum >/dev/null 2>&1; then
  (cd releases && sha256sum "$filename" > "$filename.sha256")
elif command -v shasum >/dev/null 2>&1; then
  (cd releases && shasum -a 256 "$filename" > "$filename.sha256")
fi
echo "Pacote criado: $file"
