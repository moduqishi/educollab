package com.educollab.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "group_tasks")
public class GroupTaskEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id", nullable = false)
  private CourseEntity course;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by", nullable = false)
  private UserEntity createdBy;

  @Column(nullable = false, length = 150)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  private Integer minMembers;
  private Integer maxMembers;
  private LocalDate dueDate;

  public Long getId() { return id; }
  public CourseEntity getCourse() { return course; }
  public void setCourse(CourseEntity course) { this.course = course; }
  public UserEntity getCreatedBy() { return createdBy; }
  public void setCreatedBy(UserEntity createdBy) { this.createdBy = createdBy; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public Integer getMinMembers() { return minMembers; }
  public void setMinMembers(Integer minMembers) { this.minMembers = minMembers; }
  public Integer getMaxMembers() { return maxMembers; }
  public void setMaxMembers(Integer maxMembers) { this.maxMembers = maxMembers; }
  public LocalDate getDueDate() { return dueDate; }
  public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
}
