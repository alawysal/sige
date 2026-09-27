package com.escola.gestaoescolar.controller;

import com.escola.gestaoescolar.domain.AnoLetivo;
import com.escola.gestaoescolar.service.AnoLetivoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/anos-letivos")
public class AnoLetivoController {

    private final AnoLetivoService anoLetivoService;

    public AnoLetivoController(AnoLetivoService anoLetivoService) {
        this.anoLetivoService = anoLetivoService;
    }

    @GetMapping
    public List<AnoLetivo> listar() {
        return anoLetivoService.listarTodos();
    }

    @GetMapping("/{id}")
    public AnoLetivo buscarPorId(@PathVariable Long id) {
        return anoLetivoService.buscarPorId(id);
    }

    @PostMapping
    public AnoLetivo criar(@RequestBody AnoLetivo anoLetivo) {
        return anoLetivoService.salvar(anoLetivo);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AnoLetivo> atualizar(@PathVariable Long id, @RequestBody AnoLetivo anoLetivo) {
        AnoLetivo existente = anoLetivoService.buscarPorId(id);
        anoLetivo.setId(existente.getId());
        return ResponseEntity.ok(anoLetivoService.salvar(anoLetivo));
    }
}
