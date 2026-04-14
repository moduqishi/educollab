package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "git_repositories")
public class GitRepositoryEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "project_id", nullable = false, unique = true) private ProjectEntity project;
 @Column(nullable = false, unique = true) private String slug;
 @Column(nullable = false) private String barePath;
 public Long getId(){return id;} public ProjectEntity getProject(){return project;} public void setProject(ProjectEntity project){this.project=project;} public String getSlug(){return slug;} public void setSlug(String slug){this.slug=slug;} public String getBarePath(){return barePath;} public void setBarePath(String barePath){this.barePath=barePath;}
}
