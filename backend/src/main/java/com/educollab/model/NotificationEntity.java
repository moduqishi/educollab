package com.educollab.model;
import jakarta.persistence.*;

@Entity
@Table(name = "notifications")
public class NotificationEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(nullable = false, length = 150)
  private String title;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private NotificationType type;

  @Enumerated(EnumType.STRING)
  @Column(name = "source_type", length = 20)
  private NotificationSourceType sourceType;

  @Column(name = "source_id")
  private Long sourceId;

  @Column(name = "source_path", length = 255)
  private String sourcePath;

  @Column(name = "source_label", length = 100)
  private String sourceLabel;

  @Column(name = "is_read", nullable = false)
  private boolean read;

  public Long getId() {
    return id;
  }

  public UserEntity getUser() {
    return user;
  }

  public void setUser(UserEntity user) {
    this.user = user;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public NotificationType getType() {
    return type;
  }

  public void setType(NotificationType type) {
    this.type = type;
  }

  public NotificationSourceType getSourceType() {
    return sourceType;
  }

  public void setSourceType(NotificationSourceType sourceType) {
    this.sourceType = sourceType;
  }

  public Long getSourceId() {
    return sourceId;
  }

  public void setSourceId(Long sourceId) {
    this.sourceId = sourceId;
  }

  public String getSourcePath() {
    return sourcePath;
  }

  public void setSourcePath(String sourcePath) {
    this.sourcePath = sourcePath;
  }

  public String getSourceLabel() {
    return sourceLabel;
  }

  public void setSourceLabel(String sourceLabel) {
    this.sourceLabel = sourceLabel;
  }

  public boolean isRead() {
    return read;
  }

  public void setRead(boolean read) {
    this.read = read;
  }
}
