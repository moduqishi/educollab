package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.FileAssetRecord;
import com.educollab.model.FileAssetEntity;
import com.educollab.model.FileOwnerType;
import com.educollab.repo.DiscussionPostRepository;
import com.educollab.repo.FileAssetRepository;
import com.educollab.repo.TaskRepository;
import com.educollab.repo.DocumentRepository;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {
    private final FileAssetRepository fileAssetRepository;
    private final TaskRepository taskRepository;
    private final DocumentRepository documentRepository;
    private final DiscussionPostRepository discussionPostRepository;
    private final ProjectAccessService projectAccessService;
    private final Path root;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public FileStorageService(
        FileAssetRepository fileAssetRepository,
        TaskRepository taskRepository,
        DocumentRepository documentRepository,
        DiscussionPostRepository discussionPostRepository,
        ProjectAccessService projectAccessService,
        @Value("${app.file-storage.root:./data/uploads}") String rootDir
    ) {
        this.fileAssetRepository = fileAssetRepository;
        this.taskRepository = taskRepository;
        this.documentRepository = documentRepository;
        this.discussionPostRepository = discussionPostRepository;
        this.projectAccessService = projectAccessService;
        this.root = Path.of(rootDir);
    }

    @Transactional
    public FileAssetRecord store(MultipartFile file, FileOwnerType ownerType, Long ownerId) {
        ensureVisible(ownerType, ownerId);
        try {
            Files.createDirectories(root);
            String generatedName = UUID.randomUUID() + "-" + file.getOriginalFilename();
            Path target = root.resolve(generatedName);
            file.transferTo(target);
            FileAssetEntity entity = new FileAssetEntity();
            entity.setOwnerType(ownerType);
            entity.setOwnerId(ownerId);
            entity.setFileName(file.getOriginalFilename());
            entity.setStoragePath(target.toString());
            entity.setMimeType(file.getContentType());
            entity.setSizeBytes(file.getSize());
            fileAssetRepository.save(entity);
            return toRecord(entity);
        } catch (IOException ex) {
            throw new ApiException("文件上传失败: " + ex.getMessage());
        }
    }

    @Transactional
    public FileAssetRecord storeBytes(byte[] bytes, String fileName, String mimeType, FileOwnerType ownerType, Long ownerId) {
        ensureVisible(ownerType, ownerId);
        if (bytes == null) throw new ApiException("文件内容为空");
        if (fileName == null || fileName.isBlank()) throw new ApiException("fileName 不能为空");
        try {
            Files.createDirectories(root);
            String generatedName = UUID.randomUUID() + "-" + fileName;
            Path target = root.resolve(generatedName);
            Files.copy(new ByteArrayInputStream(bytes), target);
            FileAssetEntity entity = new FileAssetEntity();
            entity.setOwnerType(ownerType);
            entity.setOwnerId(ownerId);
            entity.setFileName(fileName);
            entity.setStoragePath(target.toString());
            entity.setMimeType(mimeType);
            entity.setSizeBytes((long) bytes.length);
            fileAssetRepository.save(entity);
            return toRecord(entity);
        } catch (IOException ex) {
            throw new ApiException("文件保存失败: " + ex.getMessage());
        }
    }

    @Transactional
    public void deleteAllForOwner(FileOwnerType ownerType, Long ownerId) {
        ensureVisible(ownerType, ownerId);
        List<FileAssetEntity> list = fileAssetRepository.findByOwnerTypeAndOwnerId(ownerType, ownerId);
        for (FileAssetEntity e : list) {
            try {
                if (e.getStoragePath() != null) Files.deleteIfExists(Path.of(e.getStoragePath()));
            } catch (IOException ex) {
                // ignore file delete errors; still remove db record
            }
        }
        fileAssetRepository.deleteByOwnerTypeAndOwnerId(ownerType, ownerId);
    }

    public List<FileAssetRecord> list(FileOwnerType ownerType, Long ownerId) {
        ensureVisible(ownerType, ownerId);
        return fileAssetRepository.findByOwnerTypeAndOwnerId(ownerType, ownerId).stream().map(this::toRecord).toList();
    }

    public Resource read(Long id) {
        FileAssetEntity entity = fileAssetRepository.findById(id).orElseThrow(() -> new ApiException("文件不存在"));
        ensureVisible(entity.getOwnerType(), entity.getOwnerId());
        return new FileSystemResource(entity.getStoragePath());
    }

    public String filename(Long id) {
        FileAssetEntity entity = fileAssetRepository.findById(id).orElseThrow(() -> new ApiException("文件不存在"));
        ensureVisible(entity.getOwnerType(), entity.getOwnerId());
        return entity.getFileName();
    }

    private FileAssetRecord toRecord(FileAssetEntity entity) {
        return new FileAssetRecord(entity.getId(), entity.getFileName(), entity.getOwnerType().name(), entity.getOwnerId(), entity.getMimeType(), entity.getSizeBytes(), formatter.format(entity.getCreatedAt()));
    }

    private void ensureVisible(FileOwnerType ownerType, Long ownerId) {
        var principal = SecurityUtils.principal();
        Long projectId = resolveProjectId(ownerType, ownerId);
        projectAccessService.requireVisible(projectId, principal);
    }

    private Long resolveProjectId(FileOwnerType ownerType, Long ownerId) {
        if (ownerType == null) throw new ApiException("ownerType 不能为空");
        if (ownerId == null) throw new ApiException("ownerId 不能为空");
        return switch (ownerType) {
            case PROJECT -> ownerId;
            case TASK -> taskRepository.findById(ownerId).orElseThrow(() -> new ApiException("任务不存在")).getProject().getId();
            case DOCUMENT -> documentRepository.findById(ownerId).orElseThrow(() -> new ApiException("文档不存在")).getProject().getId();
            case DISCUSSION_POST -> discussionPostRepository.findById(ownerId).orElseThrow(() -> new ApiException("讨论不存在")).getProject().getId();
        };
    }
}
