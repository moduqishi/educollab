package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "task_comments")
public class TaskCommentEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "task_id", nullable = false) private TaskEntity task;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "author_id", nullable = false) private UserEntity author;
 @Column(nullable = false, columnDefinition = "TEXT") private String content;
 public Long getId(){return id;} public TaskEntity getTask(){return task;} public void setTask(TaskEntity task){this.task=task;} public UserEntity getAuthor(){return author;} public void setAuthor(UserEntity author){this.author=author;} public String getContent(){return content;} public void setContent(String content){this.content=content;}
}
