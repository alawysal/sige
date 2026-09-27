package com.escola.gestaoescolar.domain;

public enum Role {
    ADMIN,
    DIRETOR,
    DIRECAO,
    PROFESSOR,
    SECRETARIA,
    SECRETARIO,
    FINANCEIRO,
    ALUNO;

    public static String normalize(String raw) {
        if (raw == null) {
            return "ADMIN";
        }

        String normalized = raw.trim().toUpperCase();
        if (normalized.startsWith("ROLE_")) {
            normalized = normalized.substring(5);
        }

        return switch (normalized) {
            case "DIRECAO" -> "DIRETOR";
            case "SECRETARIO" -> "SECRETARIA";
            default -> normalized;
        };
    }
}
