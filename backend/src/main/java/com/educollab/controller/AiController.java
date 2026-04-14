package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.AiDtos.*;
import com.educollab.service.AiService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AiController {
    private final AiService aiService;
    public AiController(AiService aiService) { this.aiService = aiService; }
    @PostMapping("/chat") public AiReply chat(@RequestBody AiRequest request) { return aiService.ask(request, SecurityUtils.principal()); }
}
