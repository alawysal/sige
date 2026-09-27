package com.escola.gestaoescolar.sige;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.security.Key;
import java.util.*;

@Configuration
public class Security {
 @Bean PasswordEncoder encoder(){return new BCryptPasswordEncoder();}
 @Bean SecurityFilterChain filterChain(HttpSecurity http,Tokens tokens,Store store)throws Exception{
  return http.csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
   .authorizeHttpRequests(a->a.requestMatchers(HttpMethod.POST,"/api/auth/login").permitAll()
    .requestMatchers(HttpMethod.GET,"/api/health","/actuator/health").permitAll()
    .requestMatchers("/api/**").authenticated().anyRequest().denyAll())
   .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->error(res,401,"Sessão inválida ou expirada."))
    .accessDeniedHandler((req,res,ex)->error(res,403,"Sem permissão para esta operação.")))
   .addFilterBefore(new OncePerRequestFilter(){
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain)throws ServletException,IOException{
     String header=req.getHeader("Authorization");
     if(header!=null&&header.startsWith("Bearer ")){
      try{
       Claims claims=tokens.read(header.substring(7));Store.Account account=store.account(claims.getSubject());
       if(account!=null&&account.data().path("Ativo").asText().equals("Sim")&&account.version()==((Number)claims.get("version")).longValue()){
        var auth=new UsernamePasswordAuthenticationToken(account,null,List.of(new SimpleGrantedAuthority(account.role())));
        SecurityContextHolder.getContext().setAuthentication(auth);
       }
      }catch(JwtException|IllegalArgumentException|NullPointerException ex){SecurityContextHolder.clearContext();}
     }
     chain.doFilter(req,res);
    }
   },UsernamePasswordAuthenticationFilter.class).build();
 }
 static void error(HttpServletResponse res,int status,String message)throws IOException{res.setStatus(status);res.setContentType("application/json;charset=UTF-8");res.getWriter().write("{\"message\":\""+message+"\"}");}
 @Component public static class Tokens {
  private final Key key;private final long expiration;
  public Tokens(@Value("${jwt.secret}")String secret,@Value("${jwt.expiration-ms}")long expiration){this.key=Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));this.expiration=expiration;}
  public String issue(Store.Account user){return Jwts.builder().setSubject(user.username()).claim("version",user.version()).setIssuedAt(new Date()).setExpiration(new Date(System.currentTimeMillis()+expiration)).signWith(key,SignatureAlgorithm.HS256).compact();}
  public Claims read(String token){return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();}
 }
}
