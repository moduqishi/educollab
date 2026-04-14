package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "project_members", uniqueConstraints = @UniqueConstraint(columnNames = {"project_id","user_id"}))
public class ProjectMemberEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "project_id", nullable = false) private ProjectEntity project;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private UserEntity user;
 @Column(nullable = false) private boolean ownerFlag;
 public Long getId(){return id;} public ProjectEntity getProject(){return project;} public void setProject(ProjectEntity project){this.project=project;} public UserEntity getUser(){return user;} public void setUser(UserEntity user){this.user=user;} public boolean isOwnerFlag(){return ownerFlag;} public void setOwnerFlag(boolean ownerFlag){this.ownerFlag=ownerFlag;}
}
