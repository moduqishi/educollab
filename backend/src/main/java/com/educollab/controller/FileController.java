package com.educollab.controller;

import com.educollab.dto.WorkspaceDtos.FileAssetRecord;
import com.educollab.model.FileOwnerType;
import com.educollab.service.FileStorageService;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/files")
public class FileController {
    private final FileStorageService fileStorageService;
    public FileController(FileStorageService fileStorageService) { this.fileStorageService = fileStorageService; }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE) public FileAssetRecord upload(@RequestParam("file") MultipartFile file, @RequestParam("ownerType") String ownerType, @RequestParam("ownerId") Long ownerId) { return fileStorageService.store(file, FileOwnerType.valueOf(ownerType), ownerId); }
    @GetMapping public List<FileAssetRecord> list(@RequestParam("ownerType") String ownerType, @RequestParam("ownerId") Long ownerId) { return fileStorageService.list(FileOwnerType.valueOf(ownerType), ownerId); }
    @GetMapping("/{id}/download") public ResponseEntity<Resource> download(@PathVariable Long id) {
        var info = fileStorageService.getDownloadInfo(id);
        String dispositionType = info.mimeType() != null && info.mimeType().startsWith("image/") ? "inline" : "attachment";
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(info.mimeType() != null ? info.mimeType() : "application/octet-stream"))
            .header("Content-Disposition", dispositionType + "; filename=\"" + info.filename() + "\"")
            .body(info.resource());
    }
}
