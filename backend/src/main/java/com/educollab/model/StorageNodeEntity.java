package com.educollab.model;

import jakarta.persistence.*;

@Entity
@Table(name = "storage_nodes")
public class StorageNodeEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "parent_id")
  private Long parentId;

  @Enumerated(EnumType.STRING)
  @Column(name = "node_type", nullable = false, length = 20)
  private StorageNodeType nodeType;

  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @Column(name = "scope_type", nullable = false, length = 20)
  private StorageScopeType scopeType;

  @Column(name = "scope_id", nullable = false)
  private Long scopeId;

  @Enumerated(EnumType.STRING)
  @Column(name = "space_type", nullable = false, length = 30)
  private StorageSpaceType spaceType;

  @Column(name = "course_id")
  private Long courseId;

  @Column(name = "team_id")
  private Long teamId;

  @Column(name = "project_id")
  private Long projectId;

  @Column(name = "relative_path", nullable = false)
  private String relativePath = "";

  @Column(name = "system_managed", nullable = false)
  private boolean systemManaged = false;

  @Column(name = "hidden_from_students", nullable = false)
  private boolean hiddenFromStudents = false;

  @Column(name = "sort_order")
  private Integer sortOrder;

  @Column(name = "created_by")
  private Long createdBy;

  @Column(name = "file_asset_id")
  private Long fileAssetId;

  @Column(name = "linked_document_id")
  private Long linkedDocumentId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private StorageVisibility visibility = StorageVisibility.DEFAULT;

  public Long getId() {
    return id;
  }

  public Long getParentId() {
    return parentId;
  }

  public void setParentId(Long parentId) {
    this.parentId = parentId;
  }

  public StorageNodeType getNodeType() {
    return nodeType;
  }

  public void setNodeType(StorageNodeType nodeType) {
    this.nodeType = nodeType;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public StorageScopeType getScopeType() {
    return scopeType;
  }

  public void setScopeType(StorageScopeType scopeType) {
    this.scopeType = scopeType;
  }

  public Long getScopeId() {
    return scopeId;
  }

  public void setScopeId(Long scopeId) {
    this.scopeId = scopeId;
  }

  public StorageSpaceType getSpaceType() {
    return spaceType;
  }

  public void setSpaceType(StorageSpaceType spaceType) {
    this.spaceType = spaceType;
  }

  public Long getCourseId() {
    return courseId;
  }

  public void setCourseId(Long courseId) {
    this.courseId = courseId;
  }

  public Long getTeamId() {
    return teamId;
  }

  public void setTeamId(Long teamId) {
    this.teamId = teamId;
  }

  public Long getProjectId() {
    return projectId;
  }

  public void setProjectId(Long projectId) {
    this.projectId = projectId;
  }

  public String getRelativePath() {
    return relativePath;
  }

  public void setRelativePath(String relativePath) {
    this.relativePath = relativePath;
  }

  public boolean isSystemManaged() {
    return systemManaged;
  }

  public void setSystemManaged(boolean systemManaged) {
    this.systemManaged = systemManaged;
  }

  public boolean isHiddenFromStudents() {
    return hiddenFromStudents;
  }

  public void setHiddenFromStudents(boolean hiddenFromStudents) {
    this.hiddenFromStudents = hiddenFromStudents;
  }

  public Integer getSortOrder() {
    return sortOrder;
  }

  public void setSortOrder(Integer sortOrder) {
    this.sortOrder = sortOrder;
  }

  public Long getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(Long createdBy) {
    this.createdBy = createdBy;
  }

  public Long getFileAssetId() {
    return fileAssetId;
  }

  public void setFileAssetId(Long fileAssetId) {
    this.fileAssetId = fileAssetId;
  }

  public Long getLinkedDocumentId() {
    return linkedDocumentId;
  }

  public void setLinkedDocumentId(Long linkedDocumentId) {
    this.linkedDocumentId = linkedDocumentId;
  }

  public StorageVisibility getVisibility() {
    return visibility;
  }

  public void setVisibility(StorageVisibility visibility) {
    this.visibility = visibility;
  }
}
