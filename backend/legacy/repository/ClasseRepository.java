package com.escola.gestaoescolar.repository;

import com.escola.gestaoescolar.domain.Classe;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClasseRepository extends JpaRepository<Classe, Long> {
}
