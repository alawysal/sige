FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp verify

FROM eclipse-temurin:17-jre-jammy
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN groupadd --system sige && useradd --system --gid sige sige
COPY --from=build /workspace/target/gestaoescolar-0.0.1-SNAPSHOT.jar /app/app.jar
USER sige
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
