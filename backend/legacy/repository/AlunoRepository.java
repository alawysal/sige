package com.escola.gestaoescolar.repository;

import com.escola.gestaoescolar.domain.Aluno;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AlunoRepository extends JpaRepository<Aluno, Long> {
}
