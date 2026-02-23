package com.substring.chat.config;

import com.substring.chat.entities.User;
import com.substring.chat.repositories.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class PresenceEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    // Map session ID to username for quick lookup on disconnect
    private final Map<String, String> sessionUserMap = new ConcurrentHashMap<>();

    public PresenceEventListener(SimpMessagingTemplate messagingTemplate, UserRepository userRepository) {
        this.messagingTemplate = messagingTemplate;
        this.userRepository = userRepository;
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = headerAccessor.getFirstNativeHeader("username");
        String sessionId = headerAccessor.getSessionId();

        if (username != null && sessionId != null) {
            log.info("User connected: {} (Session: {})", username, sessionId);
            sessionUserMap.put(sessionId, username);
            updateUserPresence(username, true);
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();

        if (sessionId != null && sessionUserMap.containsKey(sessionId)) {
            String username = sessionUserMap.remove(sessionId);
            log.info("User disconnected: {} (Session: {})", username, sessionId);
            updateUserPresence(username, false);
        }
    }

    private void updateUserPresence(String username, boolean online) {
        userRepository.findByEmail(username).ifPresent(user -> {
            user.setOnline(online);
            user.setLastSeen(LocalDateTime.now());
            userRepository.save(user);

            // Broadcast presence update to everyone
            messagingTemplate.convertAndSend("/topic/presence", Map.of(
                    "email", username,
                    "online", online,
                    "lastSeen", user.getLastSeen()));
        });
    }
}
