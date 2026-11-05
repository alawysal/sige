let fotoTemp=null;
function yearSelect(id,value,key){return `<select id="${id}" aria-label="Ano lectivo" onchange="state['${key}']=this.value;renderView()">${DB.anosLectivos.map(y=>`<option value="${esc(y.Ano)}" ${y.Ano===value?'selected':''}>${esc(y.Ano)}</option>`).join('')}</select>`;}
async function schoolImage(file){
 if(!['image/png','image/jpeg'].includes(file.type)||file.size>5*1024*1024)throw Error('Escolha uma imagem PNG ou JPEG até 5 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>20000000)throw Error('A imagem tem dimensões demasiado grandes.');
  const canvas=document.createElement('canvas'),ratio=Math.min(1,640/Math.max(bitmap.width,bitmap.height));canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
  const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/jpeg',.82);if(data.length>350000)throw Error('Imagem demasiado grande. Escolha uma imagem mais simples.');return data;
 }finally{bitmap.close();}
}
function preserveConfigInputs(){
 const inputs=$$('input[id^="cfg_"]').map(e=>[e.id,e.value]);
 effects.push(()=>queueMicrotask(()=>{if(destroyed||state.view!=='config')return;for(const [id,value] of inputs){const input=$('#'+id);if(input)input.value=value;}}));
}
async function guardarLogotipo(file){
 const logo=await schoolImage(file);preserveConfigInputs();DB.config.logo=logo;saveDB();toast('Logotipo guardado.');
}
function removerLogo(){preserveConfigInputs();DB.config.logo=null;saveDB();toast('Logotipo removido.');}
function removerFotoAluno(){fotoTemp=null;$('#inpFotoAluno').value='';$('#prevFotoBox').innerHTML='<span class="ph">📷</span><span class="lbl">Carregar Foto</span>';}
function semDividaPropinas(id){const ins=DB.inscricoes.find(i=>i.CodAluno===id&&i.Ano===DB.config.anoActivo);return !!DB.propinas?.[ins?.IdInscricao]?.emDia;}
function aptoDocumentosOficiais(id){const ins=DB.inscricoes.find(i=>i.CodAluno===id&&i.Ano===DB.config.anoActivo);return !!DB.elegibilidadeDocumentos?.[ins?.IdInscricao]?.elegivel;}
function alunosAptoExportacao(){return DB.inscricoes.filter(i=>i.Ano===(state.ano_export||DB.config.anoActivo)&&DB.elegibilidadeExportacao?.[i.IdInscricao]?.elegivel).map(ins=>({ins,aluno:getAluno(ins.CodAluno)})).filter(x=>x.aluno);}
async function executarExportacao(){return exportarElegiveisCSV(state.ano_export||DB.config.anoActivo);}
function paymentsForYear(year){return DB.pagamentos.filter(p=>getInsc(p.CodInscricao)?.Ano===year);}
function paymentStudentPicker(){
 const year=state.ano_pag||DB.config.anoActivo;
 const enrolled=DB.inscricoes.filter(i=>i.Ano===year).sort((a,b)=>(getAluno(a.CodAluno)?.Nome||'').localeCompare(getAluno(b.CodAluno)?.Nome||''));
 return `<div class="card"><div class="card-body"><div class="toolbar"><label for="pg_aluno">Pagamentos individuais</label><select id="pg_aluno"><option value="">— Seleccionar aluno —</option>${enrolled.map(i=>`<option value="${esc(i.CodAluno)}">${esc(getAluno(i.CodAluno)?.Nome)} · ${esc(i.Classe)} · ${esc(i.CodTurma)}</option>`).join('')}</select><button class="btn btn-gold" onclick="if(!$('#pg_aluno').value)throw Error('Seleccione um aluno.');imprimirTodosPagamentosAluno($('#pg_aluno').value)">🖨 Lista de Pagamentos</button></div></div></div>`;
}
function formPagamento(){
 if(!canEdit('pagamentos'))throw Error('Sem permissão para lançar pagamentos.');
 const year=state.ano_pag||DB.config.anoActivo,enrolled=new Set(DB.inscricoes.filter(i=>i.Ano===year).map(i=>i.CodAluno));
 const students=DB.alunos.filter(a=>enrolled.has(a.IdAluno)).sort((a,b)=>a.Nome.localeCompare(b.Nome));
 const options=values=>values.map(v=>`<option>${esc(v)}</option>`).join('');
 openModal({title:'💳 Registar Pagamento',sub:'Ano lectivo '+year,size:'lg',body:`<div class="form-grid g2">
  <div class="campo span2"><label for="p_aluno">Aluno *</label><select id="p_aluno" onchange="sugerirPropina()"><option value="">— Seleccionar —</option>${students.map(a=>`<option value="${esc(a.IdAluno)}">${esc(a.Nome)} (${esc(a.IdAluno)})</option>`).join('')}</select></div>
  <div class="campo span2"><label for="p_insc">Matrícula *</label><select id="p_insc" onchange="calcularPagamento()"><option value="">— Seleccione o aluno —</option></select></div>
  <div class="campo span2"><label for="p_ref">Referente *</label><select id="p_ref" onchange="calcularPagamento()">${options(['Propina Mensal','Propina Trimestral','Propina Anual','Taxa de Inscrição','Taxa de Exame','Emissão de Certificado','Emissão de Diploma','Uniforme','Material Didáctico','Multa','Outro'])}</select></div>
  <div class="campo span2" id="p_periodo"><label for="p_mes">Período *</label><select id="p_mes"></select></div>
  <div class="campo"><label for="p_valor">Valor (FCFA) *</label><input type="number" step="0.01" min="0.01" id="p_valor" value="" readonly></div>
  <div class="campo"><label for="p_data">Data *</label><input type="date" id="p_data" value="${today()}"></div>
  <div class="campo span2"><label for="p_forma">Forma</label><select id="p_forma" onchange="actualizarCheque()">${options(['Numerário','Transferência','Orange Money','Cheque'])}</select></div>
  <div class="campo span2" id="p_cheque_campo" hidden><label for="p_cheque">Nº do Cheque *</label><input id="p_cheque" type="text" maxlength="80" autocomplete="off"></div>
  <div class="campo span2"><label for="p_talao">Nº Talão</label><input id="p_talao" value="TL${Date.now()}" readonly></div>
 </div><div id="p_hint" class="info-box mt">Seleccione o aluno para calcular o valor pela tarifa da sua matrícula.</div>`,buttons:[{l:'Cancelar',cls:'btn-ghost',fn:closeModal},{l:'💾 Registar',cls:'btn-primary',fn:()=>{
  const g=k=>$('#p_'+k).value.trim();
  if(!g('aluno')||!g('insc')||!g('data'))throw Error('Seleccione o aluno, a matrícula e a data.');
  calcularPagamento();
  if(num(g('valor'))<=0)throw Error('Indique um valor superior a zero.');
  if(g('forma')==='Cheque'&&!g('cheque'))throw Error('Indique o número do cheque.');
  const obj={IdPagamento:nextId(DB.pagamentos,'IdPagamento'),Talao:g('talao'),Referente:g('ref'),Mes:g('mes'),Valor:num(g('valor')),Data:g('data'),FormaPagamento:g('forma'),CodAluno:g('aluno'),CodInscricao:num(g('insc')),Operador:session.CodFuncionario||session.Usuario};
  if(obj.FormaPagamento==='Cheque')obj.NumeroCheque=g('cheque');
  DB.pagamentos.push(obj);saveDB();closeModal();renderView();toast('Pagamento registado.');setTimeout(()=>imprimirRecibo(obj.IdPagamento),350);
 }}]});calcularPagamento();
}
function sugerirPropina(){
 const student=$('#p_aluno').value,year=state.ano_pag||DB.config.anoActivo;
 const records=DB.inscricoes.filter(i=>i.CodAluno===student&&i.Ano===year);
 $('#p_insc').innerHTML=records.length?records.map(i=>`<option value="${i.IdInscricao}">Nº ${i.IdInscricao} · ${esc(i.Classe)} · ${esc(i.CodTurma)} · ${esc(i.Ano)}</option>`).join(''):'<option value="">— Sem matrícula no ano seleccionado —</option>';
 calcularPagamento();
}
function calcularPagamento(){
 const ins=getInsc(num($('#p_insc').value)),type=$('#p_ref').value,input=$('#p_valor'),period=$('#p_mes');
 const cls=ins?getClasse(ins.Classe,ins.Ano):null;
 const automatic=['Propina Mensal','Propina Trimestral','Propina Anual','Taxa de Inscrição'].includes(type);
 if(automatic||input.readOnly!==automatic)input.value='';input.readOnly=automatic;
 let periods=[];
 if(type==='Propina Mensal')periods=['Setembro','Outubro','Novembro','Dezembro','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto'];
 if(type==='Propina Trimestral')periods=['I Trimestre','II Trimestre','III Trimestre'];
 if(type==='Propina Anual')periods=['Anual'];
 const oldPeriod=period.value;period.innerHTML=periods.map(p=>`<option ${p===oldPeriod?'selected':''}>${p}</option>`).join('');$('#p_periodo').hidden=!periods.length;
 const hint=$('#p_hint');
 if(!cls){hint.textContent='Seleccione uma matrícula com tarifas definidas para o ano lectivo.';return;}
 const months=type==='Propina Trimestral'?3:type==='Propina Anual'?Number(cls.Duracao):1;
 if(automatic)input.value=String(Math.round((type==='Taxa de Inscrição'?Number(cls.Inscricao):Number(cls.Propina)*months)*100)/100);
 hint.innerHTML=`<b>Classe:</b> ${esc(ins.Classe)} · <b>Ano:</b> ${esc(ins.Ano)}${automatic?' · <b>Cálculo:</b> '+(type==='Taxa de Inscrição'?'Taxa de inscrição':money(cls.Propina)+' × '+months+(months===1?' mês':' meses'))+' = <b>'+money(num(input.value))+'</b>':' · Indique o valor da rubrica seleccionada.'}`;
}
function actualizarCheque(){const cheque=$('#p_forma').value==='Cheque';$('#p_cheque_campo').hidden=!cheque;$('#p_cheque').required=cheque;if(!cheque)$('#p_cheque').value='';}
function agruparPorCursoClasseTurma(inscricoes){
 const groups=new Map();for(const i of inscricoes){const key=[i.Ano,i.CodCurso,i.Classe,i.CodTurma].join('|');if(!groups.has(key))groups.set(key,{curso:i.CodCurso,classe:i.Classe,turma:i.Turma,codTurma:i.CodTurma,ano:i.Ano,alunos:[]});groups.get(key).alunos.push(i);}
 return [...groups.values()].sort((a,b)=>[a.curso,a.classe,a.codTurma].join('|').localeCompare([b.curso,b.classe,b.codTurma].join('|'),undefined,{numeric:true}));
}
function nominalPages(year){
 const groups=agruparPorCursoClasseTurma(DB.inscricoes.filter(i=>i.Ano===year&&i.Estado==='Matriculado'));
 return groups.map(g=>`<div class="prt prt-page">${prtHeader()}<div class="prt-title">Lista Nominal de Alunos Matriculados</div><div class="prt-sub">${esc(year)} · ${esc(getCurso(g.curso)?.Nome||g.curso)} · ${esc(g.classe)} · Turma ${esc(g.turma)} (${esc(g.codTurma)}) · ${g.alunos.length} alunos</div><table class="prt-tabela"><thead><tr><th>#</th><th>Nº Processo</th><th>Nome do Aluno</th><th>Sexo</th><th>Idade</th><th>Assinatura</th></tr></thead><tbody>${g.alunos.map(i=>({i,a:getAluno(i.CodAluno)})).filter(x=>x.a).sort((x,y)=>x.a.Nome.localeCompare(y.a.Nome)).map(({a},n)=>`<tr><td>${n+1}</td><td>${esc(a.IdAluno)}</td><td>${esc(a.Nome)}</td><td>${esc(a.Sexo)}</td><td>${idade(a.DataNa)}</td><td></td></tr>`).join('')}</tbody></table>${prtAss(['A Secretaria','A Direcção'])}${prtFooter(year)}</div>`).join('');
}
function imprimirListaAlunos(){const html=nominalPages(DB.config.anoActivo);if(!html){toast('Não há alunos matriculados neste ano.','warn');return;}imprimir(html,'Lista Nominal');}
function imprimirListaMatriculas(){const html=nominalPages(state.ano_ins||DB.config.anoActivo);if(!html){toast('Não há matrículas confirmadas neste ano.','warn');return;}imprimir(html,'Lista de Matrículas');}
