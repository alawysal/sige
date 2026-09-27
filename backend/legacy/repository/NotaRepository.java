package com.escola.gestaoescolar.repository;

import com.escola.gestaoescolar.domain.Nota;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotaRepository extends JpaRepository<Nota, Long> {
}
