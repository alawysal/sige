package com.escola.gestaoescolar.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "classes")
public class Classe {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @ManyToOne
    @JoinColumn(name = "curso_id")
    private Curso curso;

    @ManyToOne
    @JoinColumn(name = "ano_letivo_id")
    private AnoLetivo anoLetivo;

    @Column(nullable = false)
    private String turma;

    @Column(nullable = false)
    private String turno;

    @Column(nullable = false)
    private Double valorInscricao;

    @Column(nullable = false)
    private Double valorPropina;

    @Column(nullable = false)
    private Integer numeroNegativasParaRecurso;

    public Classe() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public Curso getCurso() {
        return curso;
    }

    public void setCurso(Curso curso) {
        this.curso = curso;
    }

    public AnoLetivo getAnoLetivo() {
        return anoLetivo;
    }

    public void setAnoLetivo(AnoLetivo anoLetivo) {
        this.anoLetivo = anoLetivo;
    }

    public String getTurma() {
        return turma;
    }

    public void setTurma(String turma) {
        this.turma = turma;
    }

    public String getTurno() {
        return turno;
    }

    public void setTurno(String turno) {
        this.turno = turno;
    }

    public Double getValorInscricao() {
        return valorInscricao;
    }

    public void setValorInscricao(Double valorInscricao) {
        this.valorInscricao = valorInscricao;
    }

    public Double getValorPropina() {
        return valorPropina;
    }

    public void setValorPropina(Double valorPropina) {
        this.valorPropina = valorPropina;
    }

    public Integer getNumeroNegativasParaRecurso() {
        return numeroNegativasParaRecurso;
    }

    public void setNumeroNegativasParaRecurso(Integer numeroNegativasParaRecurso) {
        this.numeroNegativasParaRecurso = numeroNegativasParaRecurso;
    }
}
