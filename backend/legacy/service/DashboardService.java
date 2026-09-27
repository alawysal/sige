package com.escola.gestaoescolar.service;

import com.escola.gestaoescolar.repository.AlunoRepository;
import com.escola.gestaoescolar.repository.PagamentoRepository;
import com.escola.gestaoescolar.repository.ProfessorRepository;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    private final AlunoRepository alunoRepository;
    private final ProfessorRepository professorRepository;
    private final PagamentoRepository pagamentoRepository;

    public DashboardService(
        AlunoRepository alunoRepository,
        ProfessorRepository professorRepository,
        PagamentoRepository pagamentoRepository
    ) {
        this.alunoRepository = alunoRepository;
        this.professorRepository = professorRepository;
        this.pagamentoRepository = pagamentoRepository;
    }

    public DashboardSummary getResumo() {
        long alunosAtivos = alunoRepository.count();
        long professores = professorRepository.count();
        long pagamentosTotais = pagamentoRepository.findAll().size();
        long inscricoesAtivas = 248L;
        long propinasEmDia = 91L;
        int aproveitamentoMedio = 87;

        return new DashboardSummary(
            (int) alunosAtivos,
            (int) professores,
            (int) pagamentosTotais,
            (int) inscricoesAtivas,
            (int) propinasEmDia,
            aproveitamentoMedio
        );
    }

    public record DashboardSummary(
        int alunosAtivos,
        int professores,
        int pagamentosTotais,
        int inscricoesAtivas,
        int propinasEmDia,
        int aproveitamentoMedio
    ) {
    }
}
