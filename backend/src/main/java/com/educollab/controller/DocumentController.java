package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.DocumentService;
import com.educollab.service.WorkspaceService;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {
    private final WorkspaceService workspaceService;
    private final DocumentService documentService;
    public DocumentController(WorkspaceService workspaceService, DocumentService documentService) { this.workspaceService = workspaceService; this.documentService = documentService; }
    @GetMapping public List<DocumentRecord> list() { return workspaceService.documents(SecurityUtils.principal()); }
    @PostMapping public DocumentRecord create(@RequestBody DocumentSaveRequest request) { return documentService.create(request, SecurityUtils.principal()); }
    @PostMapping(path = "/office", consumes = "multipart/form-data")
    public DocumentRecord createOffice(
        @RequestParam("projectId") Long projectId,
        @RequestParam("title") String title,
        @RequestParam("ext") String ext,
        @RequestParam(value = "file", required = false) MultipartFile file
    ) {
        return documentService.createOffice(projectId, title, ext, file, SecurityUtils.principal());
    }
    @PutMapping("/{id}") public DocumentRecord update(@PathVariable Long id, @RequestBody DocumentUpdateRequest request) { return documentService.update(id, request, SecurityUtils.principal()); }
    @GetMapping("/{id}") public DocumentRecord detail(@PathVariable Long id) { return documentService.detail(id, SecurityUtils.principal()); }
    @PostMapping("/{id}/autosave") public DocumentRecord autosave(@PathVariable Long id, @RequestBody DocumentAutosaveRequest request) { return documentService.autosave(id, request, SecurityUtils.principal()); }
    @PostMapping(path = "/{id}/office/save", consumes = "multipart/form-data")
    public DocumentRecord saveOffice(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        @RequestParam(value = "createVersion", required = false, defaultValue = "false") boolean createVersion,
        @RequestParam(value = "versionLabel", required = false) String versionLabel
    ) {
        return documentService.saveOfficeFile(id, file, createVersion, versionLabel, SecurityUtils.principal());
    }
    @DeleteMapping("/{id}") public void delete(@PathVariable Long id) { documentService.delete(id, SecurityUtils.principal()); }
    @GetMapping("/{id}/versions") public List<DocumentVersionRecord> versions(@PathVariable Long id) { return documentService.versions(id, SecurityUtils.principal()); }
    @PostMapping("/{id}/versions") public DocumentVersionRecord saveVersion(@PathVariable Long id, @RequestBody DocumentAutosaveRequest request) { return documentService.saveVersion(id, request.versionLabel(), request.currentContent(), SecurityUtils.principal()); }
    @GetMapping("/versions/{versionId}/restore") public DocumentVersionRecord restore(@PathVariable Long versionId) { return documentService.restore(versionId, SecurityUtils.principal()); }
    @PostMapping("/versions/{versionId}/restore") public DocumentRecord applyVersion(@PathVariable Long versionId) { return documentService.applyVersion(versionId, SecurityUtils.principal()); }
}
