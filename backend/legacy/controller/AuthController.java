package com.escola.gestaoescolar.controller;

import com.escola.gestaoescolar.domain.Role;
import com.escola.gestaoescolar.domain.Usuario;
import com.escola.gestaoescolar.security.JwtService;
import com.escola.gestaoescolar.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UsuarioService usuarioService;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authenticationManager, UsuarioService usuarioService, JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.usuarioService = usuarioService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        UserDetails principal = (UserDetails) authentication.getPrincipal();
        String token = jwtService.generateToken(principal);
        String authority = principal.getAuthorities().iterator().next().getAuthority();
        String role = Role.normalize(authority);

        return ResponseEntity.ok(Map.of("token", token, "role", role));
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request) {
        Usuario usuario = usuarioService.registrar(request.username(), request.password(), request.nome(), request.role());
        String token = jwtService.generateToken(usuario);
        return ResponseEntity.ok(Map.of("token", token, "message", "Usuário criado com sucesso"));
    }

    public record LoginRequest(String username, String password) {}
    public record RegisterRequest(String username, String password, String nome, Role role) {}
}
