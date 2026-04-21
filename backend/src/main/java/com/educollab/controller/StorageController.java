package com.educollab.controller;

import static com.educollab.dto.StorageDtos.*;

import com.educollab.common.util.SecurityUtils;
import com.educollab.model.StorageScopeType;
import com.educollab.service.StorageService;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/storage")
public class StorageController {
  private final StorageService storageService;

  public StorageController(StorageService storageService) {
    this.storageService = storageService;
  }

  @GetMapping("/tree")
  public StorageWorkspaceRecord tree(
      @RequestParam("scopeType") String scopeType,
      @RequestParam("scopeId") Long scopeId,
      @RequestParam(value = "includeSystem", required = false, defaultValue = "false")
          boolean includeSystem) {
    return storageService.workspace(
        StorageScopeType.valueOf(scopeType.toUpperCase()), scopeId, includeSystem, SecurityUtils.principal());
  }

  @GetMapping("/entries")
  public StorageFolderRecord entries(
      @RequestParam("scopeType") String scopeType,
      @RequestParam("scopeId") Long scopeId,
      @RequestParam(value = "path", required = false, defaultValue = "") String path) {
    return storageService.folder(
        StorageScopeType.valueOf(scopeType.toUpperCase()), scopeId, path, SecurityUtils.principal());
  }

  @PostMapping("/folders")
  public StorageEntryRecord createFolder(@RequestBody CreateStorageFolderRequest request) {
    return storageService.createFolder(request, SecurityUtils.principal());
  }

  @PostMapping(path = "/files", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public StorageEntryRecord uploadFile(
      @RequestParam("scopeType") String scopeType,
      @RequestParam("scopeId") Long scopeId,
      @RequestParam(value = "path", required = false, defaultValue = "") String path,
      @RequestParam("file") MultipartFile file) {
    return storageService.uploadFile(
        StorageScopeType.valueOf(scopeType.toUpperCase()), scopeId, path, file, SecurityUtils.principal());
  }

  @PatchMapping("/entries")
  public StorageEntryRecord rename(@RequestBody UpdateStorageEntryRequest request) {
    return storageService.renameEntry(request, SecurityUtils.principal());
  }

  @PostMapping("/entries/move")
  public StorageEntryRecord move(@RequestBody MoveStorageEntryRequest request) {
    return storageService.moveEntry(request, SecurityUtils.principal());
  }

  @DeleteMapping("/entries")
  public void delete(
      @RequestParam("scopeType") String scopeType,
      @RequestParam("scopeId") Long scopeId,
      @RequestParam("path") String path) {
    storageService.deleteEntry(
        StorageScopeType.valueOf(scopeType.toUpperCase()), scopeId, path, SecurityUtils.principal());
  }

  @PostMapping("/entries/batch-delete")
  public void batchDelete(@RequestBody BatchDeleteStorageEntriesRequest request) {
    storageService.batchDelete(request.scopeType(), request.scopeId(), request.entryPaths(), SecurityUtils.principal());
  }

  @PostMapping("/entries/batch-move")
  public void batchMove(@RequestBody BatchMoveStorageEntriesRequest request) {
    storageService.batchMove(
        request.scopeType(), request.scopeId(), request.entryPaths(), request.targetPath(), SecurityUtils.principal());
  }

  @GetMapping("/download")
  public ResponseEntity<Resource> download(
      @RequestParam("scopeType") String scopeType,
      @RequestParam("scopeId") Long scopeId,
      @RequestParam("path") String path) {
    var info =
        storageService.downloadEntry(
            StorageScopeType.valueOf(scopeType.toUpperCase()), scopeId, path, SecurityUtils.principal());
    String dispositionType = info.mimeType() != null && info.mimeType().startsWith("image/") ? "inline" : "attachment";
    return ResponseEntity.ok()
        .contentType(
            MediaType.parseMediaType(
                info.mimeType() != null ? info.mimeType() : "application/octet-stream"))
        .header("Content-Disposition", dispositionType + "; filename=\"" + info.filename() + "\"")
        .body(info.resource());
  }
}
