package com.escola.gestaoescolar.controller;

import com.escola.gestaoescolar.domain.Professor;
import com.escola.gestaoescolar.service.ProfessorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/professores")
public class ProfessorController {

    private final ProfessorService professorService;

    public ProfessorController(ProfessorService professorService) {
        this.professorService = professorService;
    }

    @GetMapping
    public List<Professor> listar() {
        return professorService.listarTodos();
    }

    @GetMapping("/{id}")
    public Professor buscarPorId(@PathVariable Long id) {
        return professorService.buscarPorId(id);
    }

    @PostMapping
    public Professor criar(@RequestBody Professor professor) {
        return professorService.salvar(professor);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Professor> atualizar(@PathVariable Long id, @RequestBody Professor professor) {
        Professor existente = professorService.buscarPorId(id);
        professor.setId(existente.getId());
        return ResponseEntity.ok(professorService.salvar(professor));
    }
}
