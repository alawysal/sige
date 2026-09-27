package com.escola.gestaoescolar.repository;

import com.escola.gestaoescolar.domain.Curso;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CursoRepository extends JpaRepository<Curso, Long> {
}
