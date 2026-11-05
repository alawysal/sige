function situacaoAluno(id){return DB.resultados?.[String(id)]||null;}
function examField(tipo){return {'Exame Normal':'ExameFinal','Exame de Recurso':'ExameRecurso','Exame Especial':'ExameEspecial','Exame de Acesso':'ExameAcesso'}[tipo]||'ExameFinal';}
function gradeValue(input){const raw=input.value.trim();if(raw==='')return null;const value=Number(raw);if(!Number.isInteger(value)||value<0||value>DB.config.escalaMax)throw new Error('A nota deve ser inteira, entre 0 e '+DB.config.escalaMax+'.');return value;}
function gravarNotas(codTurma,idMat,periodo,validate=false){
 const perKey=periodo.replace(' ','_'),year=getTurma(codTurma).Ano;
 const rows=new Map();
 for(const input of $$('#areaNotas .nota-input')){if(input.disabled)continue;const id=input.dataset.ins;if(!rows.has(id))rows.set(id,{});rows.get(id)[input.dataset.tp]=gradeValue(input);}
 for(const [id,values] of rows){
  if(Object.values(values).every(v=>v===null)&&!getNotaReg(id,idMat,year)){if(validate)throw Error('Preencha e guarde as notas de todos os alunos antes de validar.');continue;}
  let reg=getNotaReg(id,idMat,year);if(!reg)reg=criarNotaReg(id,idMat,year);
  reg[perKey]=values;
  if(session.Perfil==='Professor'){if(validate)reg.SubmitTerm=perKey;else reg.DraftTerm=perKey;}
 }
 saveDB();needsRender=true;toast(session.Perfil==='Professor'?(validate?'Período validado e bloqueado.':'Rascunho guardado. Pode continuar a editar.'):'Notas gravadas.');
}
function validarPeriodo(codTurma,idMat,periodo){confirmar('Validar as notas de todos os alunos neste período? Após a validação, o professor deixa de as poder editar.',()=>gravarNotas(codTurma,idMat,periodo,true),'✓ Validar e bloquear',false);}
function previewExame(input){
 const grade=structuredClone(getNotaReg(input.dataset.ins,state.exame.materia)||{});
 grade[examField(state.exame.tipo)]=gradeValue(input);
 const value=notaFinalComRecurso(grade),cell=input.closest('tr').querySelector('.media-cell');
 cell.innerHTML=value===null?'—':`<b class="${value>=DB.config.notaMinima?'nota-ok':'nota-bad'}">${value}</b>`;
}
function gravarExames(codTurma,idMat,tipo){
 const field=examField(tipo),year=getTurma(codTurma).Ano;
 const values=$$('#areaExames .nota-input').map(input=>({id:input.dataset.ins,value:gradeValue(input)}));
 for(const {id,value} of values){let reg=getNotaReg(id,idMat,year);if(!reg&&value===null)continue;if(!reg)reg=criarNotaReg(id,idMat,year);reg[field]=value;}
 saveDB();needsRender=true;toast('Exames gravados.');
}
function gravarRecursos(codTurma,idMat){
 const year=getTurma(codTurma).Ano;
 const values=$$('#areaRecurso .nota-input').map(input=>({id:input.dataset.ins,value:gradeValue(input)}));
 for(const {id,value} of values){const reg=getNotaReg(id,idMat,year);if(reg)reg.ExameRecurso=value;}
 saveDB();needsRender=true;toast('Recursos gravados.');
}
function recursoElegivel(ins,reg){
 if(!reg)return false;
 const final=notaFinalDisciplina(reg),cls=getClasse(ins.Classe,ins.Ano);
 const complete=['I_Trimestre','II_Trimestre','III_Trimestre'].every(term=>['MAC','NPP','NPT'].every(type=>reg[term]?.[type]!=null))&&(DB.config.pesoExameFinal===0||reg.ExameFinal!=null);
 const subjects=new Set(DB.atribuicoes.filter(a=>a.CodTurma===ins.CodTurma&&a.Ano===ins.Ano).map(a=>String(a.IdMateria)));
 const negative=DB.notas.filter(n=>n.CodInscricao===ins.IdInscricao&&subjects.has(String(n.CodMateria))&&notaFinalDisciplina(n)!=null&&notaFinalDisciplina(n)<DB.config.notaMinima).length;
 return DB.resultados?.[ins.IdInscricao]?.avaliado&&complete&&final!=null&&final<DB.config.notaMinima&&final>=(cls?.NotaRecurso??8)&&negative<=(cls?.NegRecurso??4);
}
function executarRenovacoes(){
 const origin=$('#r_orig').value,destination=$('#r_dest').value;
 if(destination<=origin){toast('O ano de destino deve ser posterior ao ano de origem.','err');return;}
 confirmar('Criar matrículas pendentes dos alunos avaliados e com propinas em dia de <b>'+esc(origin)+'</b> para <b>'+esc(destination)+'</b>? As turmas de destino serão criadas quando necessário.',async()=>{
  DB=await bridge.renew(origin,destination);externalCommit=true;needsRender=true;toast(DB.renovadas+' matrícula(s) pendente(s), a aguardar confirmação.');
 },'▶ Executar');
}
async function importarBD(event){
 const file=event.target.files?.[0];if(!file)return;
 if(file.size>10000000)throw new Error('O backup excede 10 MB.');
 let data;try{data=JSON.parse(await file.text());}catch{throw new Error('Ficheiro JSON inválido.');}
 confirmar('Substituir os dados escolares pelo backup seleccionado? As contas de acesso e a auditoria serão preservadas.',async()=>{DB=await bridge.restore(data);externalCommit=true;needsRender=true;toast('Backup restaurado.');},'Restaurar');
}
function resetBD(){confirmar('Reinicializar os dados escolares de demonstração? Os dados actuais serão substituídos. As contas de acesso serão preservadas.',async()=>{DB=await bridge.reset();externalCommit=true;needsRender=true;toast('Dados de demonstração repostos.');},'♻ Reinicializar');}
function propinasEmDia(student,year){const ins=DB.inscricoes.find(i=>i.CodAluno===student&&i.Ano===year);if(!ins)return false;return DB.elegibilidadeExportacao?.[ins.IdInscricao]?.elegivel||false;}
function alunoAvaliado(id){return DB.elegibilidadeExportacao?.[id]?.elegivel||false;}
async function exportarElegiveisCSV(year){const text=await bridge.exportRenewals(year);const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='renovacoes_'+year.replace('/','_')+'.csv';link.click();globalThis.setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Exportados os alunos elegíveis.');}
function exportarAlunosCSV(){return exportarElegiveisCSV(state.ano_aluno||DB.config.anoActivo);}
function imprimirDividas(year){relPropinas(year);}
function groupStudentTables(root){
 for(const body of root.querySelectorAll('tbody')){
  const rows=[...body.children].filter(row=>row.dataset.enrollment||row.dataset.student);if(!rows.length)continue;
  const grouped=rows.map(row=>{const ins=row.dataset.enrollment?getInsc(row.dataset.enrollment):DB.inscricoes.find(i=>i.CodAluno===row.dataset.student&&i.Ano===DB.config.anoActivo);const label=ins?[getCurso(ins.CodCurso)?.Nome||ins.CodCurso,ins.Classe,'Turma '+ins.CodTurma,ins.Ano].join(' · '):'Sem matrícula no ano activo';return {row,label};}).sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true})||a.row.textContent.localeCompare(b.row.textContent));
  body.querySelectorAll('.sige-group').forEach(row=>row.remove());let last;
  for(const {row,label} of grouped){if(last!==label){const group=document.createElement('tr'),cell=document.createElement('td');group.className='sige-group';cell.colSpan=row.children.length;cell.textContent=label;group.append(cell);body.append(group);last=label;}body.append(row);}
 }
}
const reports={relEstatistico,relFinanceiro,relListaAlunos,relMapaTurmas,relPropinas,relFuncionarios,relMatriculas,relAproveitamento};
return {
 show(view){if(!can(view))view='dashboard';state.view=view;renderView();},
 destroy(){destroyed=true;actions.clear();for(const [type,fn] of Object.entries(handlers))host.removeEventListener(type,fn);host.removeEventListener('keydown',keyboard);}
};
