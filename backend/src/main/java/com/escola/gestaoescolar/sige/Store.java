package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import java.time.Instant;
import java.util.*;

@Repository
public class Store {
 final JdbcTemplate jdbc;
 final ObjectMapper mapper;
 public Store(JdbcTemplate jdbc,ObjectMapper mapper){this.jdbc=jdbc;this.mapper=mapper;}
 public JdbcTemplate jdbc(){return jdbc;}
 public ObjectMapper mapper(){return mapper;}
 public ObjectNode json(String text){
  try {JsonNode node=mapper.readTree(text);if(node.isTextual()) node=mapper.readTree(node.asText());return (ObjectNode)node;}
  catch(Exception e){throw new IllegalStateException("Registo inválido na base de dados",e);}
 }
 public boolean initialized(){return jdbc.queryForObject("SELECT COUNT(*) FROM sige_config",Integer.class)>0;}
 public ObjectNode load(){
  ObjectNode db=mapper.createObjectNode();db.put("__v",3);
  jdbc.query("SELECT data, revision FROM sige_config WHERE id=1",rs->{db.set("config",json(rs.getString(1)));db.put("revision",rs.getLong(2));});
  for(Modules.Module m:Modules.ALL){ArrayNode list=db.putArray(m.name());jdbc.query("SELECT data FROM "+m.table()+" ORDER BY LENGTH(id),id",rs->{list.add(json(rs.getString(1)));});}
  ArrayNode users=db.putArray("usuarios");jdbc.query("SELECT data FROM sige_users ORDER BY id",rs->{users.add(json(rs.getString(1)));});
  ArrayNode logs=db.putArray("logs");jdbc.query("SELECT created_at,actor,action,detail FROM sige_audit ORDER BY id DESC LIMIT 500",rs->{
   ObjectNode log=mapper.createObjectNode();log.put("Data",rs.getString(1));log.put("Usuario",rs.getString(2));log.put("Acao",rs.getString(3));log.put("Detalhe",rs.getString(4));logs.insert(0,log);
  });
  return db;
 }
 public long lock(){return jdbc.queryForObject("SELECT revision FROM sige_config WHERE id=1 FOR UPDATE",Long.class);}
 public void config(JsonNode config,long revision){jdbc.update("UPDATE sige_config SET data=?,revision=? WHERE id=1",config.toString(),revision);}
 public void upsert(Modules.Module m,JsonNode item){
  List<String> columns=new ArrayList<>(List.of("id","data"));List<Object> args=new ArrayList<>(List.of(item.path(m.key()).asText(),item.toString()));
  for(Modules.Ref ref:m.refs()){columns.add(ref.column());String v=item.path(ref.field()).asText("");args.add(v.isBlank()?null:v);}
  String updates=columns.stream().skip(1).map(c->c+"=VALUES("+c+")").reduce((a,b)->a+","+b).orElseThrow();
  jdbc.update("INSERT INTO "+m.table()+" ("+String.join(",",columns)+") VALUES ("+String.join(",",Collections.nCopies(columns.size(),"?"))+") ON DUPLICATE KEY UPDATE "+updates,args.toArray());
 }
 public void delete(Modules.Module m,String id){jdbc.update("DELETE FROM "+m.table()+" WHERE id=?",id);}
 public record Account(ObjectNode data,String password,long version) {public String username(){return data.path("Usuario").asText();}public String role(){return data.path("Perfil").asText();}}
 public Account account(String username){
  List<Account> users=jdbc.query("SELECT data,password_hash,token_version FROM sige_users WHERE username=?",(rs,n)->new Account(json(rs.getString(1)),rs.getString(2),rs.getLong(3)),username);
  return users.isEmpty()?null:users.get(0);
 }
 public void user(ObjectNode data,String hash,boolean invalidate){
  ObjectNode safe=data.deepCopy();safe.remove("Senha");
  String school=safe.path("CodEscola").asText("");
  jdbc.update("INSERT INTO sige_users(id,username,password_hash,data,codescola) VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE username=VALUES(username),password_hash=VALUES(password_hash),data=VALUES(data),codescola=VALUES(codescola),token_version=token_version+?",
   safe.path("IdUsuario").asText(),safe.path("Usuario").asText(),hash,safe.toString(),school.isBlank()?null:school,invalidate?1:0);
 }
 public void audit(String username,String action,String detail){jdbc.update("INSERT INTO sige_audit(created_at,actor,action,detail) VALUES(?,?,?,?)",Instant.now().toString(),username,action,detail);}
 public static ObjectNode find(JsonNode db,String module,String key,String id){for(JsonNode x:db.path(module))if(x.path(key).asText().equals(id))return (ObjectNode)x;return null;}
 public static ObjectNode find(JsonNode db,String module,String id){return find(db,module,Modules.get(module).key(),id);}
 public static int next(JsonNode db,String module,String key){int max=0;for(JsonNode x:db.path(module))max=Math.max(max,x.path(key).asInt());return max+1;}
}
