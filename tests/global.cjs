// Run sequentially: these integration suites share the same workspace revision.
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
const all=['e2e','school-rules','rgb-features','payment-images','schools','swagger','documents-search'];
const requested=process.argv.slice(2);
if(requested.some(suite=>!all.includes(suite)))throw Error('Suite inválida. Opções: '+all.join(', '));
const report=path.join(root,'artifacts','global-results.json');
const results=requested.length&&fs.existsSync(report)?JSON.parse(fs.readFileSync(report,'utf8')).results:[];
for(const suite of requested.length?requested:all){
 console.log('RUN '+suite);
 const started=Date.now();
 const run=spawnSync(process.execPath,[path.join(__dirname,suite+'.cjs')],{cwd:root,encoding:'utf8',env:{...process.env,SIGE_CHECK_MYSQL:'1'},timeout:300000,maxBuffer:10*1024*1024});
 fs.writeFileSync(path.join(root,'artifacts','global-'+suite+'.log'),(run.stdout||'')+(run.stderr||'')+(run.error?'\n'+run.error.message:''));
 const result={suite,passed:run.status===0,seconds:Math.round((Date.now()-started)/1000),exitCode:run.status,date:new Date().toISOString()};const previous=results.findIndex(row=>row.suite===suite);if(previous<0)results.push(result);else results[previous]=result;
 console.log(`${result.passed?'PASS':'FAIL'} ${suite} (${result.seconds}s)`);
 if(!result.passed)console.log((run.stderr||run.stdout||run.error?.message||'').slice(-3000));
}
fs.writeFileSync(path.join(root,'artifacts','global-results.json'),JSON.stringify({date:new Date().toISOString(),results},null,2)+'\n');
if(results.some(r=>!r.passed))process.exitCode=1;
