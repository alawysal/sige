const SCHOOL_TYPES=['Liceu','Escola Secundária','Escola Técnica','Escola Profissional','Colégio','Instituto Médio','Escola Básica'];
const SCHOOL_CATEGORIES=['Pública','Privada','Particular','Semipública'];
const PROFILE_NAMES={Administrador:'Administrador',Director:'Director',Secretaria:'Secretaria',Financeiro:'Financeiro',Professor:'Professor',Pedagogico:'Pedagógico',Ministerio:'Ministério'};
let schoolLogoTemp=null;
async function exportarBD(){if(session.Perfil!=='Administrador')throw Error('Operação reservada ao administrador.');const data=await bridge.backup(),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='sige_escolas_'+today()+'.json';link.click();globalThis.setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup de todas as escolas exportado.');}
function schoolName(id){return DB.escolas.find(e=>e.CodEscola===id)?.Nome||id||'—';}
function schoolOptions(current,all=false){return (all?'<option value="">Todas as escolas</option>':'<option value="">— Seleccionar escola —</option>')+DB.escolas.map(e=>`<option value="${esc(e.CodEscola)}" ${e.CodEscola===current?'selected':''}>${esc(e.Nome)}</option>`).join('');}
VIEWS.escolas=el=>{
 el.innerHTML=`<div class="toolbar"><div class="spacer"></div><button class="btn btn-primary" onclick="formEscola()">➕ Nova Escola</button></div><div class="card"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Logotipo</th><th>Código</th><th>Escola</th><th>Tipo</th><th>Categoria</th><th>Cidade</th><th>Acções</th></tr></thead><tbody>${DB.escolas.map(e=>`<tr><td>${e.Logo?`<img src="${esc(e.Logo)}" alt="Logotipo" style="width:44px;height:44px;object-fit:contain">`:'🏫'}</td><td>${esc(e.CodEscola)}</td><td>${esc(e.Nome)}</td><td>${esc(e.Tipo)}</td><td>${esc(e.Categoria)}</td><td>${esc(e.Municipio)}</td><td><button class="btn btn-xs btn-ghost" onclick="formEscola('${esc(e.CodEscola)}')">✎ Editar</button></td></tr>`).join('')}</tbody></table></div></div>`;
};
function formEscola(id){
 if(!canEdit('escolas'))throw Error('Operação reservada ao administrador.');
 const original=DB.escolas.find(e=>e.CodEscola===id),school=original||{CodEscola:nextCode(DB.escolas,'CodEscola','ESC'),Tipo:'Liceu',Categoria:'Pública'};schoolLogoTemp=school.Logo||null;
 const field=(label,key)=>`<div class="campo"><label for="e_${key}">${label}</label><input id="e_${key}" value="${esc(school[key]||'')}" ${key==='CodEscola'&&original?'readonly':''}></div>`;
 const options=(values,value)=>values.map(v=>`<option ${v===value?'selected':''}>${esc(v)}</option>`).join('');
 openModal({title:original?'Editar Escola':'Nova Escola',size:'lg',body:`<div class="form-grid g2">${field('Código *','CodEscola')}${field('Nome *','Nome')}<div class="campo"><label>Tipo *</label><select id="e_Tipo">${options(SCHOOL_TYPES,school.Tipo)}</select></div><div class="campo"><label>Categoria *</label><select id="e_Categoria">${options(SCHOOL_CATEGORIES,school.Categoria)}</select></div>${field('NIF','NIF')}${field('Telefone','Telefone')}${field('Endereço','Endereco')}${field('Cidade','Municipio')}${field('Região','Provincia')}${field('Email','Email')}${field('Director','Diretor')}<div class="campo full"><label>Logotipo da Escola</label><div class="logo-prev" id="schoolLogoPreview">${schoolLogoTemp?`<img src="${esc(schoolLogoTemp)}" alt="Logotipo">`:'🏫'}</div><input id="schoolLogoInput" type="file" accept="image/png,image/jpeg"><button class="btn btn-ghost" onclick="schoolLogoTemp=null;$('#schoolLogoInput').value='';$('#schoolLogoPreview').textContent='🏫'">Remover logotipo</button></div></div>`,buttons:[{l:'Cancelar',cls:'btn-ghost',fn:closeModal},{l:'💾 Guardar',cls:'btn-primary',fn:()=>{
  const record={...school};for(const key of ['CodEscola','Nome','Tipo','Categoria','NIF','Telefone','Endereco','Municipio','Provincia','Email','Diretor'])record[key]=$('#e_'+key).value.trim();record.Logo=schoolLogoTemp;
  if(!record.Nome)throw Error('Indique o nome da escola.');if(!original&&DB.escolas.some(e=>e.CodEscola===record.CodEscola))throw Error('Código de escola já utilizado.');
  if(original)Object.assign(original,record);else DB.escolas.push(record);saveDB();closeModal();renderView();toast('Escola guardada.');
 }}]});$('#schoolLogoInput').onchange=e=>runAction(async()=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;schoolLogoTemp=await schoolImage(file);$('#schoolLogoPreview').innerHTML=`<img src="${schoolLogoTemp}" alt="Logotipo">`;});
}
function formUsuario(id){
 if(!canEdit('usuarios'))throw Error('Operação reservada ao administrador.');
 const original=DB.usuarios.find(u=>u.IdUsuario===id),user=original||{Perfil:'Secretaria',Ativo:'Sim',CodEscola:DB.scope.schoolId};
 openModal({title:original?'Editar Utilizador':'Novo Utilizador',size:'lg',body:`<div class="form-grid g2"><div class="campo"><label>Utilizador *</label><input id="u_Usuario" value="${esc(user.Usuario||'')}" ${original?'readonly':''}></div><div class="campo"><label>${original?'Nova palavra-passe (opcional)':'Palavra-passe *'}</label><input type="password" id="u_Senha" autocomplete="new-password"></div><div class="campo span2"><label>Nome *</label><input id="u_Nome" value="${esc(user.Nome||'')}"></div><div class="campo"><label>Perfil *</label><select id="u_Perfil" onchange="updateUserSchool()">${Object.entries(PROFILE_NAMES).map(([value,label])=>`<option value="${value}" ${user.Perfil===value?'selected':''}>${label}</option>`).join('')}</select></div><div class="campo"><label>Estado</label><select id="u_Ativo"><option value="Sim" ${user.Ativo==='Sim'?'selected':''}>Activo</option><option value="Não" ${user.Ativo==='Não'?'selected':''}>Inactivo</option></select></div><div class="campo span2"><label>Escola *</label><select id="u_Escola" onchange="updateUserEmployee()">${schoolOptions(user.CodEscola)}</select></div><div class="campo span2"><label>Funcionário (obrigatório para professor)</label><select id="u_Func"></select></div></div><div class="info-box mt">Ministério: consulta de estatísticas e documentos de todas as escolas. Pedagógico: exames, notas e atribuições da sua escola. Os restantes perfis têm acesso apenas à escola atribuída.</div>`,buttons:[{l:'Cancelar',cls:'btn-ghost',fn:closeModal},{l:'💾 Guardar',cls:'btn-primary',fn:()=>{
  const value=id=>$('#u_'+id).value.trim();const record={IdUsuario:original?original.IdUsuario:nextId(DB.usuarios,'IdUsuario'),Usuario:value('Usuario'),Nome:value('Nome'),Perfil:value('Perfil'),Ativo:value('Ativo'),CodEscola:value('Escola'),CodFuncionario:value('Func'),Senha:value('Senha')};
  if(!record.Usuario||!record.Nome||(!original&&!record.Senha))throw Error('Preencha os campos obrigatórios.');if(!['Administrador','Ministerio'].includes(record.Perfil)&&!record.CodEscola)throw Error('Atribua uma escola ao utilizador.');
  if(original)Object.assign(original,record);else DB.usuarios.push(record);saveDB();closeModal();renderView();toast('Utilizador guardado.');
 }}]});updateUserSchool();$('#u_Func').value=user.CodFuncionario||'';
}
function updateUserEmployee(){const school=$('#u_Escola').value,staff=DB.scope.staff||DB.funcionarios;$('#u_Func').innerHTML='<option value="">—</option>'+staff.filter(f=>!school||f.CodEscola===school).map(f=>`<option value="${esc(f.IdFuncionario)}">${esc(f.Nome)}</option>`).join('');}
function updateUserSchool(){const global=['Administrador','Ministerio'].includes($('#u_Perfil').value);$('#u_Escola').required=!global;updateUserEmployee();}
function studentDetails(student,print=false){
 const fields=[['Escola',schoolName(student.CodEscola)],['Estado',student.Estado],['Nascimento',dt(student.DataNa)],['Naturalidade',student.Natural],['Sector',student.Sector],['Morada',student.Morada],['Emissão do documento',dt(student.DocEmissao)],['Pai',student.Pai],['Profissão do pai',student.PaiProfissao],['Mãe',student.Mae],['Profissão da mãe',student.MaeProfissao],['Encarregado',student.Encarregado],['Parentesco',student.Parentesco],['Telemóvel 1',student.Movel1],['Telemóvel 2',student.Movel2],['Escola anterior',student.EscolaAnterior],['Anexos entregues',(student.AnexosList||[]).join(', ')]];
 if(print){
  const cell=field=>field?`<th scope="row">${esc(field[0])}</th><td>${esc(field[1]||'—')}</td>`:'<td colspan="2"></td>';
  const rows=[];for(let i=0;i<fields.length;i+=2)rows.push(`<tr>${cell(fields[i])}${cell(fields[i+1])}</tr>`);
  return `<section class="student-details-report"><h3>Dados pessoais e familiares</h3><table class="student-details-print"><colgroup><col class="detail-label"><col class="detail-value"><col class="detail-label"><col class="detail-value"></colgroup><tbody>${rows.join('')}</tbody></table></section>`;
 }
 return `<div class="form-grid g2 mt student-details">${fields.map(([label,value])=>`<div class="campo"><label>${esc(label)}</label><div>${esc(value||'—')}</div></div>`).join('')}</div>`;
}
function statistics(){
 const year=state.statsYear||DB.config.anoActivo;
 return DB.escolas.filter(s=>!DB.scope.schoolId||s.CodEscola===DB.scope.schoolId).map(s=>{const inscriptions=DB.inscricoes.filter(i=>i.CodEscola===s.CodEscola&&i.Ano===year),students=DB.alunos.filter(a=>a.CodEscola===s.CodEscola),confirmed=inscriptions.filter(i=>i.Estado==='Matriculado');return {school:s.Nome,code:s.CodEscola,type:s.Tipo,category:s.Categoria,year,students:students.length,enrolled:confirmed.length,pending:inscriptions.filter(i=>i.Estado==='Pendente').length,female:confirmed.filter(i=>getAluno(i.CodAluno)?.Sexo==='F').length,male:confirmed.filter(i=>getAluno(i.CodAluno)?.Sexo==='M').length,passed:inscriptions.filter(i=>DB.resultados?.[i.IdInscricao]?.situacao==='Aprovado').length,documents:DB.documentosEmitidos.filter(d=>d.CodEscola===s.CodEscola&&d.Ano===year).length};});
}
function statisticsPanel(){
 const rows=statistics();return `<div class="card"><div class="card-head"><h2>Estatísticas por Escola</h2><button class="btn btn-ghost" onclick="exportStatistics()">⬇ Exportar Estatísticas</button></div><div class="card-body">${yearSelect('statsYear',state.statsYear||DB.config.anoActivo,'statsYear')}<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Escola</th><th>Tipo</th><th>Categoria</th><th>Alunos</th><th>Matriculados</th><th>Pendentes</th><th>F</th><th>M</th><th>Aprovados</th><th>Documentos</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.school)}</td><td>${esc(r.type)}</td><td>${esc(r.category)}</td><td>${r.students}</td><td>${r.enrolled}</td><td>${r.pending}</td><td>${r.female}</td><td>${r.male}</td><td>${r.passed}</td><td>${r.documents}</td></tr>`).join('')}</tbody></table></div></div></div>`;
}
function exportStatistics(){const rows=statistics(),keys=['school','type','category','year','students','enrolled','pending','female','male','passed','documents'];const cell=value=>'"'+String(value??'').replace(/^[=+@-]/,c=>"'"+c).replace(/"/g,'""')+'"';const csv='\ufeffEscola;Tipo;Categoria;Ano;Alunos;Matriculados;Pendentes;F;M;Aprovados;Documentos\r\n'+rows.map(r=>keys.map(k=>cell(r[k])).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='estatisticas-escolas.csv';link.click();globalThis.setTimeout(()=>URL.revokeObjectURL(url),1000);}
const schoolDashboard=VIEWS.dashboard,schoolReports=VIEWS.relatorios,schoolDocuments=VIEWS.documentos;
VIEWS.dashboard=el=>{schoolDashboard(el);if(DB.scope.global)el.innerHTML+=statisticsPanel();};
VIEWS.relatorios=el=>{if(session.Perfil==='Ministerio'||!DB.scope.schoolId){el.innerHTML=statisticsPanel();return;}schoolReports(el);};
VIEWS.documentos=el=>{
 if(session.Perfil!=='Ministerio'&&DB.scope.schoolId){schoolDocuments(el);el.innerHTML=documentStudentSearch()+el.innerHTML;return;}
 const year=state.docYear||DB.config.anoActivo,records=DB.documentosEmitidos.filter(d=>d.Ano===year&&matchesDocumentStudent(getAluno(d.CodAluno),state.documentSearch));
 el.innerHTML=`<div class="info-box">Consulta dos documentos oficiais emitidos. A emissão, as matrículas, os pagamentos e as notas são geridos pelos perfis autorizados da escola.</div><div class="toolbar">${yearSelect('docYear',year,'docYear')}</div>${documentStudentSearch()}<div class="card"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Nº</th><th>Escola</th><th>Aluno</th><th>Documento</th><th>Ano</th><th>Data</th><th>Emissor</th><th>Consulta</th></tr></thead><tbody>${records.map(d=>`<tr><td>${esc(d.Id)}</td><td>${esc(schoolName(d.CodEscola))}</td><td>${esc(getAluno(d.CodAluno)?.Nome||'—')}</td><td>${esc(d.Tipo)}</td><td>${esc(d.Ano)}</td><td>${dt(d.Data)}</td><td>${esc(d.Usuario)}</td><td><button class="btn btn-ghost btn-xs" onclick="viewOfficialRecord('${esc(d.Id)}')">Consultar</button></td></tr>`).join('')||`<tr><td colspan="8">${state.documentSearch?'Nenhum documento encontrado para este aluno.':'Sem documentos emitidos neste ano.'}</td></tr>`}</tbody></table></div></div>`;
};
function viewOfficialRecord(id){const document=DB.documentosEmitidos.find(d=>String(d.Id)===String(id));if(!document)return;const student=getAluno(document.CodAluno),school=DB.escolas.find(s=>s.CodEscola===document.CodEscola);openModal({title:'Registo de Documento Oficial',size:'lg',body:`${school?.Logo?`<img src="${esc(school.Logo)}" alt="Logotipo" style="height:72px;max-width:180px;object-fit:contain">`:''}<h3>${esc(school?.Nome)}</h3><div class="form-grid g2"><div><b>Nº:</b> ${esc(document.Id)}</div><div><b>Tipo:</b> ${esc(document.Tipo)}</div><div><b>Ano:</b> ${esc(document.Ano)}</div><div><b>Data:</b> ${dt(document.Data)}</div><div><b>Emissor:</b> ${esc(document.Usuario)}</div><div><b>Aluno:</b> ${esc(student?.Nome)}</div><div><b>Nascimento:</b> ${dt(student?.DataNa)}</div><div><b>Naturalidade:</b> ${esc(student?.Natural)}</div><div><b>Região:</b> ${esc(student?.Regiao)}</div><div><b>Pai:</b> ${esc(student?.Pai)}</div><div><b>Mãe:</b> ${esc(student?.Mae)}</div></div>`,buttons:[{l:'Fechar',cls:'btn-ghost',fn:closeModal}]});}

// Ministry consultation spans the schools selected in the workspace, without edit actions.
const schoolStudents=VIEWS.alunos;
VIEWS.alunos=el=>{
 if(session.Perfil!=='Ministerio'){schoolStudents(el);return;}
 const query=(state.filtro_alunos||'').trim().toLocaleLowerCase('pt');
 const students=DB.alunos.filter(a=>[a.Nome,a.IdAluno,schoolName(a.CodEscola)].some(value=>String(value||'').toLocaleLowerCase('pt').includes(query))).sort((a,b)=>a.Nome.localeCompare(b.Nome));
 el.innerHTML=`<div class="info-box">Consulta de alunos do Ministério. Seleccione uma escola no topo para limitar a pesquisa.</div><div class="toolbar"><input class="search" id="qAluno" type="search" aria-label="Pesquisar aluno por nome, número de processo ou escola" placeholder="Nome, nº de processo ou escola…" value="${esc(state.filtro_alunos||'')}" oninput="state.filtro_alunos=element.value;renderView()"><span>${students.length} aluno(s)</span></div><div class="card"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Nº Processo</th><th>Nome</th><th>Escola</th><th>Estado</th><th>Consulta</th></tr></thead><tbody>${students.map(a=>`<tr><td>${esc(a.IdAluno)}</td><td>${esc(a.Nome)}</td><td>${esc(schoolName(a.CodEscola))}</td><td>${esc(a.Estado||'—')}</td><td><button class="btn btn-ghost btn-xs" onclick="verAluno('${esc(a.IdAluno)}')">Consultar ficha</button></td></tr>`).join('')||'<tr><td colspan="5">Nenhum aluno encontrado.</td></tr>'}</tbody></table></div></div>`;
};
function studentAcademicHistory(id,print=false){
 const enrollments=DB.inscricoes.filter(i=>String(i.CodAluno)===String(id)).slice().sort((a,b)=>String(a.Ano).localeCompare(String(b.Ano)));
 const tableClass=print?'prt-tabela':'tabela';
 const value=n=>n==null?'—':esc(n);
 return `<section class="academic-history"><h3>Histórico Escolar</h3>${enrollments.length?enrollments.map(ins=>{
  const result=situacaoAluno(ins.IdInscricao);
  const subjects=new Set(DB.atribuicoes.filter(a=>a.CodTurma===ins.CodTurma&&a.Ano===ins.Ano).map(a=>String(a.IdMateria)));
  const grades=DB.notas.filter(n=>String(n.CodInscricao)===String(ins.IdInscricao)&&n.Ano===ins.Ano);
  grades.forEach(n=>subjects.add(String(n.CodMateria)));
  return `<h4>${esc(ins.Ano)} · ${esc(ins.Classe)} · ${esc(schoolName(ins.CodEscola))}</h4><p>Resultado: ${esc(result?.situacao||'Em curso')} · Média geral${result?.avaliado?'':' (parcial)'}: ${value(result?.mediaGeral)}</p><div class="tabela-wrap"><table class="${tableClass}"><thead><tr><th>Disciplina</th><th>I Trim.</th><th>II Trim.</th><th>III Trim.</th><th>Exame</th><th>Recurso</th><th>Média final / parcial</th></tr></thead><tbody>${[...subjects].map(subject=>{
   const grade=grades.find(n=>String(n.CodMateria)===subject);
   const name=DB.materias.find(m=>String(m.IdMateria)===subject)?.Materia||subject;
   return `<tr><td>${esc(name)}</td>${['I_Trimestre','II_Trimestre','III_Trimestre'].map(term=>`<td>${value(grade?mediaTrimestre(grade,term):null)}</td>`).join('')}<td>${value(grade?.ExameFinal)}</td><td>${value(grade?.ExameRecurso)}</td><td>${value(grade?notaFinalComRecurso(grade):null)}${grade&&!(['I_Trimestre','II_Trimestre','III_Trimestre'].every(term=>['MAC','NPP','NPT'].every(type=>grade[term]?.[type]!=null))&&((DB.config.pesoExameFinal??0.3)===0||grade.ExameFinal!=null))?' (parcial)':''}</td></tr>`;
  }).join('')||'<tr><td colspan="7">Sem disciplinas ou notas registadas.</td></tr>'}</tbody></table></div>`;
 }).join(''):'<p>Sem matrículas registadas.</p>'}</section>`;
}

function matchesDocumentStudent(student,query=''){
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt');
 const text=normalize([student?.Nome,student?.IdAluno,schoolName(student?.CodEscola)].join(' '));
 return normalize(query).trim().split(/\s+/).every(term=>text.includes(term));
}
function documentStudentSearch(){
 return `<div class="toolbar"><div class="campo document-student-search"><label for="qDocumentoAluno">Pesquisar aluno</label><input id="qDocumentoAluno" type="search" placeholder="Nome ou nº de processo…" value="${esc(state.documentSearch||'')}" oninput="state.documentSearch=element.value;renderView()"></div></div>`;
}
