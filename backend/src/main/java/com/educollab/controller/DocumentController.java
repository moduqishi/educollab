package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.DocumentService;
import com.educollab.service.WorkspaceService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {
    private final WorkspaceService workspaceService;
    private final DocumentService documentService;
    public DocumentController(WorkspaceService workspaceService, DocumentService documentService) { this.workspaceService = workspaceService; this.documentService = documentService; }
    @GetMapping public List<DocumentRecord> list() { return workspaceService.documents(SecurityUtils.principal()); }
    @PostMapping public DocumentRecord create(@RequestBody DocumentSaveRequest request) { return documentService.create(request, SecurityUtils.principal()); }
    @PutMapping("/{id}") public DocumentRecord update(@PathVariable Long id, @RequestBody DocumentUpdateRequest request) { return documentService.update(id, request, SecurityUtils.principal()); }
    @GetMapping("/{id}") public DocumentRecord detail(@PathVariable Long id) { return documentService.detail(id, SecurityUtils.principal()); }
    @PostMapping("/{id}/autosave") public DocumentRecord autosave(@PathVariable Long id, @RequestBody DocumentAutosaveRequest request) { return documentService.autosave(id, request, SecurityUtils.principal()); }
    @GetMapping("/{id}/versions") public List<DocumentVersionRecord> versions(@PathVariable Long id) { return documentService.versions(id, SecurityUtils.principal()); }
    @PostMapping("/{id}/versions") public DocumentVersionRecord saveVersion(@PathVariable Long id, @RequestBody DocumentAutosaveRequest request) { return documentService.saveVersion(id, request.versionLabel(), request.currentContent(), SecurityUtils.principal()); }
    @GetMapping("/versions/{versionId}/restore") public DocumentVersionRecord restore(@PathVariable Long versionId) { return documentService.restore(versionId, SecurityUtils.principal()); }
}
