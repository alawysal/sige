# Frontend SIGE Nacional

Angular 16 e Bootstrap 5, com o design de `../0001_promax.html` preservado.

```bash
npm ci
npm start
```

Abra `http://localhost:4201`. O backend deve estar disponível na porta 8080; `proxy.conf.json` encaminha os pedidos `/api`.

```bash
npm run build
npm test
npm run test:unit
```

A sessão e as chamadas à API estão em `src/app/core`. O componente principal contém o login e a estrutura de navegação Angular. As 25 vistas e os impressos são gerados do HTML original por `../scripts/build-promax.cjs`, com eventos convertidos em callbacks e gravações confirmadas pelo servidor.

Para regenerar, execute `node scripts/build-promax.cjs` na raiz do projecto. Não edite directamente `src/app/promax/promax-renderer.js`; altere o gerador ou os adaptadores `scripts/renderer-*.js`.

Consulte [o README principal](../README.md) para Docker, credenciais de demonstração, permissões e configuração MySQL.
