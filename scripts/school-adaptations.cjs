// Adapt the reference's views to authoritative annual tariffs and server results.
module.exports=source=>{
 const part=(start,end,change)=>{const a=source.indexOf(start),b=source.indexOf(end,a+start.length);if(a<0||b<0)throw new Error('Reference section missing: '+start);source=source.slice(0,a)+change(source.slice(a,b))+source.slice(b);};
 source=source.replace("const getClasse = nomeOrId => typeof nomeOrId==='number' ? DB.classes.find(c=>c.IdClasse===nomeOrId) : DB.classes.find(c=>c.Classe===nomeOrId);",`const getClasse=(nomeOrId,ano=DB.config.anoActivo)=>{const c=typeof nomeOrId==='number'?DB.classes.find(c=>c.IdClasse===nomeOrId):DB.classes.find(c=>c.Classe===nomeOrId);return c?.PorAno?.[ano]?{...c,...c.PorAno[ano]}:null;};`);
 for(const variable of ['ins','i','t'])source=source.replaceAll('getClasse('+variable+'.Classe)','getClasse('+variable+'.Classe,'+variable+'.Ano)');
 source=source.replace("getClasse(cl); if(c && !$('#i_Valor').value)","getClasse(cl,$('#i_Ano').value); if(c)");
 source=source.replace('Valor Pago <span','Taxa de Inscrição <span').replace('Os dados da inscrição devem coincidir com o ano lectivo activo','A inscrição fica pendente até à confirmação da matrícula. Os pagamentos são registados pelo financeiro.');
 source=source.replace("i.Estado!=='Cancelada' && i.Estado!=='Transferido'","i.Estado==='Matriculado'");
 part('function renderExames','function previewExame',s=>s.replace('const nf=notaFinalDisciplina(reg);','const nf=notaFinalComRecurso(reg);'));
 // Both the screen and printed debt report use the same server calculation.
 source=source.replace(/    const anoInfo=DB\.anosLectivos\.find\(a=>a\.Ano===anoFiltro\);[\s\S]*?    const falta=Math\.max\(0, mesesDevidos-propinas\.length\);/g,`    const bill=DB.propinas?.[i.IdInscricao]||{};
    const falta=bill.mesesEmFalta||0;`);
 source=source.replaceAll('valor:falta*cl.Propina','valor:bill.divida||0');
 source=source.replace('function relPropinas(){\n  const anoFiltro=DB.config.anoActivo;', 'function relPropinas(anoFiltro=DB.config.anoActivo){');
 source=source.replaceAll(".concat([DB.config.anoActivo])", ".concat(DB.anosLectivos.map(a=>a.Ano))");
 source=source.replaceAll('const sit=situacaoAluno(x.ins.IdInscricao);','const sit=DB.elegibilidadeExportacao?.[x.ins.IdInscricao]?.resultado||situacaoAluno(x.ins.IdInscricao);');
 source=source.replace('avaliados em todas as disciplinas,','avaliados em todas as disciplinas do ano de origem,').replace('com <b>propinas em dia</b>','com <b>propinas do ano de origem em dia</b>');
 source=source.replace('Alunos <b>aprovados</b> passam à classe seguinte; <b>reprovados</b> repetem.', 'Alunos avaliados e com propinas em dia: <b>aprovados</b> passam à classe seguinte; <b>reprovados</b> repetem. As novas matrículas ficam <b>pendentes</b> até à confirmação pela secretaria.');
 part('VIEWS.classes =','function formClasse',s=>s.replace('  el.innerHTML=',"  const year=state.ano_classe||DB.config.anoActivo;\n  el.innerHTML=").replace('<div class="toolbar"><div class="spacer">','<div class="toolbar"><select id="c_ano" onchange="state.ano_classe=this.value;renderView()">${DB.anosLectivos.map(a=>`<option ${a.Ano===year?\'selected\':\'\'}>${esc(a.Ano)}</option>`).join(\'\')}</select><div class="spacer">').replace('DB.classes.map(c=>`<tr>','DB.classes.map(c=>getClasse(c.IdClasse,year)).filter(Boolean).map(c=>`<tr>'));
 part('function formClasse','function recalcTotalClasse',s=>s.replace('const c=id?getClasse(id):null;',"const year=state.ano_classe||DB.config.anoActivo;\n  const c=id?DB.classes.find(x=>x.IdClasse===id):null;").replace('const d=c||','const d=(c?getClasse(id,year):null)||').replace("size:'lg',", "sub:'Tarifas e regras do ano '+year, size:'lg',").replace('if(c){Object.assign(c,obj);}else DB.classes.push(obj);', `const settings={};for(const key of ['Inscricao','Propina','Duracao','Valor','MaxNegativas','NegRecurso','NotaRecurso'])settings[key]=obj[key];
        if(c){c.Classe=obj.Classe;c.PorAno={...c.PorAno,[year]:settings};toast('Tarifas anuais actualizadas.');}
        else {const existing=DB.classes.find(x=>x.Classe===obj.Classe);if(existing){existing.PorAno={...existing.PorAno,[year]:settings};}else {obj.PorAno={[year]:settings};DB.classes.push(obj);}}`));
 part('function apagarClasse','VIEWS.cursos =',s=>s.replace("DB.classes=DB.classes.filter(c=>c.IdClasse!==id);", "const record=DB.classes.find(c=>c.IdClasse===id);delete record.PorAno[state.ano_classe||DB.config.anoActivo];if(!Object.keys(record.PorAno).length)DB.classes=DB.classes.filter(c=>c.IdClasse!==id);").replace('Eliminar esta classe?', 'Retirar esta classe do ano seleccionado?'));
 // A teacher's view never offers documents containing all subjects.
 for(const fn of ['imprimirFichaAluno','verAluno','imprimirPauta','imprimirPautaGeral','imprimirBoletim','imprimirBoletinsTurma'])source=source.replace(new RegExp('(function '+fn+'\\([^)]*\\)\\{)'),"$1\n if(session.Perfil==='Professor')throw new Error('O professor só pode emitir a ficha da sua disciplina.');");
 source=source.replace('<button class="btn btn-ghost" onclick="exportarAlunosCSV()">⬇ CSV</button>', '${can(\'exportar\')?`<button class="btn btn-ghost" onclick="exportarAlunosCSV()">⬇ CSV</button>`:\'\'}');
 part('VIEWS.alunos =','function formAluno',s=>s.replace('<th>Região</th>','<th>Curso</th>').replace("<td>${esc(a.Regiao||'—')}</td>","<td>${esc(ins?(getCurso(ins.CodCurso)?.Nome||'—'):'—')}</td>").replace('return `<tr>', 'return `<tr data-student="${esc(a.IdAluno)}">'));
 part('VIEWS.inscricoes =','function confirmarInscricao',s=>s.replace('return `<tr>','return `<tr data-enrollment="${i.IdInscricao}">'));
 part('VIEWS.renovacoes =','function proximaClasse',s=>s.replace('return `<tr>','return `<tr data-enrollment="${ins?.IdInscricao||\'\'}">'));
 part('function previewRenovacoes','function executarRenovacoes',s=>s.replace('return `<tr>','return `<tr data-enrollment="${i.IdInscricao}">').replace("\n}\n", "\n  groupStudentTables($('#renPreview'));\n}\n"));
 part('VIEWS.pagamentos =','function formPagamento',s=>s.replace('return `<tr>','return `<tr data-enrollment="${p.CodInscricao}">'));
 part('VIEWS.recibos =','/* --- DÍVIDAS',s=>s.replace('return `<tr>','return `<tr data-enrollment="${p.CodInscricao}">'));
 part('function imprimirListaMatriculas','function imprimirListaFuncionarios',s=>s.replaceAll('DB.config.anoActivo','(state.ano_ins||DB.config.anoActivo)').replace('return `<tr>','return `<tr data-enrollment="${i.IdInscricao}">'));
 part('function imprimirMapaPagamentos','function imprimirComprovativo',s=>s.replace('return `<tr>','return `<tr data-enrollment="${p.CodInscricao}">'));
 part('function imprimirListaAlunos','function imprimirListaTurma',s=>s.replace('if(!ins) return;',"if(!ins||ins.Estado!=='Matriculado') return;").replace('${DB.alunos.length}','${gruposArr.reduce((n,g)=>n+g.alunos.length,0)}'));
 // Remove employee contact details from collective lists, retaining them in individual forms.
 part('VIEWS.funcionarios =','function formFuncionario',s=>s.replace('<th>Contacto</th>','').replace('<td>${esc(f.Movel)}</td>',''));
 source=source.replace("$('#printArea').innerHTML=html;","$('#printArea').innerHTML=html;groupStudentTables($('#printArea'));");
  source=source.replace(/<button class="btn btn-(?:ghost|gold) btn-xs" onclick="(?:verAluno|imprimirFichaAluno)\('[^']*'\)">[^<]*<\/button>/g,button=>"${session.Perfil!=='Professor'?`"+button+"`:''}");
 return source;
};
