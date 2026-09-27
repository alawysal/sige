package com.escola.gestaoescolar.controller;

import com.escola.gestaoescolar.domain.Materia;
import com.escola.gestaoescolar.service.MateriaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/materias")
public class MateriaController {

    private final MateriaService materiaService;

    public MateriaController(MateriaService materiaService) {
        this.materiaService = materiaService;
    }

    @GetMapping
    public List<Materia> listar() {
        return materiaService.listarTodos();
    }

    @GetMapping("/{id}")
    public Materia buscarPorId(@PathVariable Long id) {
        return materiaService.buscarPorId(id);
    }

    @PostMapping
    public Materia criar(@RequestBody Materia materia) {
        return materiaService.salvar(materia);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Materia> atualizar(@PathVariable Long id, @RequestBody Materia materia) {
        Materia existente = materiaService.buscarPorId(id);
        materia.setId(existente.getId());
        return ResponseEntity.ok(materiaService.salvar(materia));
    }
}
