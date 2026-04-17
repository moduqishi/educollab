package com.educollab.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "group_task_team_tasks")
public class GroupTaskTeamTaskEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "team_id", nullable = false)
  private TeamEntity team;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "assignee_id")
  private UserEntity assignee;

  @Column(nullable = false, length = 150)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private TaskStatus status = TaskStatus.TODO;

  private LocalDate dueDate;

  public Long getId() { return id; }
  public TeamEntity getTeam() { return team; }
  public void setTeam(TeamEntity team) { this.team = team; }
  public UserEntity getAssignee() { return assignee; }
  public void setAssignee(UserEntity assignee) { this.assignee = assignee; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }
  public TaskStatus getStatus() { return status; }
  public void setStatus(TaskStatus status) { this.status = status; }
  public LocalDate getDueDate() { return dueDate; }
  public void setDueDate(LocalDate dueDate) { this.dueDate = dueDate; }
}
