package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.domain.Classe;
import com.escola.gestaoescolar.repository.ClasseRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ClasseService {

    private final ClasseRepository classeRepository;

    public ClasseService(ClasseRepository classeRepository) {
        this.classeRepository = classeRepository;
    }

    public List<Classe> listarTodos() {
        return classeRepository.findAll();
    }

    public Classe salvar(Classe classe) {
        return classeRepository.save(classe);
    }

    public Classe buscarPorId(Long id) {
        return classeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Classe não encontrada"));
    }
}
