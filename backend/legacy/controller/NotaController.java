package com.escola.gestaoescolar.controller;

import com.escola.gestaoescolar.domain.Nota;
import com.escola.gestaoescolar.service.NotaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notas")
public class NotaController {

    private final NotaService notaService;

    public NotaController(NotaService notaService) {
        this.notaService = notaService;
    }

    @GetMapping
    public List<Nota> listar() {
        return notaService.listarTodos();
    }

    @GetMapping("/{id}")
    public Nota buscarPorId(@PathVariable Long id) {
        return notaService.buscarPorId(id);
    }

    @PostMapping
    public Nota criar(@RequestBody Nota nota) {
        return notaService.salvar(nota);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Nota> atualizar(@PathVariable Long id, @RequestBody Nota nota) {
        Nota existente = notaService.buscarPorId(id);
        nota.setId(existente.getId());
        return ResponseEntity.ok(notaService.salvar(nota));
    }
}
