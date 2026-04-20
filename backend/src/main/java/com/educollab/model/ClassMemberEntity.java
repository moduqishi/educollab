package com.educollab.model;

import jakarta.persistence.*;

@Entity
@Table(name = "class_members", uniqueConstraints = @UniqueConstraint(columnNames = {"course_id", "user_id"}))
public class ClassMemberEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private CourseEntity course;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ClassMemberRole role;

  @Column(name = "joined_via", length = 20)
  private String joinedVia;

  public Long getId() { return id; }
  public CourseEntity getCourse() { return course; }
  public void setCourse(CourseEntity course) { this.course = course; }
  public UserEntity getUser() { return user; }
  public void setUser(UserEntity user) { this.user = user; }
  public ClassMemberRole getRole() { return role; }
  public void setRole(ClassMemberRole role) { this.role = role; }
  public String getJoinedVia() { return joinedVia; }
  public void setJoinedVia(String joinedVia) { this.joinedVia = joinedVia; }
}
