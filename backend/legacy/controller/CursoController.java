package com.escola.gestaoescolar.controller;

import com.escola.gestaoescolar.domain.Curso;
import com.escola.gestaoescolar.service.CursoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cursos")
public class CursoController {

    private final CursoService cursoService;

    public CursoController(CursoService cursoService) {
        this.cursoService = cursoService;
    }

    @GetMapping
    public List<Curso> listar() {
        return cursoService.listarTodos();
    }

    @GetMapping("/{id}")
    public Curso buscarPorId(@PathVariable Long id) {
        return cursoService.buscarPorId(id);
    }

    @PostMapping
    public Curso criar(@RequestBody Curso curso) {
        return cursoService.salvar(curso);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Curso> atualizar(@PathVariable Long id, @RequestBody Curso curso) {
        Curso existente = cursoService.buscarPorId(id);
        curso.setId(existente.getId());
        return ResponseEntity.ok(cursoService.salvar(curso));
    }
}
