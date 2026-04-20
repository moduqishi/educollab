package com.educollab.model;

import jakarta.persistence.*;

@Entity
@Table(name = "class_invitations")
public class ClassInvitationEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private CourseEntity course;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "invited_user_id", nullable = false)
  private UserEntity invitedUser;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "invited_by_user_id", nullable = false)
  private UserEntity invitedByUser;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ClassInvitationStatus status = ClassInvitationStatus.PENDING;

  public Long getId() { return id; }
  public CourseEntity getCourse() { return course; }
  public void setCourse(CourseEntity course) { this.course = course; }
  public UserEntity getInvitedUser() { return invitedUser; }
  public void setInvitedUser(UserEntity invitedUser) { this.invitedUser = invitedUser; }
  public UserEntity getInvitedByUser() { return invitedByUser; }
  public void setInvitedByUser(UserEntity invitedByUser) { this.invitedByUser = invitedByUser; }
  public ClassInvitationStatus getStatus() { return status; }
  public void setStatus(ClassInvitationStatus status) { this.status = status; }
}
