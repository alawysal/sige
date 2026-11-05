const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.SIGE_TEST_URL||'http://localhost';
(async()=>{
 const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:process.env.SIGE_TEST_USER||'admin',password:process.env.SIGE_TEST_PASSWORD||'admin123'})});
 const {token}=await login.json();assert(token);const headers={'Content-Type':'application/json',Authorization:'Bearer '+token};
 const db=await (await fetch(base+'/api/workspace',{headers})).json();
 const file='artifacts/persistence-record.json';let record;
 if(process.argv[2]==='create'){
  record={...db.alunos[0],IdAluno:'TESTP'+Date.now(),Nome:'Teste de persistência SIGE'};
  const response=await fetch(base+'/api/transactions',{method:'POST',headers,body:JSON.stringify({revision:db.revision,changes:[{module:'alunos',kind:'upsert',id:record.IdAluno,record}]})});assert.equal(response.status,200,await response.text());fs.writeFileSync(file,JSON.stringify({id:record.IdAluno,classes:db.classes}));console.log('Persistence record created.');
 }else{
  const {id,classes}=JSON.parse(fs.readFileSync(file));if(classes)assert.deepEqual(db.classes,classes,'Annual tariffs must survive restart without migration changes');record=db.alunos.find(a=>a.IdAluno===id);assert(record,'Record must survive service restart');
  const response=await fetch(base+'/api/transactions',{method:'POST',headers,body:JSON.stringify({revision:db.revision,changes:[{module:'alunos',kind:'delete',id}]})});assert.equal(response.status,200);console.log('MySQL records and annual tariffs after service restart verified; test record removed.');
 }
})().catch(e=>{console.error(e);process.exit(1);});
