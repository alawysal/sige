package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.domain.Role;
import com.escola.gestaoescolar.domain.Usuario;
import com.escola.gestaoescolar.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class UsuarioService implements UserDetailsService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public org.springframework.security.core.userdetails.UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return usuarioRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException("Usuário não encontrado"));
    }

    public Usuario registrar(String username, String password, String nome, Role role) {
        Optional<Usuario> existente = usuarioRepository.findByUsername(username);
        if (existente.isPresent()) {
            throw new IllegalArgumentException("Usuário já existe");
        }

        Usuario usuario = new Usuario();
        usuario.setUsername(username);
        usuario.setPassword(passwordEncoder.encode(password));
        usuario.setNome(nome);
        usuario.setRole(role);

        return usuarioRepository.save(usuario);
    }
}
