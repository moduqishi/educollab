package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "merge_requests")
public class MergeRequestEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "project_id", nullable = false) private ProjectEntity project;
 @Column(nullable = false, length = 150) private String title;
 @Column(nullable = false, length = 100) private String sourceBranch;
 @Column(nullable = false, length = 100) private String targetBranch;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private MergeRequestStatus status = MergeRequestStatus.OPEN;
 public Long getId(){return id;} public ProjectEntity getProject(){return project;} public void setProject(ProjectEntity project){this.project=project;} public String getTitle(){return title;} public void setTitle(String title){this.title=title;} public String getSourceBranch(){return sourceBranch;} public void setSourceBranch(String sourceBranch){this.sourceBranch=sourceBranch;} public String getTargetBranch(){return targetBranch;} public void setTargetBranch(String targetBranch){this.targetBranch=targetBranch;} public MergeRequestStatus getStatus(){return status;} public void setStatus(MergeRequestStatus status){this.status=status;}
}
