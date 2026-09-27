package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.domain.Curso;
import com.escola.gestaoescolar.repository.CursoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CursoService {

    private final CursoRepository cursoRepository;

    public CursoService(CursoRepository cursoRepository) {
        this.cursoRepository = cursoRepository;
    }

    public List<Curso> listarTodos() {
        return cursoRepository.findAll();
    }

    public Curso salvar(Curso curso) {
        return cursoRepository.save(curso);
    }

    public Curso buscarPorId(Long id) {
        return cursoRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Curso não encontrado"));
    }
}
