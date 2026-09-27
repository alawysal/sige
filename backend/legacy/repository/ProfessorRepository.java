package com.escola.gestaoescolar.repository;

import com.escola.gestaoescolar.domain.Professor;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfessorRepository extends JpaRepository<Professor, Long> {
}
