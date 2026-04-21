package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "file_assets")
public class FileAssetEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private FileOwnerType ownerType;
 @Column(nullable = false) private Long ownerId;
 @Column(nullable = false) private String fileName;
 @Column(nullable = false) private String storagePath;
 @Column(name = "storage_node_id") private Long storageNodeId;
 @Column(name = "storage_key") private String storageKey;
 @Column(name = "relative_path") private String relativePath;
 @Column(name = "course_id") private Long courseId;
 @Column(name = "team_id") private Long teamId;
 @Column(name = "project_id") private Long projectId;
 @Enumerated(EnumType.STRING) @Column(name = "space_type", length = 30) private StorageSpaceType spaceType;
 @Enumerated(EnumType.STRING) @Column(length = 20) private StorageVisibility visibility = StorageVisibility.DEFAULT;
 @Column(name = "system_managed", nullable = false) private boolean systemManaged = false;
 @Column(name = "hidden_from_students", nullable = false) private boolean hiddenFromStudents = false;
 private String mimeType; private Long sizeBytes;
 public Long getId(){return id;} public FileOwnerType getOwnerType(){return ownerType;} public void setOwnerType(FileOwnerType ownerType){this.ownerType=ownerType;} public Long getOwnerId(){return ownerId;} public void setOwnerId(Long ownerId){this.ownerId=ownerId;} public String getFileName(){return fileName;} public void setFileName(String fileName){this.fileName=fileName;} public String getStoragePath(){return storagePath;} public void setStoragePath(String storagePath){this.storagePath=storagePath;} public Long getStorageNodeId(){return storageNodeId;} public void setStorageNodeId(Long storageNodeId){this.storageNodeId=storageNodeId;} public String getStorageKey(){return storageKey;} public void setStorageKey(String storageKey){this.storageKey=storageKey;} public String getRelativePath(){return relativePath;} public void setRelativePath(String relativePath){this.relativePath=relativePath;} public Long getCourseId(){return courseId;} public void setCourseId(Long courseId){this.courseId=courseId;} public Long getTeamId(){return teamId;} public void setTeamId(Long teamId){this.teamId=teamId;} public Long getProjectId(){return projectId;} public void setProjectId(Long projectId){this.projectId=projectId;} public StorageSpaceType getSpaceType(){return spaceType;} public void setSpaceType(StorageSpaceType spaceType){this.spaceType=spaceType;} public StorageVisibility getVisibility(){return visibility;} public void setVisibility(StorageVisibility visibility){this.visibility=visibility;} public boolean isSystemManaged(){return systemManaged;} public void setSystemManaged(boolean systemManaged){this.systemManaged=systemManaged;} public boolean isHiddenFromStudents(){return hiddenFromStudents;} public void setHiddenFromStudents(boolean hiddenFromStudents){this.hiddenFromStudents=hiddenFromStudents;} public String getMimeType(){return mimeType;} public void setMimeType(String mimeType){this.mimeType=mimeType;} public Long getSizeBytes(){return sizeBytes;} public void setSizeBytes(Long sizeBytes){this.sizeBytes=sizeBytes;}
}
