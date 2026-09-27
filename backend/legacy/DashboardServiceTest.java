package com.escola.gestaoescolar;

import com.escola.gestaoescolar.domain.Aluno;
import com.escola.gestaoescolar.domain.Pagamento;
import com.escola.gestaoescolar.domain.Professor;
import com.escola.gestaoescolar.repository.AlunoRepository;
import com.escola.gestaoescolar.repository.PagamentoRepository;
import com.escola.gestaoescolar.repository.ProfessorRepository;
import com.escola.gestaoescolar.service.DashboardService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private AlunoRepository alunoRepository;

    @Mock
    private ProfessorRepository professorRepository;

    @Mock
    private PagamentoRepository pagamentoRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    void shouldSummarizeMainSchoolMetrics() {
        when(alunoRepository.count()).thenReturn(1284L);
        when(professorRepository.count()).thenReturn(64L);
        when(pagamentoRepository.findAll()).thenReturn(List.of(
            new Pagamento(),
            new Pagamento(),
            new Pagamento()
        ));

        var metrics = dashboardService.getResumo();

        assertEquals(1284, metrics.alunosAtivos());
        assertEquals(64, metrics.professores());
        assertEquals(3, metrics.pagamentosTotais());
    }
}
