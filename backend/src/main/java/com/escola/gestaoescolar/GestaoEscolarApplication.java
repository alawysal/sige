package com.escola.gestaoescolar;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
@SpringBootApplication(exclude=org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration.class)
public class GestaoEscolarApplication {
 public static void main(String[] args) { SpringApplication.run(GestaoEscolarApplication.class,args); }
}
