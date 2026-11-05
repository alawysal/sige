package com.escola.gestaoescolar.sige;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api")
public class Api {
 private final Store store;private final Workspace workspace;private final Operations operations;private final PasswordEncoder encoder;private final Security.Tokens tokens;
 private final Map<String,Attempt> attempts=new ConcurrentHashMap<>();
 private record Attempt(int count,long until){}
 public Api(Store store,Workspace workspace,Operations operations,PasswordEncoder encoder,Security.Tokens tokens){this.store=store;this.workspace=workspace;this.operations=operations;this.encoder=encoder;this.tokens=tokens;}
 public record Login(@NotBlank @Size(max=80) String username,@NotBlank @Size(max=72) String password){}
 @PostMapping("/auth/login") public Map<String,Object> login(@Valid @RequestBody Login login){
  String name=login.username().trim();long now=System.currentTimeMillis();Attempt attempt=attempts.get(name);
  if(attempt!=null&&attempt.count>=10&&attempt.until>now)throw new ApiException(429,"Demasiadas tentativas. Tente novamente dentro de 5 minutos.");
  Store.Account user=store.account(name);
  if(user==null||!encoder.matches(login.password(),user.password())||!user.data().path("Ativo").asText().equals("Sim")){
   attempts.put(name,new Attempt(attempt==null||attempt.until<now?1:attempt.count+1,now+300000));if(attempts.size()>10000)attempts.entrySet().removeIf(e->e.getValue().until<now);
   throw new ApiException(401,"Credenciais inválidas ou conta inactiva.");
  }
  attempts.remove(name);store.audit(name,"login","Sessão iniciada");return Map.of("token",tokens.issue(user),"user",user.data());
 }
 Store.Account user(@Parameter(hidden=true) Authentication auth){return (Store.Account)auth.getPrincipal();}
 @GetMapping("/auth/me") public ObjectNode me(@Parameter(hidden=true) Authentication auth){return user(auth).data();}
 @GetMapping("/workspace") public ObjectNode workspace(@Parameter(hidden=true) Authentication auth,@RequestHeader(value="X-School-Id",required=false) String school){return workspace.snapshot(user(auth),school);}
 @PostMapping("/transactions") public ObjectNode transact(@Parameter(hidden=true) Authentication auth,@RequestBody Workspace.Transaction tx,@RequestHeader(value="X-School-Id",required=false) String school){return workspace.apply(user(auth),tx,school);}
 @PostMapping("/renewals") public ObjectNode renew(@Parameter(hidden=true) Authentication auth,@RequestBody Operations.Renewal req,@RequestHeader(value="X-School-Id",required=false) String school){return operations.renew(user(auth),req,school);}
 @GetMapping(value="/exports/renewals",produces="text/csv;charset=UTF-8") public ResponseEntity<String> export(@Parameter(hidden=true) Authentication auth,@RequestParam String year,@RequestHeader(value="X-School-Id",required=false) String school){return ResponseEntity.ok().header("Content-Disposition","attachment; filename=renovacoes.csv").body(operations.exportRenewals(user(auth),year,school));}
 public record Restore(long revision,ObjectNode data){}
 @GetMapping("/backup") public ObjectNode backup(@Parameter(hidden=true) Authentication auth){return workspace.backup(user(auth));}
 @PostMapping("/backup/restore") public ObjectNode restore(@Parameter(hidden=true) Authentication auth,@RequestBody Restore req)throws Exception{ApiException.require(req.data()!=null,"Backup em falta.");return operations.restore(user(auth),req.revision(),req.data(),false);}
 @PostMapping("/demo/reset") public ObjectNode reset(@Parameter(hidden=true) Authentication auth,@RequestBody Restore req)throws Exception{return operations.restore(user(auth),req.revision(),null,true);}
 @GetMapping("/health") public Map<String,String> health(){store.jdbc().queryForObject("SELECT 1",Integer.class);return Map.of("status","UP","database","mysql");}
 @RestControllerAdvice public static class Errors {
  @ExceptionHandler(ApiException.class) ResponseEntity<Map<String,String>> api(ApiException ex){return ResponseEntity.status(ex.status).body(Map.of("message",ex.getMessage()));}
  @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<Map<String,String>> integrity(){return ResponseEntity.unprocessableEntity().body(Map.of("message","Existem dados duplicados ou registos associados a esta operação."));}
  @ExceptionHandler({MethodArgumentNotValidException.class,org.springframework.http.converter.HttpMessageNotReadableException.class}) ResponseEntity<Map<String,String>> invalid(){return ResponseEntity.badRequest().body(Map.of("message","Pedido inválido. Verifique os campos enviados."));}
 }
}
