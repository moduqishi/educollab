package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "project_releases")
public class ProjectReleaseEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "project_id", nullable = false) private ProjectEntity project;
 @Column(nullable = false, length = 50) private String version;
 @Column(nullable = false, length = 150) private String title;
 @Column(columnDefinition = "TEXT") private String description;
 public Long getId(){return id;} public ProjectEntity getProject(){return project;} public void setProject(ProjectEntity project){this.project=project;} public String getVersion(){return version;} public void setVersion(String version){this.version=version;} public String getTitle(){return title;} public void setTitle(String title){this.title=title;} public String getDescription(){return description;} public void setDescription(String description){this.description=description;}
}
