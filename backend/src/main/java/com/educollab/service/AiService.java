package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.AiDtos.*;
import com.educollab.model.AiUsageLogEntity;
import com.educollab.repo.AiUsageLogRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiService {
    private final String provider;
    private final String baseUrl;
    private final String apiKey;
    private final String model;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final AuthService authService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiService(@Value("${app.ai.provider:openai-compatible}") String provider,
                     @Value("${app.ai.base-url:https://api.openai.com/v1}") String baseUrl,
                     @Value("${app.ai.api-key:}") String apiKey,
                     @Value("${app.ai.model:gpt-4o-mini}") String model,
                     AiUsageLogRepository aiUsageLogRepository,
                     AuthService authService) {
        this.provider = provider;
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.aiUsageLogRepository = aiUsageLogRepository;
        this.authService = authService;
    }

    @Transactional
    public AiReply ask(AiRequest request, JwtPrincipal principal) {
        if (apiKey == null || apiKey.isBlank()) throw new ApiException("AI 模型未配置，请设置 API Key");
        String scenario = request.scenario() == null || request.scenario().isBlank() ? "general" : request.scenario();
        try {
            String systemPrompt = "你是 EduCollab 的课程协作 AI 助手，负责项目周报、任务拆解、风险提示、文档摘要和讨论总结。请用简洁中文回答。";
            String body = objectMapper.createObjectNode()
                .put("model", model)
                .set("messages", objectMapper.createArrayNode()
                    .add(objectMapper.createObjectNode().put("role", "system").put("content", systemPrompt))
                    .add(objectMapper.createObjectNode().put("role", "user").put("content", request.prompt())))
                .toString();
            HttpRequest httpRequest = HttpRequest.newBuilder(URI.create(baseUrl + "/chat/completions"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(60))
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
            HttpResponse<String> response = HttpClient.newHttpClient().send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() >= 300) throw new ApiException("AI 调用失败: " + response.body());
            JsonNode json = objectMapper.readTree(response.body());
            String content = json.path("choices").path(0).path("message").path("content").asText();
            saveLog(principal, scenario, true, request.prompt());
            return new AiReply(content, provider, model);
        } catch (Exception ex) {
            saveLog(principal, scenario, false, request.prompt());
            throw ex instanceof ApiException ? (ApiException) ex : new ApiException("AI 调用异常: " + ex.getMessage());
        }
    }

    private void saveLog(JwtPrincipal principal, String scenario, boolean success, String prompt) {
        AiUsageLogEntity entity = new AiUsageLogEntity();
        entity.setUser(authService.getUser(principal.userId()));
        entity.setScenario(scenario);
        entity.setModelName(model);
        entity.setSuccess(success);
        entity.setPromptPreview(prompt == null ? "" : prompt.substring(0, Math.min(120, prompt.length())));
        aiUsageLogRepository.save(entity);
    }
}
