package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.AiDtos.*;
import com.educollab.model.AiConfigurationEntity;
import com.educollab.model.AiUsageLogEntity;
import com.educollab.repo.AiConfigurationRepository;
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
    private final AiConfigurationRepository aiConfigRepository;
    private final AiUsageLogRepository aiUsageLogRepository;
    private final AuthService authService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Fallback values from application.yml
    @Value("${app.ai.provider:doubao}") private String fallbackProvider;
    @Value("${app.ai.base-url:https://ark.cn-beijing.volces.com/api/v3}") private String fallbackBaseUrl;
    @Value("${app.ai.api-key:}") private String fallbackApiKey;
    @Value("${app.ai.model:doubao-pro-32k}") private String fallbackModel;

    public AiService(AiConfigurationRepository aiConfigRepository,
                     AiUsageLogRepository aiUsageLogRepository,
                     AuthService authService) {
        this.aiConfigRepository = aiConfigRepository;
        this.aiUsageLogRepository = aiUsageLogRepository;
        this.authService = authService;
    }

    private AiConfigurationEntity getActiveConfig() {
        return aiConfigRepository.findTopByOrderByIdDesc().orElse(null);
    }

    @Transactional
    public AiReply ask(AiRequest request, JwtPrincipal principal) {
        AiConfigurationEntity config = getActiveConfig();
        String provider = config != null ? config.getProvider() : fallbackProvider;
        String baseUrl = config != null ? config.getBaseUrl() : fallbackBaseUrl;
        String apiKey = config != null ? config.getApiKey() : fallbackApiKey;
        String model = config != null ? config.getModel() : fallbackModel;

        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiException("AI 模型未配置，请联系管理员");
        }
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
            saveLog(principal, scenario, true, request.prompt(), model);
            return new AiReply(content, provider, model);
        } catch (Exception ex) {
            saveLog(principal, scenario, false, request.prompt(), model);
            throw ex instanceof ApiException ? (ApiException) ex : new ApiException("AI 调用异常: " + ex.getMessage());
        }
    }

    private void saveLog(JwtPrincipal principal, String scenario, boolean success, String prompt, String model) {
        AiUsageLogEntity entity = new AiUsageLogEntity();
        entity.setUser(authService.getUser(principal.userId()));
        entity.setScenario(scenario);
        entity.setModelName(model);
        entity.setSuccess(success);
        entity.setPromptPreview(prompt == null ? "" : prompt.substring(0, Math.min(120, prompt.length())));
        aiUsageLogRepository.save(entity);
    }
}