package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "notifications")
public class NotificationEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private UserEntity user;
 @Column(nullable = false, length = 150) private String title;
 @Column(nullable = false, columnDefinition = "TEXT") private String content;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private NotificationType type;
 @Column(name = "is_read", nullable = false) private boolean read;
 public Long getId(){return id;} public UserEntity getUser(){return user;} public void setUser(UserEntity user){this.user=user;} public String getTitle(){return title;} public void setTitle(String title){this.title=title;} public String getContent(){return content;} public void setContent(String content){this.content=content;} public NotificationType getType(){return type;} public void setType(NotificationType type){this.type=type;} public boolean isRead(){return read;} public void setRead(boolean read){this.read=read;}
}
