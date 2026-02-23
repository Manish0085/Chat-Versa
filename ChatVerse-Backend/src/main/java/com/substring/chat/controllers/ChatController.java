package com.substring.chat.controllers;

import com.substring.chat.config.AppConstants;
import com.substring.chat.entities.Message;
import com.substring.chat.kafka.KafkaProducer;
import com.substring.chat.payload.MessageRequest;
import com.substring.chat.repositories.MessageRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.RequestBody;

import java.time.LocalDateTime;
import java.util.Map;

@Controller
@CrossOrigin(AppConstants.FRONT_END_BASE_URL)
@Slf4j
public class ChatController {

    private final KafkaProducer kafkaProducer;
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageRepository messageRepository;

    public ChatController(KafkaProducer kafkaProducer, SimpMessagingTemplate messagingTemplate,
            MessageRepository messageRepository) {
        this.kafkaProducer = kafkaProducer;
        this.messagingTemplate = messagingTemplate;
        this.messageRepository = messageRepository;
    }

    @MessageMapping("/sendMessage/{roomId}")
    public void sendMessage(@DestinationVariable String roomId, @RequestBody MessageRequest request) {
        Message message = new Message();
        message.setContent(request.getContent());
        message.setSender(request.getSender());
        message.setTimeStamp(LocalDateTime.now());
        message.setRoomId(roomId);
        message.setFileUrl(request.getFileUrl());
        message.setFileName(request.getFileName());
        message.setFileType(request.getFileType());
        message.setStatus(Message.MessageStatus.SENT);

        // 1. Primary Save & Broadcast (Local Instance Resilience)
        // This ensures the message appears instantly for the sender and anyone on this
        // server
        // even if Kafka cloud or local Kafka is currently down.
        try {
            messageRepository.save(message); // Persist to MongoDB (which is up)
            messagingTemplate.convertAndSend("/topic/room/" + roomId, message);
            log.info("Message handled locally for room: {}", roomId);
        } catch (Exception e) {
            log.error("Local persistence failed: {}", e.getMessage());
        }

        // 2. Secondary Distribution (Kafka for Multi-Instance Scaling)
        // This distributes the message to other backend instances in a production
        // cluster.
        kafkaProducer.sendMessage(message);
    }

    @MessageMapping("/typing/{roomId}")
    public void handleTyping(@DestinationVariable String roomId, @RequestBody Map<String, String> payload) {
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/typing", payload);
    }

    @MessageMapping("/read/{roomId}")
    public void handleReadReceipt(@DestinationVariable String roomId, @RequestBody Map<String, String> payload) {
        String messageId = payload.get("messageId");
        if (messageId != null) {
            messageRepository.findById(messageId).ifPresent(msg -> {
                msg.setStatus(Message.MessageStatus.READ);
                messageRepository.save(msg);
            });
        }
        messagingTemplate.convertAndSend("/topic/room/" + roomId + "/status", payload);
    }
}