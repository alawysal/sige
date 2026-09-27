package com.escola.gestaoescolar;

import com.escola.gestaoescolar.security.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class JwtServiceTest {

    @Test
    void shouldGenerateAndValidateJwtUsingConfiguredSecret() {
        JwtService jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret", "QjY4c3Q4M1pOc2VnVWo2U0RvS1JmYk9nT0RqcGJZb1Q2U3V2N0M0Q==");
        ReflectionTestUtils.setField(jwtService, "expirationMs", 86_400_000L);

        User user = new User("admin", "admin123", java.util.List.of());

        String token = jwtService.generateToken(user);

        assertEquals("admin", jwtService.extractUsername(token));
        assertTrue(jwtService.isTokenValid(token, user));
    }
}
