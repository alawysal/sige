package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:sige;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE","spring.datasource.username=sa","spring.datasource.password=","spring.datasource.driver-class-name=org.h2.Driver"})
@AutoConfigureMockMvc @Transactional
class ApiFlowTest {
 @Autowired MockMvc http;
 @Autowired ObjectMapper mapper;
 @Autowired Store store;
 @Test void documentationCoversEveryEndpointAndRequiresJwtForSchoolData()throws Exception{
  JsonNode spec=mapper.readTree(http.perform(get("/v3/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());
  assertEquals("SIGE Guiné-Bissau — API",spec.path("info").path("title").asText());assertEquals(10,spec.path("paths").size());
  assertEquals("bearer",spec.path("components").path("securitySchemes").path("bearerAuth").path("scheme").asText());assertEquals("/",spec.path("servers").get(0).path("url").asText());
  assertTrue(spec.path("paths").path("/api/auth/login").path("post").has("security"));assertTrue(spec.path("paths").path("/api/auth/login").path("post").path("security").isEmpty());
  assertFalse(spec.path("paths").path("/api/workspace").path("get").path("security").isEmpty());
  assertTrue(spec.path("paths").path("/api/transactions").path("post").path("responses").has("409"));
  assertTrue(spec.path("paths").path("/api/transactions").path("post").path("requestBody").path("content").path("application/json").path("examples").size()>0);
  for(JsonNode path:spec.path("paths"))for(JsonNode operation:path)for(JsonNode parameter:operation.path("parameters"))assertNotEquals("auth",parameter.path("name").asText());
 }
 @Test void swaggerAssetsArePublicButBusinessEndpointsRemainProtected()throws Exception{
  http.perform(get("/swagger-ui.html")).andExpect(status().is3xxRedirection());
  http.perform(get("/swagger-ui/index.html")).andExpect(status().isOk());
  http.perform(get("/swagger-ui/swagger-ui.css")).andExpect(status().isOk());
  http.perform(get("/v3/api-docs/swagger-config")).andExpect(status().isOk()).andExpect(jsonPath("url").value("/v3/api-docs"));
  http.perform(get("/api/workspace")).andExpect(status().isUnauthorized());
  http.perform(post("/api/transactions").contentType(MediaType.APPLICATION_JSON).content("{\"revision\":0,\"changes\":[]}")).andExpect(status().isUnauthorized());
 }
 String token(String username,String password)throws Exception{
  return mapper.readTree(http.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("username",username,"password",password)))).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray()).path("token").asText();
 }
 ObjectNode workspace(String token)throws Exception{return (ObjectNode)mapper.readTree(http.perform(get("/api/workspace").header("Authorization","Bearer "+token)).andExpect(status().isOk()).andReturn().getResponse().getContentAsByteArray());}
 @Test void httpTransactionCommitsToDatabaseReturnsNewRevisionAndRejectsStaleWrites()throws Exception{
  String token=token("admin","admin123");ObjectNode db=workspace(token),student=Store.find(db,"alunos","ALU0001").deepCopy();student.put("IdAluno","FLOW_HTTP_TEST");student.put("Nome","Aluno Teste HTTP");
  String payload=mapper.writeValueAsString(Map.of("revision",db.path("revision").asLong(),"changes",List.of(Map.of("module","alunos","kind","upsert","id","FLOW_HTTP_TEST","record",student))));
  http.perform(post("/api/transactions").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isOk()).andExpect(jsonPath("revision").value(db.path("revision").asLong()+1));
  ObjectNode stored=store.json(store.jdbc().queryForObject("SELECT data FROM sige_alunos WHERE id=?",String.class,"FLOW_HTTP_TEST"));assertEquals("Aluno Teste HTTP",stored.path("Nome").asText());
  assertNotNull(Store.find(workspace(token),"alunos","FLOW_HTTP_TEST"));
  http.perform(post("/api/transactions").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isConflict());
 }
 @Test void documentedWriteStillEnforcesTheAuthenticatedProfile()throws Exception{
  String token=token("financeiro","fin123");ObjectNode db=workspace(token),student=Store.find(db,"alunos","ALU0001").deepCopy();student.put("Nome","Não autorizado");
  String payload=mapper.writeValueAsString(Map.of("revision",db.path("revision").asLong(),"changes",List.of(Map.of("module","alunos","kind","upsert","id","ALU0001","record",student))));
  http.perform(post("/api/transactions").header("Authorization","Bearer "+token).contentType(MediaType.APPLICATION_JSON).content(payload)).andExpect(status().isForbidden());
  assertNotEquals("Não autorizado",Store.find(store.load(),"alunos","ALU0001").path("Nome").asText());
 }
}
