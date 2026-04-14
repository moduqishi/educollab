package com.educollab.model;

import jakarta.persistence.*;

@Entity
@Table(
    name = "discussion_task_links",
    uniqueConstraints = { @UniqueConstraint(name = "uk_discussion_task", columnNames = {"post_id", "task_id"}) }
)
public class DiscussionTaskLinkEntity extends BaseEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "post_id", nullable = false)
  private DiscussionPostEntity post;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "task_id", nullable = false)
  private TaskEntity task;

  public Long getId() { return id; }
  public DiscussionPostEntity getPost() { return post; }
  public void setPost(DiscussionPostEntity post) { this.post = post; }
  public TaskEntity getTask() { return task; }
  public void setTask(TaskEntity task) { this.task = task; }
}

