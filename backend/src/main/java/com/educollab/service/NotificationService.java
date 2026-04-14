package com.educollab.service;
import com.educollab.dto.WorkspaceDtos.NotificationItem; import com.educollab.model.NotificationEntity; import com.educollab.model.NotificationType; import com.educollab.model.UserEntity; import com.educollab.repo.NotificationRepository; import java.time.format.DateTimeFormatter; import java.util.List; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
@Service
public class NotificationService {
  private final NotificationRepository notificationRepository; private final DateTimeFormatter formatter=DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
  public NotificationService(NotificationRepository notificationRepository){this.notificationRepository=notificationRepository;}
  @Transactional public void create(UserEntity user, String title, String content, NotificationType type){NotificationEntity entity=new NotificationEntity(); entity.setUser(user); entity.setTitle(title); entity.setContent(content); entity.setType(type); entity.setRead(false); notificationRepository.save(entity);} 
  public List<NotificationItem> list(Long userId){return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream().map(item -> new NotificationItem(item.getId(), item.getTitle(), item.getContent(), item.isRead(), formatter.format(item.getCreatedAt()), item.getType().name())).toList();}
  @Transactional public void markRead(Long notificationId, Long userId){notificationRepository.findById(notificationId).ifPresent(item -> { if(item.getUser().getId().equals(userId)){ item.setRead(true); notificationRepository.save(item);} });}
}
