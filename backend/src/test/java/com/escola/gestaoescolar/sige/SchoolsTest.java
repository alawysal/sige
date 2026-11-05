package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.node.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:schools;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE","spring.datasource.username=sa","spring.datasource.password=","spring.datasource.driver-class-name=org.h2.Driver"})
@Transactional
class SchoolsTest {
 @Autowired Store store;@Autowired Workspace workspace;@Autowired Academic academic;@Autowired Operations operations;@Autowired PasswordEncoder encoder;
 final String school="ESC_TEST",student="ALU_TEST";
 Store.Account admin(){return store.account("admin");}
 ObjectNode copy(ObjectNode db,String module,String id){return Store.find(db,module,id).deepCopy();}
 Workspace.Transaction change(String module,ObjectNode row){ObjectNode db=store.load();return new Workspace.Transaction(db.path("revision").asLong(),List.of(new Workspace.Change(module,"upsert",row.path(Modules.get(module).key()).asText(),row)),null);}
 void user(int id,String name,String role,String schoolId,String employee){ObjectNode row=store.mapper().createObjectNode().put("IdUsuario",id).put("Usuario",name).put("Nome",name).put("Perfil",role).put("CodEscola",schoolId).put("CodFuncionario",employee).put("Ativo","Sim");store.user(row,encoder.encode("Tests123!"),false);}
 @BeforeEach void secondSchool(){
  ObjectNode db=store.load();ObjectNode s=copy(db,"escolas","ESC001").put("CodEscola",school).put("Nome","Escola de Teste").put("Tipo","Escola Técnica").put("Categoria","Privada");s.putNull("Logo");store.upsert(Modules.get("escolas"),s);
  ObjectNode course=copy(db,"cursos","CUR001").put("CodCurso","CUR_TEST").put("CodEscola",school);store.upsert(Modules.get("cursos"),course);
  ObjectNode cls=copy(db,"classes","3").put("IdClasse",901).put("CodEscola",school);cls.withObject("PorAno").withObject("2026/2027").put("Propina",5000);SchoolYear.total(cls.withObject("PorAno").withObject("2026/2027"));store.upsert(Modules.get("classes"),cls);
  ObjectNode subject=copy(db,"materias","9").put("IdMateria",901).put("CodEscola",school);store.upsert(Modules.get("materias"),subject);
  ObjectNode employee=copy(db,"funcionarios","FUN001").put("IdFuncionario","FUN_TEST").put("CodEscola",school);store.upsert(Modules.get("funcionarios"),employee);
  ObjectNode pupil=copy(db,"alunos","ALU0001").put("IdAluno",student).put("Nome","Aluno Escola B").put("CodEscola",school);store.upsert(Modules.get("alunos"),pupil);
  ObjectNode room=copy(db,"turmas","T001").put("CodTurma","T_TEST").put("CodEscola",school).put("Curso","CUR_TEST").put("CodFuncionario","FUN_TEST");store.upsert(Modules.get("turmas"),room);
  ObjectNode enrollment=copy(db,"inscricoes","1").put("IdInscricao",901).put("CodEscola",school).put("CodAluno",student).put("CodCurso","CUR_TEST").put("Curso","CUR_TEST").put("CodTurma","T_TEST").put("Turma",room.path("Turma").asText());store.upsert(Modules.get("inscricoes"),enrollment);
  ObjectNode assignment=((ObjectNode)db.path("atribuicoes").get(0)).deepCopy().put("IdAtribuicao",901).put("CodEscola",school).put("CodFuncionario","FUN_TEST").put("CodTurma","T_TEST").put("IdMateria",901).put("Ano","2026/2027").put("Locked",false);store.upsert(Modules.get("atribuicoes"),assignment);
  user(901,"secretaria_b","Secretaria",school,"");user(902,"professor_b","Professor",school,"FUN_TEST");user(903,"pedagogico_b","Pedagogico",school,"");user(904,"ministerio_test","Ministerio","","");user(905,"financeiro_b","Financeiro",school,"");
  workspace.validate(store.load());
 }
 @Test void schoolIsolationAppliesToAllModulesAndCannotBeChangedByHeader(){
  ObjectNode snapshot=workspace.snapshot(store.account("secretaria_b"));assertEquals(1,snapshot.path("alunos").size());assertEquals(student,snapshot.path("alunos").get(0).path("IdAluno").asText());assertEquals("Escola de Teste",snapshot.path("config").path("escolaNome").asText());
  for(Modules.Module module:Modules.ALL)if(Schools.owned(module.name()))for(var row:snapshot.path(module.name()))assertEquals(school,row.path("CodEscola").asText());
  assertEquals(403,assertThrows(ApiException.class,()->workspace.snapshot(store.account("secretaria_b"),"ESC001")).status);
  ObjectNode victim=copy(store.load(),"alunos","ALU0001").put("Nome","Ataque");assertEquals(403,assertThrows(ApiException.class,()->workspace.apply(store.account("secretaria_b"),change("alunos",victim))).status);
  var deletion=new Workspace.Transaction(store.load().path("revision").asLong(),List.of(new Workspace.Change("alunos","delete","ALU0001",null)),null);assertEquals(403,assertThrows(ApiException.class,()->workspace.apply(store.account("secretaria_b"),deletion)).status);
 }
 @Test void forgedOwnershipAndCrossSchoolReferencesAreRejected(){
  ObjectNode pupil=copy(store.load(),"alunos",student).put("CodEscola","ESC001");assertEquals(403,assertThrows(ApiException.class,()->workspace.apply(store.account("secretaria_b"),change("alunos",pupil))).status);
  ObjectNode enrollment=copy(store.load(),"inscricoes","901").put("CodAluno","ALU0001");assertEquals(422,assertThrows(ApiException.class,()->workspace.apply(admin(),change("inscricoes",enrollment),school)).status);
  assertEquals(student,Store.find(store.load(),"inscricoes","901").path("CodAluno").asText());
 }
 @Test void newRecordsGetAuthenticatedSchoolAndGlobalIdsAvoidCollisions(){ObjectNode row=copy(store.load(),"alunos",student).put("IdAluno","NEW_B");row.remove("CodEscola");ObjectNode result=workspace.apply(store.account("secretaria_b"),change("alunos",row));assertEquals(school,Store.find(store.load(),"alunos","NEW_B").path("CodEscola").asText());assertTrue(result.path("counters").path("IdInscricao").asInt()>=901);}
 @Test void ministryHasGlobalReadOnlyStatisticsAndNoRevenues(){
  var user=store.account("ministerio_test");ObjectNode data=workspace.snapshot(user);assertTrue(data.path("alunos").size()>1);assertEquals(2,data.path("escolas").size());assertTrue(data.path("pagamentos").isEmpty());assertTrue(data.path("usuarios").isEmpty());assertTrue(data.path("logs").isEmpty());
  for(var bill:data.path("propinas"))assertFalse(bill.has("pago"));assertFalse(data.path("alunos").get(0).has("Movel1"));assertEquals(1,workspace.snapshot(user,school).path("alunos").size());
  assertEquals(403,assertThrows(ApiException.class,()->workspace.apply(user,change("alunos",copy(store.load(),"alunos",student)))).status);
  assertEquals(403,assertThrows(ApiException.class,()->operations.exportRenewals(user,"2027/2028")).status);
 }
 @Test void revenuesAreRestrictedAndPedagogicalPermissionsAreSpecific(){
  for(String name:List.of("secretaria","professor","pedagogico_b","ministerio_test"))assertTrue(workspace.snapshot(store.account(name)).path("pagamentos").isEmpty());
  assertFalse(workspace.snapshot(admin()).path("pagamentos").isEmpty());assertFalse(workspace.snapshot(store.account("diretor")).path("pagamentos").isEmpty());assertFalse(workspace.snapshot(store.account("financeiro")).path("pagamentos").isEmpty());
  var user=store.account("pedagogico_b");assertTrue(workspace.canWrite(user,"notas"));assertTrue(workspace.canWrite(user,"atribuicoes"));for(String module:List.of("pagamentos","alunos","inscricoes","config","usuarios","escolas"))assertFalse(workspace.canWrite(user,module));
 }
 ObjectNode grade(){ObjectNode grade=store.mapper().createObjectNode().put("IdNota",901).put("CodInscricao",901).put("CodMateria",901).put("Ano","2026/2027");for(String term:Academic.TERMS)for(String kind:Academic.TYPES)grade.withObject(term).putNull(kind);grade.putNull("ExameFinal").putNull("ExameRecurso");return grade;}
 @Test void draftCanBeEditedThenValidatedAndOtherPeriodsRemainOpen(){
  var teacher=store.account("professor_b");ObjectNode row=grade().put("DraftTerm","I_Trimestre");row.withObject("I_Trimestre").put("MAC",14).put("NPP",15).put("NPT",16);workspace.apply(teacher,change("notas",row));
  ObjectNode saved=copy(store.load(),"notas","901");assertTrue(saved.path("I_Trimestre").path("MAC").isNull());assertFalse(academic.result(store.load(),"901").path("avaliado").asBoolean());
  saved.set("I_Trimestre",saved.path("Rascunhos").path("I_Trimestre").deepCopy());saved.withObject("I_Trimestre").put("MAC",18);saved.put("DraftTerm","I_Trimestre");workspace.apply(teacher,change("notas",saved));
  saved=copy(store.load(),"notas","901");saved.set("I_Trimestre",saved.path("Rascunhos").path("I_Trimestre").deepCopy());saved.put("SubmitTerm","I_Trimestre");workspace.apply(teacher,change("notas",saved));
  ObjectNode locked=copy(store.load(),"notas","901");assertEquals(18,locked.path("I_Trimestre").path("MAC").asInt());assertTrue(locked.path("Locks").path("I_Trimestre").asBoolean());assertFalse(locked.path("Rascunhos").has("I_Trimestre"));locked.put("DraftTerm","I_Trimestre");assertEquals(403,assertThrows(ApiException.class,()->workspace.apply(teacher,change("notas",locked))).status);
  ObjectNode next=copy(store.load(),"notas","901");next.withObject("II_Trimestre").put("MAC",12);next.put("DraftTerm","II_Trimestre");workspace.apply(teacher,change("notas",next));assertFalse(Store.find(store.load(),"notas","901").path("Locks").path("II_Trimestre").asBoolean());
 }
 @Test void cannotValidateWithoutCompleteSavedDraft(){var teacher=store.account("professor_b");ObjectNode row=grade().put("SubmitTerm","I_Trimestre");row.withObject("I_Trimestre").put("MAC",14).put("NPP",15).put("NPT",16);assertEquals(422,assertThrows(ApiException.class,()->workspace.apply(teacher,change("notas",row))).status);row.remove("SubmitTerm");row.put("DraftTerm","I_Trimestre");row.withObject("I_Trimestre").putNull("NPT");workspace.apply(teacher,change("notas",row));ObjectNode saved=copy(store.load(),"notas","901");saved.set("I_Trimestre",saved.path("Rascunhos").path("I_Trimestre"));saved.put("SubmitTerm","I_Trimestre");assertEquals(422,assertThrows(ApiException.class,()->workspace.apply(teacher,change("notas",saved))).status);assertFalse(Store.find(store.load(),"notas","901").path("Locks").path("I_Trimestre").asBoolean());}
 @Test void classTariffsAreIndependentAcrossSchools(){ObjectNode db=store.load();assertEquals(5000,SchoolYear.classFor(db,"10ª Classe","2026/2027",school).path("Propina").asInt());assertNotEquals(5000,SchoolYear.classFor(db,"10ª Classe","2026/2027","ESC001").path("Propina").asInt());}
 @Test void eachSchoolKeepsItsOwnIdentityAndLogo()throws Exception{
  var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);String logo="data:image/png;base64,"+Base64.getEncoder().encodeToString(out.toByteArray());
  ObjectNode before=store.load(),config=workspace.snapshot(admin(),school).withObject("config").deepCopy();config.put("logo",logo).put("escolaMunicipio","Bula");workspace.apply(admin(),new Workspace.Transaction(before.path("revision").asLong(),List.of(),config),school);
  assertEquals(logo,Store.find(store.load(),"escolas",school).path("Logo").asText());assertEquals("Bula",workspace.snapshot(store.account("secretaria_b")).path("config").path("escolaMunicipio").asText());assertEquals(Store.find(before,"escolas","ESC001").path("Logo"),Store.find(store.load(),"escolas","ESC001").path("Logo"));
 }
 @Test void transferRequiresReferenceAndCashNeverKeepsIt(){ObjectNode row=store.mapper().createObjectNode().put("IdPagamento",901).put("CodInscricao",901).put("CodAluno",student).put("Referente","Outro").put("Talao","BANK-TEST").put("Data",java.time.LocalDate.now().toString()).put("FormaPagamento","Transferência").put("Valor",100);var user=store.account("financeiro_b");assertEquals(422,assertThrows(ApiException.class,()->workspace.apply(user,change("pagamentos",row))).status);row.put("NumeroCheque","000TRANS123");workspace.apply(user,change("pagamentos",row));ObjectNode saved=copy(store.load(),"pagamentos","901");assertEquals("000TRANS123",saved.path("NumeroCheque").asText());saved.put("FormaPagamento","Numerário");workspace.apply(user,change("pagamentos",saved));assertFalse(Store.find(store.load(),"pagamentos","901").has("NumeroCheque"));}
}
