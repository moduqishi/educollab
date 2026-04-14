package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "document_versions")
public class DocumentVersionEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "document_id", nullable = false) private DocumentEntity document;
 @Column(length = 150) private String label;
 @Column(name = "snapshot_content", columnDefinition = "LONGTEXT") private String snapshotContent;
 @Column(name = "file_asset_id") private Long fileAssetId;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "created_by") private UserEntity createdBy;
 public Long getId(){return id;}
 public DocumentEntity getDocument(){return document;}
 public void setDocument(DocumentEntity document){this.document=document;}
 public String getLabel(){return label;}
 public void setLabel(String label){this.label=label;}
 public String getSnapshotContent(){return snapshotContent;}
 public void setSnapshotContent(String snapshotContent){this.snapshotContent=snapshotContent;}
 public Long getFileAssetId(){return fileAssetId;}
 public void setFileAssetId(Long fileAssetId){this.fileAssetId=fileAssetId;}
 public UserEntity getCreatedBy(){return createdBy;}
 public void setCreatedBy(UserEntity createdBy){this.createdBy=createdBy;}
}
