package com.educollab.model;
import jakarta.persistence.*; import java.time.LocalDate;
@Entity @Table(name = "tasks")
public class TaskEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "project_id", nullable = false) private ProjectEntity project;
 @Column(nullable = false, length = 150) private String title;
 @Column(columnDefinition = "TEXT") private String description;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TaskStatus status = TaskStatus.TODO;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "assignee_id") private UserEntity assignee;
 @Enumerated(EnumType.STRING) @Column(length = 20) private TaskPriority priority = TaskPriority.MEDIUM;
 private LocalDate dueDate;
 public Long getId(){return id;} public ProjectEntity getProject(){return project;} public void setProject(ProjectEntity project){this.project=project;} public String getTitle(){return title;} public void setTitle(String title){this.title=title;} public String getDescription(){return description;} public void setDescription(String description){this.description=description;} public TaskStatus getStatus(){return status;} public void setStatus(TaskStatus status){this.status=status;} public UserEntity getAssignee(){return assignee;} public void setAssignee(UserEntity assignee){this.assignee=assignee;} public TaskPriority getPriority(){return priority;} public void setPriority(TaskPriority priority){this.priority=priority;} public LocalDate getDueDate(){return dueDate;} public void setDueDate(LocalDate dueDate){this.dueDate=dueDate;}
}
