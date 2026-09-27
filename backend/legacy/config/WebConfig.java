package com.escola.gestaoescolar.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/dashboard").setViewName("forward:/index.html");
        registry.addViewController("/alunos").setViewName("forward:/index.html");
        registry.addViewController("/inscricoes").setViewName("forward:/index.html");
        registry.addViewController("/renovacoes").setViewName("forward:/index.html");
        registry.addViewController("/turmas").setViewName("forward:/index.html");
        registry.addViewController("/classes").setViewName("forward:/index.html");
        registry.addViewController("/cursos").setViewName("forward:/index.html");
        registry.addViewController("/materias").setViewName("forward:/index.html");
        registry.addViewController("/notas").setViewName("forward:/index.html");
        registry.addViewController("/pagamentos").setViewName("forward:/index.html");
        registry.addViewController("/relatorios").setViewName("forward:/index.html");
        registry.addViewController("/documentos").setViewName("forward:/index.html");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String frontendDistPath = Paths.get(System.getProperty("user.dir"), "..", "frontend", "dist", "frontend")
            .toAbsolutePath()
            .toString();

        registry.addResourceHandler("/assets/**", "/favicon.ico", "/**")
            .addResourceLocations("file:" + frontendDistPath + "/")
            .resourceChain(true)
            .addResolver(new PathResourceResolver() {
                @Override
                protected Resource getResource(String resourcePath, Resource location) throws IOException {
                    Resource requested = location.createRelative(resourcePath);
                    if (requested.exists() && requested.isReadable()) {
                        return requested;
                    }

                    Resource fallback = new ClassPathResource("index.html");
                    if (fallback.exists()) {
                        return fallback;
                    }

                    return super.getResource(resourcePath, location);
                }
            });
    }
}
