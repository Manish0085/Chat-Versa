package com.substring.chat.controllers;

import com.substring.chat.payload.CallPayload;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class CallController {

    private final SimpMessagingTemplate messagingTemplate;

    public CallController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/call.signal")
    public void handleSignal(@Payload CallPayload payload) {
        // Broadcast signaling data to the specific room or user
        // In a real app, you'd send this to the specific user 'to'
        messagingTemplate.convertAndSend("/topic/call/" + payload.getRoomId(), payload);
    }
}
