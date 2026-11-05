# Preparação para produção — 5 de Novembro de 2026

O pacote de código está preparado para uma primeira instalação independente. O servidor e o domínio ainda não foram escolhidos. Não foi feita publicação na Internet nem migração da base local.

| Verificação | Resultado |
|---|---|
| Java 17, Maven verify | **53 testes passaram**, sem falhas ou erros |
| Inicialização vazia em H2 | Passou: apenas administrador, escola e ano; dados válidos e primeira configuração gravada |
| Novo arranque sobre base inicializada em H2 | Passou: configuração e contas preservadas, sem repor demonstração |
| Reposição de demonstração com DEMO_SEED=false | Rejeitada antes de qualquer acesso à base |
| Renderizador, 29 módulos, pesquisa e histórico | Passou |
| Build Angular de produção | Passou; mantém avisos de tamanho de bundle e CSS |
| Gerador de credenciais | Passou: segredos aleatórios, modo 0600, idempotência e falha sem ficheiro parcial |
| Scripts de backup e reposição com Docker simulado | Passou: gzip válido, erro no dump, confirmação explícita e aplicação parada se a importação falhar |
| Sintaxe dos scripts shell | Passou |
| Conteúdo do pacote e checksum SHA-256 | Verificados ao gerar o arquivo; sem credenciais, base local, backups, dependências ou caches |
| Arranque da stack de produção em Docker e healthchecks | **Pendente** |
| Backup, reposição e reinício reais com MySQL | **Pendente** |

## Limite da validação

O diagnóstico oficial do Docker Desktop mostrou o backend sem resposta e pedidos à API com timeout. O responsável escolheu concluir o pacote com o teste Docker pendente. Não foi feito reset do Docker, apagamento de volumes ou publicação pública.

Os testes H2 e a simulação da CLI verificam a lógica e os caminhos de erro; não comprovam o arranque das imagens, a instalação de dependências no container nem uma recuperação real em MySQL. Complete esse ensaio num ambiente descartável antes de admitir dados reais. Não execute os testes globais de demonstração contra dados de produção.

## Repetir as verificações locais

```bash
mvn -f backend/pom.xml verify
node tests/renderer.test.cjs
node tests/production-tools.cjs
npm run build --prefix frontend
```

Use Java 17 e Node 20. O procedimento de instalação e o ensaio manual de backup/recuperação estão em [PRODUCAO.md](PRODUCAO.md). Os logs de validação desta preparação estão em `artifacts/production-backend-tests.log` e `artifacts/production-frontend-build.log`, fora do pacote.
