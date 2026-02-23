package com.substring.chat.kafka;

import com.substring.chat.entities.Message;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
public class KafkaProducer {

    private final KafkaTemplate<String, Message> kafkaTemplate;
    private static final String TOPIC = "chat-messages";

    public KafkaProducer(KafkaTemplate<String, Message> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendMessage(Message message) {
        try {
            // Use roomId as the partition key to ensure message ordering
            // Send asynchronously to avoid blocking the main WebSocket thread if Kafka is
            // slow or down
            kafkaTemplate.send(TOPIC, message.getRoomId(), message).whenComplete((result, ex) -> {
                if (ex != null) {
                    log.error("Kafka delivery failed for message from {}: {}", message.getSender(), ex.getMessage());
                } else {
                    log.info("Message sent to Kafka successfully: offset {}", result.getRecordMetadata().offset());
                }
            });
        } catch (Exception e) {
            log.error("Immediate error while handing message to Kafka producer: {}", e.getMessage());
            throw e; // Rethrow to trigger fallback logic in Controller if needed
        }
    }
}
