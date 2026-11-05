FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml ./
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B verify

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/* \
    && groupadd --system sige && useradd --system --gid sige --home-dir /app sige

COPY --from=build /workspace/target/gestaoescolar-0.0.1-SNAPSHOT.jar /app/app.jar

USER sige
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar", "--spring.profiles.active=prod"]
