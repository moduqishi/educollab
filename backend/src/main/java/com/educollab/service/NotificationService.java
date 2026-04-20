package com.educollab.service;

import com.educollab.dto.WorkspaceDtos.NotificationDetail;
import com.educollab.dto.WorkspaceDtos.NotificationItem;
import com.educollab.model.NotificationEntity;
import com.educollab.model.NotificationType;
import com.educollab.model.UserEntity;
import com.educollab.repo.NotificationRepository;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class NotificationService {
  private final NotificationRepository notificationRepository;
  private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public NotificationService(NotificationRepository notificationRepository) {
    this.notificationRepository = notificationRepository;
  }

  @Transactional
  public void create(
      UserEntity user,
      String title,
      String content,
      NotificationType type,
      NotificationTarget target) {
    NotificationEntity entity = new NotificationEntity();
    entity.setUser(user);
    entity.setTitle(title);
    entity.setContent(content);
    entity.setType(type);
    entity.setSourceType(target.sourceType());
    entity.setSourceId(target.sourceId());
    entity.setSourcePath(target.sourcePath());
    entity.setSourceLabel(target.sourceLabel());
    entity.setRead(false);
    notificationRepository.save(entity);
  }

  public List<NotificationItem> list(Long userId) {
    return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
        .map(this::toItem)
        .toList();
  }

  public NotificationDetail detail(Long notificationId, Long userId) {
    NotificationEntity entity = requireOwnedNotification(notificationId, userId);
    return toDetail(entity);
  }

  @Transactional
  public void markRead(Long notificationId, Long userId) {
    NotificationEntity entity = requireOwnedNotification(notificationId, userId);
    if (!entity.isRead()) {
      entity.setRead(true);
      notificationRepository.save(entity);
    }
  }

  @Transactional
  public void markAllRead(Long userId) {
    notificationRepository.markAllReadByUserId(userId);
  }

  private NotificationEntity requireOwnedNotification(Long notificationId, Long userId) {
    return notificationRepository.findByIdAndUserId(notificationId, userId)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "通知不存在"));
  }

  private NotificationItem toItem(NotificationEntity item) {
    return new NotificationItem(
        item.getId(),
        item.getTitle(),
        item.getContent(),
        item.isRead(),
        formatter.format(item.getCreatedAt()),
        item.getType().name(),
        item.getSourceType() != null ? item.getSourceType().name() : null,
        item.getSourceId(),
        item.getSourcePath(),
        item.getSourceLabel());
  }

  private NotificationDetail toDetail(NotificationEntity item) {
    return new NotificationDetail(
        item.getId(),
        item.getTitle(),
        item.getContent(),
        item.isRead(),
        formatter.format(item.getCreatedAt()),
        item.getType().name(),
        item.getSourceType() != null ? item.getSourceType().name() : null,
        item.getSourceId(),
        item.getSourcePath(),
        item.getSourceLabel());
  }
}
