package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.domain.AnoLetivo;
import com.escola.gestaoescolar.repository.AnoLetivoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AnoLetivoService {

    private final AnoLetivoRepository anoLetivoRepository;

    public AnoLetivoService(AnoLetivoRepository anoLetivoRepository) {
        this.anoLetivoRepository = anoLetivoRepository;
    }

    public List<AnoLetivo> listarTodos() {
        return anoLetivoRepository.findAll();
    }

    public AnoLetivo salvar(AnoLetivo anoLetivo) {
        return anoLetivoRepository.save(anoLetivo);
    }

    public AnoLetivo buscarPorId(Long id) {
        return anoLetivoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ano letivo não encontrado"));
    }
}
