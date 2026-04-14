package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.model.*;
import com.educollab.repo.DocumentRepository;
import com.educollab.repo.DocumentVersionRepository;
import com.educollab.repo.FileAssetRepository;
import com.educollab.repo.ProjectRepository;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional(readOnly = true)
public class DocumentService {
    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository documentVersionRepository;
    private final ProjectRepository projectRepository;
    private final WorkspaceService workspaceService;
    private final AuthService authService;
    private final NotificationService notificationService;
    private final FileStorageService fileStorageService;
    private final FileAssetRepository fileAssetRepository;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public DocumentService(DocumentRepository documentRepository, DocumentVersionRepository documentVersionRepository, ProjectRepository projectRepository, WorkspaceService workspaceService, AuthService authService, NotificationService notificationService, FileStorageService fileStorageService, FileAssetRepository fileAssetRepository) {
        this.documentRepository = documentRepository;
        this.documentVersionRepository = documentVersionRepository;
        this.projectRepository = projectRepository;
        this.workspaceService = workspaceService;
        this.authService = authService;
        this.notificationService = notificationService;
        this.fileStorageService = fileStorageService;
        this.fileAssetRepository = fileAssetRepository;
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
        entity.setKind(DocumentKind.NOTE);
        documentRepository.save(entity);
        return workspaceService.toDocumentRecord(entity);
    }

    @Transactional
    public DocumentRecord createOffice(Long projectId, String title, String ext, MultipartFile file, JwtPrincipal principal) {
        ProjectEntity project = workspaceService.requireVisible(projectId, principal);
        if (title == null || title.isBlank()) throw new ApiException("title 不能为空");
        String normalizedExt = (ext == null ? "" : ext.trim().toLowerCase());
        if (!List.of("docx", "xlsx", "pptx").contains(normalizedExt)) throw new ApiException("ext 仅支持 docx/xlsx/pptx");
        if (file == null || file.isEmpty()) throw new ApiException("请上传文件（docx/xlsx/pptx）");

        DocumentEntity entity = new DocumentEntity();
        entity.setProject(project);
        entity.setTitle(title.trim());
        entity.setExcerpt("");
        entity.setCurrentContent(null);
        entity.setCollabKey("office-" + UUID.randomUUID());
        entity.setKind(DocumentKind.OFFICE);
        entity.setOfficeExt(normalizedExt);
        documentRepository.save(entity);

        // Store the primary office file as a DOCUMENT-owned file asset, then point document.fileAssetId to it.
        var stored = fileStorageService.store(file, FileOwnerType.DOCUMENT, entity.getId());
        entity.setFileAssetId(stored.id());
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
        return documentVersionRepository.findByDocumentIdOrderByCreatedAtDesc(documentId).stream()
            .map(version -> new DocumentVersionRecord(
                version.getId(),
                version.getLabel(),
                version.getCreatedBy() != null ? version.getCreatedBy().getName() : "系统",
                formatter.format(version.getCreatedAt()),
                version.getSnapshotContent(),
                version.getFileAssetId()
            ))
            .toList();
    }

    @Transactional
    public DocumentVersionRecord saveVersion(Long documentId, String label, String content, JwtPrincipal principal) {
        DocumentEntity entity = documentRepository.findById(documentId).orElseThrow(() -> new ApiException("文档不存在"));
        workspaceService.requireVisible(entity.getProject().getId(), principal);
        DocumentVersionEntity version = new DocumentVersionEntity();
        version.setDocument(entity);
        version.setLabel(label);
        if (entity.getKind() == DocumentKind.OFFICE) {
            version.setSnapshotContent(null);
            version.setFileAssetId(entity.getFileAssetId());
        } else {
            version.setSnapshotContent(content != null ? content : entity.getCurrentContent());
            version.setFileAssetId(null);
        }
        version.setCreatedBy(authService.getUser(principal.userId()));
        documentVersionRepository.save(version);
        return new DocumentVersionRecord(version.getId(), version.getLabel(), version.getCreatedBy().getName(), formatter.format(version.getCreatedAt()), version.getSnapshotContent(), version.getFileAssetId());
    }

    public DocumentVersionRecord restore(Long versionId, JwtPrincipal principal) {
        DocumentVersionEntity version = documentVersionRepository.findById(versionId).orElseThrow(() -> new ApiException("版本不存在"));
        workspaceService.requireVisible(version.getDocument().getProject().getId(), principal);
        return new DocumentVersionRecord(version.getId(), version.getLabel(), version.getCreatedBy() != null ? version.getCreatedBy().getName() : "系统", formatter.format(version.getCreatedAt()), version.getSnapshotContent(), version.getFileAssetId());
    }

    @Transactional
    public DocumentRecord applyVersion(Long versionId, JwtPrincipal principal) {
        DocumentVersionEntity version = documentVersionRepository.findById(versionId).orElseThrow(() -> new ApiException("版本不存在"));
        DocumentEntity doc = version.getDocument();
        workspaceService.requireVisible(doc.getProject().getId(), principal);

        if (doc.getKind() == DocumentKind.OFFICE) {
            if (version.getFileAssetId() == null) throw new ApiException("该版本不包含 Office 文件快照");
            doc.setFileAssetId(version.getFileAssetId());
        } else {
            doc.setCurrentContent(version.getSnapshotContent());
            doc.setExcerpt(excerpt(version.getSnapshotContent()));
        }
        documentRepository.save(doc);
        return workspaceService.toDocumentRecord(doc);
    }

    @Transactional
    public DocumentRecord saveOfficeFile(Long documentId, MultipartFile file, boolean createVersion, String versionLabel, JwtPrincipal principal) {
        DocumentEntity entity = documentRepository.findById(documentId).orElseThrow(() -> new ApiException("文档不存在"));
        workspaceService.requireVisible(entity.getProject().getId(), principal);
        if (entity.getKind() != DocumentKind.OFFICE) throw new ApiException("该文档不是 Office 类型");
        if (file == null || file.isEmpty()) throw new ApiException("请上传文件");

        // optionally create version snapshot from current primary file
        if (createVersion && entity.getFileAssetId() != null) {
            DocumentVersionEntity version = new DocumentVersionEntity();
            version.setDocument(entity);
            version.setLabel((versionLabel == null || versionLabel.isBlank()) ? "手动版本" : versionLabel.trim());
            version.setSnapshotContent(null);
            version.setFileAssetId(entity.getFileAssetId());
            version.setCreatedBy(authService.getUser(principal.userId()));
            documentVersionRepository.save(version);
        }

        var stored = fileStorageService.store(file, FileOwnerType.DOCUMENT, entity.getId());
        entity.setFileAssetId(stored.id());
        entity.setExcerpt("");
        documentRepository.save(entity);

        return workspaceService.toDocumentRecord(entity);
    }

    private String excerpt(String html) {
        if (html == null || html.isBlank()) return "";
        String plain = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        return plain.substring(0, Math.min(plain.length(), 80));
    }
}
