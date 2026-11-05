package com.escola.gestaoescolar.sige;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component @org.springframework.core.annotation.Order(10)
public class Seed implements ApplicationRunner {
 @Value("${sige.admin-password:}") private String initialPassword;
 @Value("${sige.initial-school-year:}") private String initialSchoolYear;
 @Value("${sige.school-name:Escola por configurar}") private String schoolName;
 private final Store store;private final PasswordEncoder encoder;private final boolean demo;
 public Seed(Store store,PasswordEncoder encoder,@Value("${sige.demo-seed}")boolean demo){this.store=store;this.encoder=encoder;this.demo=demo;}
 @Override @Transactional public void run(ApplicationArguments args)throws Exception{
  if(store.initialized())return;
  ObjectNode db=(ObjectNode)store.mapper().readTree(new ClassPathResource("demo-data.json").getInputStream());
  Schools.migrate(db);
  if(!demo)db=ProductionBootstrap.prepare(db,initialSchoolYear,schoolName);
  store.jdbc().update("INSERT INTO sige_config(id,data,revision) VALUES(1,?,0)",db.path("config").toString());
  for(Modules.Module m:Modules.ALL){
   if(!demo&&!java.util.Set.of("anosLectivos","escolas","classes","cursos","materias").contains(m.name()))continue;
   for(JsonNode row:db.path(m.name()))store.upsert(m,row);
  }
  for(JsonNode node:db.path("usuarios")){
   if(!demo&&!node.path("Usuario").asText().equals("admin"))continue;
   ObjectNode user=(ObjectNode)node;String password=user.path("Senha").asText();
   if(!demo){String initial=initialPassword;if(initial==null||initial.length()<12)throw new IllegalStateException("Defina ADMIN_PASSWORD com pelo menos 12 caracteres quando DEMO_SEED=false.");password=initial;}
   store.user(user,encoder.encode(password),false);
  }
  store.audit("sistema","inicializacao",demo?"Dados de demonstração do HTML importados uma única vez":"Estrutura inicial criada");
 }
}
