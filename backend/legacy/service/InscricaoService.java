package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.domain.Inscricao;
import com.escola.gestaoescolar.repository.InscricaoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InscricaoService {

    private final InscricaoRepository inscricaoRepository;

    public InscricaoService(InscricaoRepository inscricaoRepository) {
        this.inscricaoRepository = inscricaoRepository;
    }

    public List<Inscricao> listarTodos() {
        return inscricaoRepository.findAll();
    }

    public Inscricao salvar(Inscricao inscricao) {
        return inscricaoRepository.save(inscricao);
    }

    public Inscricao buscarPorId(Long id) {
        return inscricaoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Inscrição não encontrada"));
    }
}
