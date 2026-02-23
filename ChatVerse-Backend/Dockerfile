# Build stage
FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081

# Environment variables for cloud configuration
ENV MONGODB_URI=mongodb://localhost:27017/chatapp
ENV KAFKA_BOOTSTRAP_SERVERS=localhost:9092
ENV FRONT_END_BASE_URL=https://chat-versa-zm6p.vercel.app

ENTRYPOINT ["java", "-jar", "app.jar"]
