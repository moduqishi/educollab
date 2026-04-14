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

 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private DocumentKind kind = DocumentKind.NOTE;
 @Column(name = "office_ext", length = 10) private String officeExt;
 @Column(name = "file_asset_id") private Long fileAssetId;

 public Long getId(){return id;}
 public ProjectEntity getProject(){return project;}
 public void setProject(ProjectEntity project){this.project=project;}
 public String getTitle(){return title;}
 public void setTitle(String title){this.title=title;}
 public String getExcerpt(){return excerpt;}
 public void setExcerpt(String excerpt){this.excerpt=excerpt;}
 public String getCollabKey(){return collabKey;}
 public void setCollabKey(String collabKey){this.collabKey=collabKey;}
 public String getCurrentContent(){return currentContent;}
 public void setCurrentContent(String currentContent){this.currentContent=currentContent;}
 public DocumentKind getKind(){return kind;}
 public void setKind(DocumentKind kind){this.kind=kind;}
 public String getOfficeExt(){return officeExt;}
 public void setOfficeExt(String officeExt){this.officeExt=officeExt;}
 public Long getFileAssetId(){return fileAssetId;}
 public void setFileAssetId(Long fileAssetId){this.fileAssetId=fileAssetId;}
}
