package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.domain.Professor;
import com.escola.gestaoescolar.repository.ProfessorRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProfessorService {

    private final ProfessorRepository professorRepository;

    public ProfessorService(ProfessorRepository professorRepository) {
        this.professorRepository = professorRepository;
    }

    public List<Professor> listarTodos() {
        return professorRepository.findAll();
    }

    public Professor salvar(Professor professor) {
        return professorRepository.save(professor);
    }

    public Professor buscarPorId(Long id) {
        return professorRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Professor não encontrado"));
    }
}
