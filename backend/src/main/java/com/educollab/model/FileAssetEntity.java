package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "file_assets")
public class FileAssetEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private FileOwnerType ownerType;
 @Column(nullable = false) private Long ownerId;
 @Column(nullable = false) private String fileName;
 @Column(nullable = false) private String storagePath;
 private String mimeType; private Long sizeBytes;
 public Long getId(){return id;} public FileOwnerType getOwnerType(){return ownerType;} public void setOwnerType(FileOwnerType ownerType){this.ownerType=ownerType;} public Long getOwnerId(){return ownerId;} public void setOwnerId(Long ownerId){this.ownerId=ownerId;} public String getFileName(){return fileName;} public void setFileName(String fileName){this.fileName=fileName;} public String getStoragePath(){return storagePath;} public void setStoragePath(String storagePath){this.storagePath=storagePath;} public String getMimeType(){return mimeType;} public void setMimeType(String mimeType){this.mimeType=mimeType;} public Long getSizeBytes(){return sizeBytes;} public void setSizeBytes(Long sizeBytes){this.sizeBytes=sizeBytes;}
}
