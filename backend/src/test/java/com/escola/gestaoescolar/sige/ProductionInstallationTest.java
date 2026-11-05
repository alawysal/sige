package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={
 "spring.datasource.url=jdbc:h2:mem:production-installation;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE",
 "spring.datasource.username=sa","spring.datasource.password=","spring.datasource.driver-class-name=org.h2.Driver",
 "sige.demo-seed=false","sige.admin-password=InitialProductionTest123!","sige.initial-school-year=2026/2027","sige.school-name=Escola Inicial de Teste"})
@Transactional
class ProductionInstallationTest {
 @Autowired Store store;@Autowired Workspace workspace;@Autowired Seed seed;@Autowired PasswordEncoder encoder;
 @Test void cleanInstallationIsValidAndHasOnlyConfiguredAdministrator(){
  ObjectNode data=store.load();assertDoesNotThrow(()->workspace.validate(data));
  assertEquals(1,data.path("usuarios").size());assertTrue(encoder.matches("InitialProductionTest123!",store.account("admin").password()));
  for(String module:List.of("alunos","inscricoes","notas","pagamentos","funcionarios","classes","cursos","materias"))assertTrue(data.path(module).isEmpty(),module);
  assertEquals("Aberto",data.path("anosLectivos").get(0).path("Estado").asText());
  assertFalse(workspace.snapshot(store.account("admin"),null).path("demoMode").asBoolean());
 }
 @Test void schoolCanBeConfiguredAndRestartDoesNotReseed()throws Exception{
  ObjectNode data=store.load(),config=data.withObject("config").deepCopy();config.put("escolaNome","Escola Configurada");
  workspace.apply(store.account("admin"),new Workspace.Transaction(data.path("revision").asLong(),List.of(),config),"ESC001");
  seed.run(new DefaultApplicationArguments(new String[0]));
  assertEquals("Escola Configurada",store.load().path("escolas").get(0).path("Nome").asText());assertEquals(1,store.load().path("usuarios").size());
 }
}
