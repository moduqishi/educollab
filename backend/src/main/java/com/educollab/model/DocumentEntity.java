package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "documents")
public class DocumentEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "project_id", nullable = false) private ProjectEntity project;
 @Column(nullable = false, length = 150) private String title;
 @Column(columnDefinition = "TEXT") private String excerpt;
 @Column(nullable = false, unique = true, length = 150) private String collabKey;
 @Column(name = "current_content", columnDefinition = "LONGTEXT") private String currentContent;
 public Long getId(){return id;} public ProjectEntity getProject(){return project;} public void setProject(ProjectEntity project){this.project=project;} public String getTitle(){return title;} public void setTitle(String title){this.title=title;} public String getExcerpt(){return excerpt;} public void setExcerpt(String excerpt){this.excerpt=excerpt;} public String getCollabKey(){return collabKey;} public void setCollabKey(String collabKey){this.collabKey=collabKey;} public String getCurrentContent(){return currentContent;} public void setCurrentContent(String currentContent){this.currentContent=currentContent;}
}
