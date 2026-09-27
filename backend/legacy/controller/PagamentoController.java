package com.escola.gestaoescolar.controller;

import com.escola.gestaoescolar.domain.Pagamento;
import com.escola.gestaoescolar.service.PagamentoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/pagamentos")
public class PagamentoController {

    private final PagamentoService pagamentoService;

    public PagamentoController(PagamentoService pagamentoService) {
        this.pagamentoService = pagamentoService;
    }

    @GetMapping
    public List<Pagamento> listar() {
        return pagamentoService.listarTodos();
    }

    @GetMapping("/{id}")
    public Pagamento buscarPorId(@PathVariable Long id) {
        return pagamentoService.buscarPorId(id);
    }

    @PostMapping
    public Pagamento criar(@RequestBody Pagamento pagamento) {
        return pagamentoService.salvar(pagamento);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pagamento> atualizar(@PathVariable Long id, @RequestBody Pagamento pagamento) {
        Pagamento existente = pagamentoService.buscarPorId(id);
        pagamento.setId(existente.getId());
        return ResponseEntity.ok(pagamentoService.salvar(pagamento));
    }
}
