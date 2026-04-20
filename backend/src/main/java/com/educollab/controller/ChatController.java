package com.educollab.controller;

import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.ChatService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @GetMapping("/rooms")
    public List<ChatRoomRecord> listRooms() {
        return chatService.listRooms();
    }

    @GetMapping("/rooms/{roomId}/messages")
    public List<ChatMessageRecord> messages(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return chatService.messages(roomId, page, size);
    }

    @PostMapping("/rooms/{roomId}/messages")
    public ChatMessageRecord sendMessage(@PathVariable Long roomId, @RequestBody ChatMessageSendRequest request) {
        return chatService.sendMessage(new ChatMessageSendRequest(
                roomId, request.content(), request.fileAssetId(), request.fileName(), request.fileSizeBytes(), request.mimeType()));
    }

    @GetMapping("/rooms/project/{projectId}")
    public ChatRoomRecord projectRoom(@PathVariable Long projectId) {
        return chatService.getOrCreateProjectRoom(projectId);
    }

    @GetMapping("/rooms/course/{courseId}")
    public ChatRoomRecord courseRoom(@PathVariable Long courseId) {
        return chatService.getOrCreateCourseRoom(courseId);
    }
}