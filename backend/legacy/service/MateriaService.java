package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.domain.Materia;
import com.escola.gestaoescolar.repository.MateriaRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MateriaService {

    private final MateriaRepository materiaRepository;

    public MateriaService(MateriaRepository materiaRepository) {
        this.materiaRepository = materiaRepository;
    }

    public List<Materia> listarTodos() {
        return materiaRepository.findAll();
    }

    public Materia salvar(Materia materia) {
        return materiaRepository.save(materia);
    }

    public Materia buscarPorId(Long id) {
        return materiaRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Matéria não encontrada"));
    }
}
