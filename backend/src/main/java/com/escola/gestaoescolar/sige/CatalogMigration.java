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
 @Override @Transactional public void run(ApplicationArguments args){
  long revision=store.lock();ObjectNode db=store.load();String old=db.path("classes").toString();SchoolYear.initialize(db);
  if(!old.equals(db.path("classes").toString())){
   for(JsonNode cls:db.path("classes"))store.upsert(Modules.get("classes"),cls);
   store.config(db.path("config"),revision+1);store.audit("sistema","catalogo_anual","Tarifas e regras existentes preservadas por ano lectivo");
  }
 }
}
