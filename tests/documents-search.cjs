const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.SIGE_TEST_URL||'http://localhost';
let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];
 async function session(ministry=false){
  const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/workspace',async route=>{
   const response=await route.fetch();const data=await response.json(),year=data.config.anoActivo;
   const students=data.alunos.slice(0,2);students[0].Nome='Aluno Ágata Teste';students[1].Nome='Aluno Bernardo Teste';
   data.elegibilidadeDocumentos={};students.forEach((student,index)=>{
    const enrollment={...data.inscricoes[0],IdInscricao:'SEARCH'+index,CodAluno:student.IdAluno,Ano:year};
    data.inscricoes=data.inscricoes.filter(i=>i.CodAluno!==student.IdAluno);data.inscricoes.push(enrollment);data.elegibilidadeDocumentos[enrollment.IdInscricao]={elegivel:true};
   });
   if(ministry){data.session.Perfil='Ministerio';data.scope.global=true;data.scope.schoolId='';data.documentosEmitidos=students.map((student,index)=>({Id:'DOCSEARCH'+index,CodAluno:student.IdAluno,CodEscola:student.CodEscola,Ano:year,Tipo:'certificado-freq',Data:'2026-10-31',Usuario:'Teste'}));}
   await route.fulfill({response,json:data});
  });
  await page.route('**/api/transactions',route=>{assert.fail('Search must not write school data');});
  await page.goto(base+'/sige');await page.locator('#lgUser').fill(process.env.SIGE_TEST_USER||'admin');await page.locator('#lgPass').fill(process.env.SIGE_TEST_PASSWORD||'admin123');await page.locator('.btn-login').click();await page.waitForURL('**/sige/app/dashboard');await page.locator('#nav a[href="/sige/app/documentos"]').click();
  return page;
 }
 const page=await session();assert.equal(await page.locator('#doc_aluno option').count(),2);
 await page.locator('#qDocumentoAluno').fill('agata');assert.equal(await page.locator('#doc_aluno option').count(),1);assert((await page.locator('#doc_aluno').innerText()).includes('Ágata'));
 const id=await page.locator('#doc_aluno').inputValue();await page.locator('#qDocumentoAluno').fill(id);assert.equal(await page.locator('#doc_aluno option').count(),1);
 await page.locator('#qDocumentoAluno').fill('sem-correspondencia');assert.equal(await page.locator('#doc_aluno').count(),0);assert((await page.locator('#view').innerText()).includes('Nenhum aluno encontrado.'));assert(await page.locator('#qDocumentoAluno').isVisible());
 await page.locator('#qDocumentoAluno').fill('');assert.equal(await page.locator('#doc_aluno option').count(),2);await page.locator('#doc_aluno').selectOption({index:1});const selected=await page.locator('#doc_aluno').inputValue();await page.locator('#qDocumentoAluno').fill('Aluno');assert.equal(await page.locator('#doc_aluno').inputValue(),selected);
 const ministry=await session(true);await ministry.locator('#qDocumentoAluno').fill('bernardo');assert.equal(await ministry.locator('#view tbody tr').count(),1);assert((await ministry.locator('#view tbody').innerText()).includes('Bernardo'));
 await ministry.locator('#qDocumentoAluno').fill('sem-correspondencia');assert((await ministry.locator('#view tbody').innerText()).includes('Nenhum documento encontrado'));assert.deepEqual(errors,[]);
 console.log('Official documents: eligible students only; name, accent-insensitive and ID search; empty results; selection preserved; ministry document filtering; no writes.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
