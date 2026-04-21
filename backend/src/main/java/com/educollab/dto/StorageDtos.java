package com.educollab.dto;

import java.util.List;

public class StorageDtos {
  public record StorageTreeNodeRecord(
      String path,
      String name,
      String nodeType,
      String entryKind,
      boolean readOnly,
      boolean systemManaged,
      boolean hiddenFromStudents,
      List<StorageTreeNodeRecord> children) {}

  public record StorageEntryRecord(
      String path,
      String parentPath,
      String nodeType,
      String name,
      String relativePath,
      String mimeType,
      Long sizeBytes,
      String updatedAt,
      String modifiedByName,
      Long fileAssetId,
      Long linkedDocumentId,
      String entryKind,
      String documentKind,
      String officeExt,
      Long projectId,
      String projectName,
      String openPath,
      boolean readOnly,
      boolean systemManaged,
      boolean hiddenFromStudents,
      boolean downloadable,
      boolean editable,
      boolean deletable,
      boolean movable,
      boolean virtualDocument) {}

  public record StoragePermissionRecord(
      boolean canCreateFolder,
      boolean canUpload,
      boolean canRename,
      boolean canDelete,
      boolean canMove,
      boolean canDownload,
      boolean canViewSystem) {}

  public record StorageBreadcrumbRecord(Long id, String name) {}
  public record StoragePathBreadcrumbRecord(String path, String name) {}

  public record StorageToolbarCapabilityRecord(
      boolean canCreateFolder,
      boolean canUpload,
      boolean canRename,
      boolean canDelete,
      boolean canMove,
      boolean canDownload) {}

  public record StorageWorkspaceRecord(
      String scopeType,
      Long scopeId,
      String scopeName,
      String rootPath,
      StoragePermissionRecord permissions,
      StorageToolbarCapabilityRecord toolbar,
      List<StorageTreeNodeRecord> tree) {}

  public record StorageFolderRecord(
      String folderPath,
      String folderName,
      List<StoragePathBreadcrumbRecord> breadcrumbs,
      boolean readOnly,
      List<StorageEntryRecord> entries) {}

  public record CreateStorageFolderRequest(
      String scopeType,
      Long scopeId,
      String parentPath,
      String name) {}

  public record UpdateStorageEntryRequest(
      String scopeType,
      Long scopeId,
      String path,
      String name) {}

  public record MoveStorageEntryRequest(
      String scopeType,
      Long scopeId,
      String path,
      String targetPath) {}

  public record BatchDeleteStorageEntriesRequest(
      String scopeType,
      Long scopeId,
      List<String> entryPaths) {}

  public record BatchMoveStorageEntriesRequest(
      String scopeType,
      Long scopeId,
      List<String> entryPaths,
      String targetPath) {}
}
