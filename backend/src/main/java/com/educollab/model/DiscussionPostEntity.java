package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "discussion_posts")
public class DiscussionPostEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "project_id", nullable = false) private ProjectEntity project;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "author_id", nullable = false) private UserEntity author;
 @Column(nullable = false, length = 150) private String title;
 @Column(nullable = false, columnDefinition = "TEXT") private String content;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 40) private DiscussionCategory category = DiscussionCategory.GENERAL;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private DiscussionStatus status = DiscussionStatus.OPEN;
 public Long getId(){return id;} public ProjectEntity getProject(){return project;} public void setProject(ProjectEntity project){this.project=project;} public UserEntity getAuthor(){return author;} public void setAuthor(UserEntity author){this.author=author;} public String getTitle(){return title;} public void setTitle(String title){this.title=title;} public String getContent(){return content;} public void setContent(String content){this.content=content;}
 public DiscussionCategory getCategory(){return category;} public void setCategory(DiscussionCategory category){this.category=category;}
 public DiscussionStatus getStatus(){return status;} public void setStatus(DiscussionStatus status){this.status=status;}
}
