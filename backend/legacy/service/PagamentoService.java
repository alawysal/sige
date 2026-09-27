package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.domain.Pagamento;
import com.escola.gestaoescolar.repository.PagamentoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PagamentoService {

    private final PagamentoRepository pagamentoRepository;

    public PagamentoService(PagamentoRepository pagamentoRepository) {
        this.pagamentoRepository = pagamentoRepository;
    }

    public List<Pagamento> listarTodos() {
        return pagamentoRepository.findAll();
    }

    public Pagamento salvar(Pagamento pagamento) {
        return pagamentoRepository.save(pagamento);
    }

    public Pagamento buscarPorId(Long id) {
        return pagamentoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Pagamento não encontrado"));
    }
}
