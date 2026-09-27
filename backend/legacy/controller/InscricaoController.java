package com.escola.gestaoescolar.controller;

import com.escola.gestaoescolar.domain.Inscricao;
import com.escola.gestaoescolar.service.InscricaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/inscricoes")
public class InscricaoController {

    private final InscricaoService inscricaoService;

    public InscricaoController(InscricaoService inscricaoService) {
        this.inscricaoService = inscricaoService;
    }

    @GetMapping
    public List<Inscricao> listar() {
        return inscricaoService.listarTodos();
    }

    @GetMapping("/{id}")
    public Inscricao buscarPorId(@PathVariable Long id) {
        return inscricaoService.buscarPorId(id);
    }

    @PostMapping
    public Inscricao criar(@RequestBody Inscricao inscricao) {
        return inscricaoService.salvar(inscricao);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Inscricao> atualizar(@PathVariable Long id, @RequestBody Inscricao inscricao) {
        Inscricao existente = inscricaoService.buscarPorId(id);
        inscricao.setId(existente.getId());
        return ResponseEntity.ok(inscricaoService.salvar(inscricao));
    }
}
