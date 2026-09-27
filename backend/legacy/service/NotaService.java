package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.domain.Nota;
import com.escola.gestaoescolar.repository.NotaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotaService {

    private final NotaRepository notaRepository;

    public NotaService(NotaRepository notaRepository) {
        this.notaRepository = notaRepository;
    }

    public List<Nota> listarTodos() {
        return notaRepository.findAll();
    }

    public Nota salvar(Nota nota) {
        return notaRepository.save(nota);
    }

    public Nota buscarPorId(Long id) {
        return notaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Nota não encontrada"));
    }
}
