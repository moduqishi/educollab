package com.educollab.service;

import com.educollab.common.security.JwtPrincipal;
import com.educollab.model.AdminAuditEventEntity;
import com.educollab.model.UserEntity;
import com.educollab.repo.AdminAuditEventRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminAuditService {
  private final AdminAuditEventRepository adminAuditEventRepository;
  private final AuthService authService;
  private final ObjectMapper objectMapper;
  private final Path logRoot;
  private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public AdminAuditService(
      AdminAuditEventRepository adminAuditEventRepository,
      AuthService authService,
      ObjectMapper objectMapper,
      @Value("${app.logs.root:./data/logs}") String logRoot) {
    this.adminAuditEventRepository = adminAuditEventRepository;
    this.authService = authService;
    this.objectMapper = objectMapper;
    this.logRoot = Path.of(logRoot);
  }

  @Transactional
  public AdminAuditEventEntity record(
      JwtPrincipal principal,
      String scopeType,
      Long scopeId,
      String scopeTitle,
      String actionType,
      String detailText) {
    UserEntity admin = authService.getUser(principal.userId());
    AdminAuditEventEntity entity = new AdminAuditEventEntity();
    entity.setAdminUser(admin);
    entity.setScopeType(scopeType);
    entity.setScopeId(scopeId);
    entity.setScopeTitle(scopeTitle);
    entity.setActionType(actionType);
    entity.setDetailText(detailText);
    entity = adminAuditEventRepository.save(entity);
    appendAuditLog(entity);
    return entity;
  }

  private void appendAuditLog(AdminAuditEventEntity entity) {
    try {
      Path dir = logRoot.resolve("admin").resolve("audit");
      Files.createDirectories(dir);
      Path file = dir.resolve("events.jsonl");
      Map<String, Object> payloadMap = new LinkedHashMap<>();
      payloadMap.put("id", entity.getId());
      payloadMap.put("scopeType", entity.getScopeType());
      payloadMap.put("scopeId", entity.getScopeId());
      payloadMap.put("scopeTitle", entity.getScopeTitle());
      payloadMap.put("actionType", entity.getActionType());
      payloadMap.put("detailText", entity.getDetailText());
      payloadMap.put("adminUserId", entity.getAdminUser() != null ? entity.getAdminUser().getId() : null);
      payloadMap.put("adminName", entity.getAdminUser() != null ? entity.getAdminUser().getName() : null);
      payloadMap.put("createdAt", entity.getCreatedAt() != null ? formatter.format(entity.getCreatedAt()) : null);
      String payload = objectMapper.writeValueAsString(payloadMap);
      Files.writeString(file, payload + "\n", StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
    } catch (IOException ignored) {
    }
  }
}
