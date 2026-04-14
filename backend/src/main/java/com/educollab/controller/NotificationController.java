package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.NotificationItem;
import com.educollab.service.NotificationService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    public NotificationController(NotificationService notificationService) { this.notificationService = notificationService; }
    @GetMapping public List<NotificationItem> list() { return notificationService.list(SecurityUtils.principal().userId()); }
    @PostMapping("/{id}/read") public void markRead(@PathVariable Long id) { notificationService.markRead(id, SecurityUtils.principal().userId()); }
}
