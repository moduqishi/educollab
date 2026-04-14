package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.model.*;
import com.educollab.repo.DocumentRepository;
import com.educollab.repo.DocumentVersionRepository;
import com.educollab.repo.ProjectRepository;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final ProjectRepository projectRepository;
    private final WorkspaceService workspaceService;
    private final AuthService authService;
    private final NotificationService notificationService;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public DocumentService(DocumentRepository documentRepository, DocumentVersionRepository documentVersionRepository, ProjectRepository projectRepository, WorkspaceService workspaceService, AuthService authService, NotificationService notificationService) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.projectRepository = projectRepository;
        this.workspaceService = workspaceService;
        this.authService = authService;
        this.notificationService = notificationService;
    }

    @Transactional
    public DocumentRecord create(DocumentSaveRequest request, JwtPrincipal principal) {
        ProjectEntity project = workspaceService.requireVisible(request.projectId(), principal);
        DocumentEntity entity = new DocumentEntity();
        entity.setProject(project);
        entity.setTitle(request.title());
        entity.setCurrentContent(request.currentContent());
        entity.setExcerpt(excerpt(request.currentContent()));
        entity.setCollabKey("doc-" + UUID.randomUUID());
        documentRepository.save(entity);
        return workspaceService.toDocumentRecord(entity);
    }

    @Transactional
    public DocumentRecord update(Long documentId, DocumentUpdateRequest request, JwtPrincipal principal) {
        DocumentEntity entity = documentRepository.findById(documentId).orElseThrow(() -> new ApiException("文档不存在"));
        workspaceService.requireVisible(entity.getProject().getId(), principal);
        if (request.title() != null && !request.title().isBlank()) {
            entity.setTitle(request.title().trim());
        }
        documentRepository.save(entity);
        return workspaceService.toDocumentRecord(entity);
    }

    public DocumentRecord detail(Long documentId, JwtPrincipal principal) {
        DocumentEntity entity = documentRepository.findById(documentId).orElseThrow(() -> new ApiException("文档不存在"));
        workspaceService.requireVisible(entity.getProject().getId(), principal);
        return workspaceService.toDocumentRecord(entity);
    }

    @Transactional
    public DocumentRecord autosave(Long documentId, DocumentAutosaveRequest request, JwtPrincipal principal) {
        DocumentEntity entity = documentRepository.findById(documentId).orElseThrow(() -> new ApiException("文档不存在"));
        workspaceService.requireVisible(entity.getProject().getId(), principal);
        entity.setCurrentContent(request.currentContent());
        entity.setExcerpt(request.excerpt() != null && !request.excerpt().isBlank() ? request.excerpt() : excerpt(request.currentContent()));
        documentRepository.save(entity);
        if (request.saveVersion()) saveVersion(documentId, request.versionLabel() == null || request.versionLabel().isBlank() ? "手动版本" : request.versionLabel(), request.currentContent(), principal);
        workspaceService.projectDetail(entity.getProject().getId(), principal).members().stream().filter(member -> !member.id().equals(principal.userId())).forEach(member -> notificationService.create(authService.getUser(member.id()), "文档已更新", "文档“" + entity.getTitle() + "”有新的协同编辑内容", NotificationType.DOCUMENT));
        return workspaceService.toDocumentRecord(entity);
    }

    public List<DocumentVersionRecord> versions(Long documentId, JwtPrincipal principal) {
        DocumentEntity entity = documentRepository.findById(documentId).orElseThrow(() -> new ApiException("文档不存在"));
        workspaceService.requireVisible(entity.getProject().getId(), principal);
        return documentVersionRepository.findByDocumentIdOrderByCreatedAtDesc(documentId).stream().map(version -> new DocumentVersionRecord(version.getId(), version.getLabel(), version.getCreatedBy() != null ? version.getCreatedBy().getName() : "系统", formatter.format(version.getCreatedAt()), version.getSnapshotContent())).toList();
    }

    @Transactional
    public DocumentVersionRecord saveVersion(Long documentId, String label, String content, JwtPrincipal principal) {
        DocumentEntity entity = documentRepository.findById(documentId).orElseThrow(() -> new ApiException("文档不存在"));
        workspaceService.requireVisible(entity.getProject().getId(), principal);
        DocumentVersionEntity version = new DocumentVersionEntity();
        version.setDocument(entity);
        version.setLabel(label);
        version.setSnapshotContent(content != null ? content : entity.getCurrentContent());
        version.setCreatedBy(authService.getUser(principal.userId()));
        documentVersionRepository.save(version);
        return new DocumentVersionRecord(version.getId(), version.getLabel(), version.getCreatedBy().getName(), formatter.format(version.getCreatedAt()), version.getSnapshotContent());
    }

    public DocumentVersionRecord restore(Long versionId, JwtPrincipal principal) {
        DocumentVersionEntity version = documentVersionRepository.findById(versionId).orElseThrow(() -> new ApiException("版本不存在"));
        workspaceService.requireVisible(version.getDocument().getProject().getId(), principal);
        return new DocumentVersionRecord(version.getId(), version.getLabel(), version.getCreatedBy() != null ? version.getCreatedBy().getName() : "系统", formatter.format(version.getCreatedAt()), version.getSnapshotContent());
    }

    private String excerpt(String html) {
        if (html == null || html.isBlank()) return "";
        String plain = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        return plain.substring(0, Math.min(plain.length(), 80));
    }
}
