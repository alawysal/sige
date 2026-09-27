package com.escola.gestaoescolar.controller;

import com.escola.gestaoescolar.domain.Classe;
import com.escola.gestaoescolar.service.ClasseService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes")
public class ClasseController {

    private final ClasseService classeService;

    public ClasseController(ClasseService classeService) {
        this.classeService = classeService;
    }

    @GetMapping
    public List<Classe> listar() {
        return classeService.listarTodos();
    }

    @GetMapping("/{id}")
    public Classe buscarPorId(@PathVariable Long id) {
        return classeService.buscarPorId(id);
    }

    @PostMapping
    public Classe criar(@RequestBody Classe classe) {
        return classeService.salvar(classe);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Classe> atualizar(@PathVariable Long id, @RequestBody Classe classe) {
        Classe existente = classeService.buscarPorId(id);
        classe.setId(existente.getId());
        return ResponseEntity.ok(classeService.salvar(classe));
    }
}
