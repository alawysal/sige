package com.escola.gestaoescolar.sige;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.boot.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component @Order(20)
public class CatalogMigration implements ApplicationRunner {
 private final Store store;
 public CatalogMigration(Store store){this.store=store;}
 @Override @Transactional public void run(ApplicationArguments args)throws Exception{
  long revision=store.lock();ObjectNode db=store.load(),before=db.deepCopy();String old=db.toString();SchoolYear.initialize(db);
  if(!db.path("config").has("pais")){
   ObjectNode defaults=(ObjectNode)store.mapper().readTree(new org.springframework.core.io.ClassPathResource("gb-defaults.json").getInputStream());
   boolean originalDemo=db.path("config").path("escolaNome").asText().equals("Escola Secundária de Educação Nacional")&&db.path("config").path("escolaMunicipio").asText().equals("Maputo");
   if(originalDemo){db.withObject("config").setAll(defaults);ObjectNode school=Store.find(db,"escolas","ESC001");if(school!=null){for(String field:java.util.List.of("Nome","NIF","Endereco","Municipio","Provincia","Telefone","Email","Diretor"))school.set(field,defaults.path("escola"+field));store.upsert(Modules.get("escolas"),school);}}
   else for(String field:java.util.List.of("pais","ministerio","republica","moeda"))db.withObject("config").set(field,defaults.path(field));
  }
  for(JsonNode student:db.path("alunos")){String previous=student.toString();StudentProfile.normalize((ObjectNode)student);if(!previous.equals(student.toString()))store.upsert(Modules.get("alunos"),student);}
  Schools.migrate(db);
  if(!old.equals(db.toString())){
   for(Modules.Module module:Modules.ALL)for(JsonNode row:db.path(module.name()))if(!row.equals(Store.find(before,module.name(),row.path(module.key()).asText())))store.upsert(module,row);
   for(JsonNode row:db.path("usuarios"))if(!row.equals(Store.find(before,"usuarios","IdUsuario",row.path("IdUsuario").asText()))){Store.Account account=store.account(row.path("Usuario").asText());store.user((ObjectNode)row,account.password(),true);}
   store.config(db.path("config"),revision+1);store.audit("sistema","catalogo_anual","Tarifas, dados e ligações às escolas preservados");
  }
 }
}
