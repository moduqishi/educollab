package com.educollab.controller;

import com.educollab.dto.WorkspaceDtos.FileAssetRecord;
import com.educollab.model.FileOwnerType;
import com.educollab.service.FileStorageService;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
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
    @GetMapping("/{id}/download") public ResponseEntity<Resource> download(@PathVariable Long id) throws IOException { Resource resource = fileStorageService.read(id); return ResponseEntity.ok().header("Content-Disposition", "attachment; filename=\"" + fileStorageService.filename(id) + "\"").body(resource); }
}
