package com.substring.chat.controllers;

import com.substring.chat.config.AppConstants;
import com.substring.chat.entities.Message;
import com.substring.chat.entities.Room;
import com.substring.chat.repositories.MessageRepository;
import com.substring.chat.repositories.RoomRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/rooms")
@CrossOrigin(AppConstants.FRONT_END_BASE_URL)
public class RoomController {

    private final RoomRepository roomRepository;
    private final MessageRepository messageRepository;

    public RoomController(RoomRepository roomRepository, MessageRepository messageRepository) {
        this.roomRepository = roomRepository;
        this.messageRepository = messageRepository;
    }

    // create room
    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody Map<String, String> payload) {
        String roomId = payload.get("roomId");
        String roomName = payload.get("roomName");
        if (roomId == null || roomId.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Room ID is required!");
        }
        if (roomRepository.findByRoomId(roomId) != null) {
            return ResponseEntity.badRequest().body("Room already exists!");
        }
        Room room = new Room();
        room.setRoomId(roomId);
        room.setRoomName(roomName != null ? roomName : "Room " + roomId);
        Room savedRoom = roomRepository.save(room);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedRoom);
    }

    // join room
    @GetMapping("/{roomId}")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId) {
        Room room = roomRepository.findByRoomId(roomId);
        if (room == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Room not found!!");
        }
        return ResponseEntity.ok(room);
    }

    // get messages of room (Scalable approach)
    @GetMapping("/{roomId}/messages")
    public ResponseEntity<List<Message>> getMessages(
            @PathVariable String roomId,
            @RequestParam(value = "limit", defaultValue = "50", required = false) int limit) {

        // Fetching messages directly from MessageRepository instead of Room entity
        List<Message> messages = messageRepository.findByRoomId(roomId);

        // Return last N messages for better performance
        if (messages.size() > limit) {
            messages = messages.subList(messages.size() - limit, messages.size());
        }

        return ResponseEntity.ok(messages);
    }

    // get all rooms
    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms() {
        return ResponseEntity.ok(roomRepository.findAll());
    }
}