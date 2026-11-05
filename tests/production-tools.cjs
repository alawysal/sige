const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'sige-production-tools-'));
try{
 const scripts=path.join(temporary,'scripts'),bin=path.join(temporary,'bin');fs.mkdirSync(scripts);fs.mkdirSync(bin);
 for(const file of ['prepare-production.sh','backup-production.sh','restore-production.sh'])fs.copyFileSync(path.join(root,'scripts',file),path.join(scripts,file));
 const prepare=()=>spawnSync('sh',[path.join(scripts,'prepare-production.sh')],{encoding:'utf8'});
 let run=prepare();assert.equal(run.status,0,run.stderr);const config=path.join(temporary,'.env.production'),initial=fs.readFileSync(config,'utf8');
 for(const key of ['ADMIN_PASSWORD','DB_PASSWORD','DB_ROOT_PASSWORD'])assert(initial.match(new RegExp('^'+key+'=([a-f0-9]{32,})$','m')),key);
 assert.equal(fs.statSync(config).mode&0o777,0o600);assert.equal(prepare().status,0);assert.equal(fs.readFileSync(config,'utf8'),initial,'Existing credentials must not change');
 fs.writeFileSync(path.join(bin,'docker'),`#!/bin/bash
set -eu
echo "$*" >> "$MOCK_LOG"
case "$*" in
 *mysqldump*) [ "\${MOCK_DUMP_FAILURE:-0}" != 1 ] || exit 7; printf 'CREATE TABLE backup_test (id INT);\\nINSERT INTO backup_test VALUES (1);\\n';;
 *'exec mysql'*) cat > "$MOCK_IMPORTED"; [ "\${MOCK_IMPORT_FAILURE:-0}" != 1 ] || exit 8;;
esac
`,{mode:0o755});
 const failureRoot=path.join(temporary,'entropy-failure');fs.mkdirSync(path.join(failureRoot,'scripts'),{recursive:true});fs.copyFileSync(path.join(scripts,'prepare-production.sh'),path.join(failureRoot,'scripts','prepare-production.sh'));
 fs.writeFileSync(path.join(bin,'openssl'),'#!/bin/sh\nexit 9\n',{mode:0o755});
 run=spawnSync('sh',[path.join(failureRoot,'scripts','prepare-production.sh')],{env:{...process.env,PATH:bin+path.delimiter+process.env.PATH},encoding:'utf8'});assert.notEqual(run.status,0);assert(!fs.existsSync(path.join(failureRoot,'.env.production')),'Failed entropy generation must not create a partial credentials file');
 const log=path.join(temporary,'commands.log'),imported=path.join(temporary,'imported.sql');
 const env={...process.env,PATH:bin+path.delimiter+process.env.PATH,MOCK_LOG:log,MOCK_IMPORTED:imported};
 const backup=path.join(scripts,'backup-production.sh'),restore=path.join(scripts,'restore-production.sh');
 const successDir=path.join(temporary,'success');run=spawnSync('bash',[backup,successDir],{env,encoding:'utf8'});assert.equal(run.status,0,run.stderr);const file=path.join(successDir,fs.readdirSync(successDir)[0]);assert(file.endsWith('.sql.gz'));assert.equal(fs.statSync(file).mode&0o777,0o600);
 const failedDir=path.join(temporary,'failure');run=spawnSync('bash',[backup,failedDir],{env:{...env,MOCK_DUMP_FAILURE:'1'},encoding:'utf8'});assert.notEqual(run.status,0);assert.equal(fs.readdirSync(failedDir).length,0,'Failed dump must leave no apparently valid backup');
 run=spawnSync('bash',[restore,file],{env,encoding:'utf8'});assert.notEqual(run.status,0,'Restore must require an explicit --confirm');
 fs.writeFileSync(log,'');run=spawnSync('bash',[restore,file,'--confirm'],{env,encoding:'utf8'});assert.equal(run.status,0,run.stderr);assert(fs.readFileSync(imported,'utf8').includes('CREATE TABLE backup_test'));
 let commands=fs.readFileSync(log,'utf8');assert(commands.indexOf('stop frontend backend')<commands.indexOf('mysqldump'));assert(commands.includes('up -d --wait'));
 fs.writeFileSync(log,'');run=spawnSync('bash',[restore,file,'--confirm'],{env:{...env,MOCK_IMPORT_FAILURE:'1'},encoding:'utf8'});assert.notEqual(run.status,0);commands=fs.readFileSync(log,'utf8');assert(!commands.includes('up -d --wait'),'Failed restore must leave the application stopped');
 console.log('Production tools: secret generation, restricted permissions, idempotence, gzip backup, dump/import failure handling and restore confirmation passed with a simulated Docker CLI. Real MySQL restoration is a separate test.');
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
