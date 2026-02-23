package com.substring.chat.entities;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "messages")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class Message {

    @Id
    private String id;
    private String sender;
    private String content;
    private LocalDateTime timeStamp;
    private String roomId;
    private String fileUrl;
    private String fileName;
    private String fileType;

    // Status for Read Receipts
    private MessageStatus status = MessageStatus.SENT;

    public Message(String sender, String content) {
        this.sender = sender;
        this.content = content;
        this.timeStamp = LocalDateTime.now();
        this.status = MessageStatus.SENT;
    }

    public enum MessageStatus {
        SENT, DELIVERED, READ
    }
}