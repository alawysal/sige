package com.escola.gestaoescolar.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "anos_letivos")
public class AnoLetivo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String nome;

    @Column(nullable = false)
    private java.time.LocalDate dataInicio;

    @Column(nullable = false)
    private java.time.LocalDate dataFim;

    @Column(nullable = false)
    private boolean ativo = false;

    public AnoLetivo() {
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

    public java.time.LocalDate getDataInicio() {
        return dataInicio;
    }

    public void setDataInicio(java.time.LocalDate dataInicio) {
        this.dataInicio = dataInicio;
    }

    public java.time.LocalDate getDataFim() {
        return dataFim;
    }

    public void setDataFim(java.time.LocalDate dataFim) {
        this.dataFim = dataFim;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public void setAtivo(boolean ativo) {
        this.ativo = ativo;
    }
}
