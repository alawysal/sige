package com.escola.gestaoescolar.repository;

import com.escola.gestaoescolar.domain.Pagamento;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {
}
