package com.escola.gestaoescolar.repository;

import com.escola.gestaoescolar.domain.Materia;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MateriaRepository extends JpaRepository<Materia, Long> {
}
