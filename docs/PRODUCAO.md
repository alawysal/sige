# Primeira instalação em produção

Esta versão fornece uma instalação Docker independente da demonstração local. Como ainda não há servidor nem domínio definidos, o acesso inicial fica limitado a `127.0.0.1:8088`. Não publica uma aplicação na Internet automaticamente.

## Instalar o pacote

Requisitos no servidor: Docker com Compose v2, OpenSSL, Bash, tar e gzip. Node e Java não são necessários no servidor: as imagens compilam a aplicação e executam os testes Java. O primeiro build precisa de acesso à Internet para obter imagens e dependências.

```bash
tar -xzf sige-initial-*.tar.gz -C /caminho/da/instalacao
cd /caminho/da/instalacao
./scripts/prepare-production.sh
# Editar .env.production para rever SCHOOL_NAME, INITIAL_SCHOOL_YEAR e WEB_PORT.
./start-prod.sh
```

Abra `http://127.0.0.1:8088/sige`. A conta inicial é `admin`; a senha aleatória está em `ADMIN_PASSWORD` no ficheiro `.env.production`. O script não imprime a senha. Guarde o ficheiro de configuração numa localização segura, separado do backup SQL. Não o envie por email nem o adicione ao Git.

O gerador não substitui um `.env.production` existente. Mudar uma senha MySQL nesse ficheiro **não** muda a senha de uma base já inicializada. A senha inicial de administrador também só é usada numa base nova; as mudanças seguintes devem ser feitas na gestão de utilizadores.

## O que é criado

- Uma conta de administrador com a senha definida para essa instalação.
- Uma escola, com o nome escolhido em `SCHOOL_NAME` e contactos por preencher.
- O ano lectivo indicado em `INITIAL_SCHOOL_YEAR`.
- Nenhum aluno, funcionário, matrícula, nota, pagamento ou conta de demonstração.
- Classes, cursos, matérias e tarifas vazios, para configuração pela escola.

As datas iniciais do ano são 1 de Setembro e 31 de Agosto do ano seguinte. Reveja-as antes de começar a matricular alunos. A geração automática do ficheiro sugere o ano conforme essa convenção; pode alterá-lo antes da primeira inicialização.

No primeiro acesso, configure: identificação e logotipo da escola; datas do ano lectivo; cursos, classes e tarifas em FCFA; matérias; funcionários e contas com as respectivas escolas e perfis; turmas e atribuições. Crie uma segunda conta de administração controlada pela escola e guarde as credenciais de recuperação em local seguro.

## Separação da demonstração

Use **apenas** `docker-compose.production.yml` com `--env-file .env.production` para produção. O `docker-compose.yml` original e o seu `.env` continuam destinados à instalação local existente.

O projecto Compose de produção chama-se `sige-production`; o seu volume é independente do volume local. Não reutilize o nome do projecto local nem os seus volumes. A configuração desactiva a demonstração e o Swagger, e bloqueia a reposição de dados fictícios pela API e pelo ecrã de configurações.

Se a escola quiser aproveitar dados existentes, faça uma migração planeada com backup e revisão de contas. A primeira instalação limpa não copia a base local nem elimina os seus dados.

## Rede e HTTPS

Somente o frontend publica uma porta, limitada ao endereço local do servidor. A API e o MySQL ficam na rede interna do Compose. O backend executa como utilizador sem privilégios; os logs têm rotação e os serviços têm verificações de saúde.

Quando escolher o servidor e o domínio, configure o proxy HTTPS da infraestrutura para encaminhar o domínio para `http://127.0.0.1:8088`, com certificado válido e renovação automática. Mantenha `WEB_BIND=127.0.0.1` quando o proxy estiver no mesmo servidor. Se o proxy estiver noutra máquina ou container, ajuste a ligação na rede privada e a firewall para permitir apenas esse proxy. Não exponha a porta 8088 directamente na Internet.

Para trabalhar remotamente antes de configurar o domínio, pode encaminhar a porta através de SSH:

```bash
ssh -L 8088:127.0.0.1:8088 utilizador@servidor
```

Depois abra `http://127.0.0.1:8088/sige` no computador que abriu o túnel. Para uma rede interna da escola, use igualmente HTTPS antes de introduzir credenciais ou dados reais através da rede.

## Operar

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail 100 backend
curl --fail http://127.0.0.1:8088/api/health
```

Para parar, conservando os dados:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml down
```

Não utilize `down -v`: remove o volume da base. Não execute `docker compose config` sem `--quiet` em logs partilhados, pois a saída contém os segredos resolvidos.

## Backup e recuperação

```bash
./scripts/backup-production.sh
# Ou escolher um directório de backup:
./scripts/backup-production.sh /destino/seguro
```

O backup SQL comprimido inclui contas, senhas cifradas por hash, auditoria, fotografias, documentos e dados escolares guardados na base. O script só anuncia sucesso após validar o gzip e termina com erro se o dump falhar. Os ficheiros ficam acessíveis apenas ao utilizador que executou o comando. Copie-os para fora do servidor e proteja-os como dados escolares.

Exemplo de agendamento diário em Linux, executado pelo utilizador responsável pela instalação e autorizado a usar Docker:

```cron
15 2 * * * cd /opt/sige && ./scripts/backup-production.sh /backup/sige >> /backup/sige-backup.log 2>&1
```

Adapte os caminhos, fuso horário, destino e retenção. O script não apaga backups antigos automaticamente. Monitorize falhas do agendamento e teste periodicamente a recuperação numa instalação separada.

Para repor um backup **na instalação seleccionada por `.env.production`**:

```bash
./scripts/restore-production.sh backups/sige-DATA.sql.gz --confirm
```

A reposição substitui os dados: primeiro pára frontend e backend, cria um backup do estado anterior e importa o SQL. Só volta a iniciar a aplicação se a importação terminar sem erro. Se falhar, os serviços de aplicação permanecem parados para evitar utilização de uma base parcialmente restaurada. Verifique o erro, o espaço livre e o backup; repita a recuperação antes de retomar o serviço.

O backup JSON da aplicação não substitui o SQL: não inclui as senhas das contas. O `.env.production` também precisa de uma cópia segura separada, para conservar as credenciais da base e a chave JWT.

## Actualizar ou voltar à versão anterior

1. Guarde o pacote da versão em funcionamento e um backup SQL recente.
2. Copie a nova versão preservando `.env.production`, `backups/` e o volume Docker.
3. Execute `./start-prod.sh`. Quando detecta o MySQL de produção em execução, guarda um backup antes de actualizar. Se a base estiver parada, inicie apenas o MySQL e faça o backup manual antes da actualização.
4. Confirme a saúde dos serviços e o login.

Migrações de base de dados podem impedir o uso de uma versão antiga. Para regressar, use o pacote anterior **com o backup SQL correspondente**, seguindo a recuperação acima. Não apague ou edite entradas do histórico Flyway para contornar uma falha.

## Validação desta preparação

Os testes e os limites da validação estão em [VALIDACAO-PRODUCAO.md](VALIDACAO-PRODUCAO.md). O teste real da stack Docker e da recuperação MySQL permanece pendente porque o motor Docker desta máquina não respondeu; por decisão do responsável, o pacote foi concluído com essa verificação pendente. O ensaio local H2 e os testes dos scripts não substituem esse teste.

Antes de utilizar dados reais, num ambiente descartável com Docker funcional, confirme: criação apenas da conta admin e da escola inicial; login; configuração da escola; backup; reposição; persistência após reinício. Use os segredos de teste dessa instalação. Não execute os testes globais da demonstração contra uma base de produção com dados reais.

## Conteúdo do pacote

```bash
./scripts/package-production.sh
```

O pacote em `releases/` contém o código, configuração de exemplo, migrações, testes e instruções. Não contém os segredos locais, a base de dados, backups, fotografias reais, PDFs gerados, dependências instaladas ou caches. Cada servidor deve gerar as suas próprias credenciais. O ficheiro `.sha256` junto do pacote permite verificar a integridade com `sha256sum -c ficheiro.tar.gz.sha256` (Linux) ou `shasum -a 256 -c ficheiro.tar.gz.sha256` (macOS), na pasta do pacote.

O frontend actual usa `frontend/src/app/promax/promax-renderer.js`. Os antigos HTML de referência já não estão nesta pasta; o build de produção não depende deles. Os scripts históricos de regeneração só devem ser usados se essas fontes originais forem repostas.
