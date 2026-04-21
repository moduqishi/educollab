package com.educollab.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_milestones")
public class ProjectMilestoneEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "project_id", nullable = false)
  private ProjectEntity project;

  @Column(nullable = false, length = 120)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "sort_order", nullable = false)
  private Integer sortOrder = 0;

  @Column(nullable = false)
  private Integer weight = 1;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ProjectMilestoneStatus status = ProjectMilestoneStatus.LOCKED;

  private LocalDateTime activatedAt;
  private LocalDateTime completedAt;

  public Long getId() {
    return id;
  }

  public ProjectEntity getProject() {
    return project;
  }

  public void setProject(ProjectEntity project) {
    this.project = project;
  }

  public String getTitle() {
    return title;
  }

  public void setTitle(String title) {
    this.title = title;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public Integer getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(Integer sortOrder) {
    this.sortOrder = sortOrder;
  }

  public Integer getWeight() {
    return weight;
  }

  public void setWeight(Integer weight) {
    this.weight = weight;
  }

  public ProjectMilestoneStatus getStatus() {
    return status;
  }

  public void setStatus(ProjectMilestoneStatus status) {
    this.status = status;
  }

  public LocalDateTime getActivatedAt() {
    return activatedAt;
  }

  public void setActivatedAt(LocalDateTime activatedAt) {
    this.activatedAt = activatedAt;
  }

  public LocalDateTime getCompletedAt() {
    return completedAt;
  }

  public void setCompletedAt(LocalDateTime completedAt) {
    this.completedAt = completedAt;
  }
}
