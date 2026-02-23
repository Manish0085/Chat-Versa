package com.substring.chat.kafka;

import com.substring.chat.entities.Message;
import com.substring.chat.repositories.MessageRepository;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class KafkaConsumer {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;

    public KafkaConsumer(SimpMessagingTemplate messagingTemplate, MessageRepository messageRepository) {
        this.messagingTemplate = messagingTemplate;
        this.messageRepository = messageRepository;
    }

    @KafkaListener(topics = "chat-messages", groupId = "chat-group")
    public void consume(Message message) {
        log.info("Consumed message from Kafka: {}", message.getContent());

        // 1. Persist to MongoDB asynchronously (Scaling persistence)
        messageRepository.save(message);

        // 2. Broadcast to WebSocket topic for real-time delivery
        if (message.getRoomId() != null) {
            messagingTemplate.convertAndSend("/topic/room/" + message.getRoomId(), message);
            log.info("Broadcasted message to room: {}", message.getRoomId());
        }
    }
}
