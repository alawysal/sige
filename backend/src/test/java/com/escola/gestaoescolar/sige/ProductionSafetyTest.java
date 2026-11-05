package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;

class ProductionSafetyTest {
 ObjectNode source()throws Exception{return (ObjectNode)new ObjectMapper().readTree(getClass().getResourceAsStream("/demo-data.json"));}
 @Test void freshProductionHasOnlyAdministratorSchoolAndYear()throws Exception{
  ObjectNode original=source(),before=original.deepCopy();Schools.migrate(original);ObjectNode initial=ProductionBootstrap.prepare(original,"2026/2027","Escola Real");
  assertEquals(1,initial.path("usuarios").size());assertEquals("admin",initial.path("usuarios").get(0).path("Usuario").asText());assertFalse(initial.path("usuarios").get(0).has("Senha"));
  assertEquals("Escola Real",initial.path("escolas").get(0).path("Nome").asText());assertEquals("",initial.path("escolas").get(0).path("Telefone").asText());
  assertEquals(1,initial.path("anosLectivos").size());assertEquals("2026/2027",initial.path("config").path("anoActivo").asText());
  for(Modules.Module m:Modules.ALL)if(!java.util.Set.of("escolas","anosLectivos").contains(m.name()))assertTrue(initial.path(m.name()).isEmpty(),m.name());
  assertFalse(before.path("alunos").isEmpty());assertFalse(original.path("alunos").isEmpty(),"Source demo must remain intact");
 }
 @Test void rejectsMalformedOrNonConsecutiveSchoolYears()throws Exception{
  ObjectNode source=source();for(String year:java.util.List.of("2026","2026/2028","aaaa/bbbb"))assertThrows(IllegalArgumentException.class,()->ProductionBootstrap.prepare(source,year,"Escola"));
 }
 @Test void productionResetIsDeniedBeforeAnyDatabaseMutation(){
  Operations operations=new Operations(null,null,null);ReflectionTestUtils.setField(operations,"demoSeed",false);
  ApiException error=assertThrows(ApiException.class,()->operations.restore(null,0,null,true));assertEquals(403,error.status);
 }
}
