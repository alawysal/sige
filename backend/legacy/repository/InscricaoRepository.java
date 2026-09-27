package com.escola.gestaoescolar.repository;

import com.escola.gestaoescolar.domain.Inscricao;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InscricaoRepository extends JpaRepository<Inscricao, Long> {
}
