package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.FileAssetRecord;
import com.educollab.model.AssignmentSubmissionEntity;
import com.educollab.model.FileAssetEntity;
import com.educollab.model.FileOwnerType;
import com.educollab.model.ProjectEntity;
import com.educollab.model.StorageScopeType;
import com.educollab.model.UserRole;
import com.educollab.repo.AssignmentSubmissionRepository;
import com.educollab.repo.ChatRoomRepository;
import com.educollab.repo.ClassMemberRepository;
import com.educollab.repo.DiscussionPostRepository;
import com.educollab.repo.DocumentRepository;
import com.educollab.repo.FileAssetRepository;
import com.educollab.repo.TaskRepository;
import com.educollab.repo.TeamRepository;
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
  private final AssignmentSubmissionRepository assignmentSubmissionRepository;
  private final ChatRoomRepository chatRoomRepository;
  private final ClassMemberRepository classMemberRepository;
  private final TeamRepository teamRepository;
  private final ProjectAccessService projectAccessService;
  private final ProjectActivityService projectActivityService;
  private final StorageService storageService;
  private final Path root;
  private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public FileStorageService(
      FileAssetRepository fileAssetRepository,
      TaskRepository taskRepository,
      DocumentRepository documentRepository,
      DiscussionPostRepository discussionPostRepository,
      AssignmentSubmissionRepository assignmentSubmissionRepository,
      ChatRoomRepository chatRoomRepository,
      ClassMemberRepository classMemberRepository,
      TeamRepository teamRepository,
      ProjectAccessService projectAccessService,
      ProjectActivityService projectActivityService,
      StorageService storageService,
      @Value("${app.file-storage.root:./data/uploads}") String rootDir) {
    this.fileAssetRepository = fileAssetRepository;
    this.taskRepository = taskRepository;
    this.documentRepository = documentRepository;
    this.discussionPostRepository = discussionPostRepository;
    this.assignmentSubmissionRepository = assignmentSubmissionRepository;
    this.chatRoomRepository = chatRoomRepository;
    this.classMemberRepository = classMemberRepository;
    this.teamRepository = teamRepository;
    this.projectAccessService = projectAccessService;
    this.projectActivityService = projectActivityService;
    this.storageService = storageService;
    this.root = Path.of(rootDir);
  }

  @Transactional
  public FileAssetRecord store(MultipartFile file, FileOwnerType ownerType, Long ownerId) {
    ensureWritable(ownerType, ownerId);
    FileAssetRecord record = storageService.storeOwnedFile(file, ownerType, ownerId, SecurityUtils.principal());
    fileAssetRepository.findById(record.id()).ifPresent(this::recordUploadActivity);
    return record;
  }

  @Transactional
  public FileAssetRecord storeBytes(
      byte[] bytes, String fileName, String mimeType, FileOwnerType ownerType, Long ownerId) {
    ensureWritable(ownerType, ownerId);
    if (bytes == null) {
      throw new ApiException("文件内容不能为空");
    }
    if (fileName == null || fileName.isBlank()) {
      throw new ApiException("fileName 不能为空");
    }
    return storageService.storeOwnedBytes(bytes, fileName, mimeType, ownerType, ownerId, SecurityUtils.principal());
  }

  @Transactional
  public void deleteAllForOwner(FileOwnerType ownerType, Long ownerId) {
    ensureWritable(ownerType, ownerId);
    List<FileAssetEntity> list = fileAssetRepository.findByOwnerTypeAndOwnerId(ownerType, ownerId);
    for (FileAssetEntity entity : list) {
      try {
        if (entity.getStoragePath() != null) {
          Files.deleteIfExists(Path.of(entity.getStoragePath()));
        }
      } catch (IOException ignored) {
        // Ignore file deletion failures and still clean up the DB rows.
      }
    }
    fileAssetRepository.deleteByOwnerTypeAndOwnerId(ownerType, ownerId);
  }

  @Transactional
  public void deleteAssignmentSubmissionFile(Long submissionId, Long fileId) {
    FileAssetEntity entity =
        fileAssetRepository.findById(fileId).orElseThrow(() -> new ApiException("文件不存在"));
    if (entity.getOwnerType() != FileOwnerType.ASSIGNMENT_SUBMISSION
        || !entity.getOwnerId().equals(submissionId)) {
      throw new ApiException("附件不属于当前作业提交");
    }
    ensureVisible(entity.getOwnerType(), entity.getOwnerId());
    try {
      if (entity.getStoragePath() != null) {
        Files.deleteIfExists(Path.of(entity.getStoragePath()));
      }
    } catch (IOException ex) {
      throw new ApiException("删除附件失败: " + ex.getMessage());
    }
    fileAssetRepository.delete(entity);
    storageService.onFileAssetDeleted(entity);
  }

  @Transactional
  public void deleteOwnedFile(FileOwnerType ownerType, Long ownerId, Long fileId) {
    FileAssetEntity entity =
        fileAssetRepository.findById(fileId).orElseThrow(() -> new ApiException("文件不存在"));
    if (entity.getOwnerType() != ownerType || !entity.getOwnerId().equals(ownerId)) {
      throw new ApiException("附件不属于当前资源");
    }
    ensureVisible(entity.getOwnerType(), entity.getOwnerId());
    try {
      if (entity.getStoragePath() != null) {
        Files.deleteIfExists(Path.of(entity.getStoragePath()));
      }
    } catch (IOException ex) {
      throw new ApiException("删除附件失败: " + ex.getMessage());
    }
    fileAssetRepository.delete(entity);
    storageService.onFileAssetDeleted(entity);
  }

  public List<FileAssetRecord> list(FileOwnerType ownerType, Long ownerId) {
    ensureVisible(ownerType, ownerId);
    return fileAssetRepository.findByOwnerTypeAndOwnerId(ownerType, ownerId).stream()
        .map(this::toRecord)
        .toList();
  }

  public Resource read(Long id) {
    FileAssetEntity entity =
        fileAssetRepository.findById(id).orElseThrow(() -> new ApiException("文件不存在"));
    ensureVisible(entity.getOwnerType(), entity.getOwnerId());
    return new FileSystemResource(entity.getStoragePath());
  }

  public record FileDownloadInfo(Resource resource, String filename, String mimeType) {}

  public FileDownloadInfo getDownloadInfo(Long id) {
    FileAssetEntity entity =
        fileAssetRepository.findById(id).orElseThrow(() -> new ApiException("文件不存在"));
    ensureVisible(entity.getOwnerType(), entity.getOwnerId());
    return new FileDownloadInfo(
        new FileSystemResource(entity.getStoragePath()),
        entity.getFileName(),
        entity.getMimeType()
    );
  }

  public String filename(Long id) {
    FileAssetEntity entity =
        fileAssetRepository.findById(id).orElseThrow(() -> new ApiException("文件不存在"));
    ensureVisible(entity.getOwnerType(), entity.getOwnerId());
    return entity.getFileName();
  }

  private FileAssetRecord toRecord(FileAssetEntity entity) {
    return new FileAssetRecord(
        entity.getId(),
        entity.getFileName(),
        entity.getOwnerType().name(),
        entity.getOwnerId(),
        entity.getMimeType(),
        entity.getSizeBytes(),
        formatter.format(entity.getCreatedAt()));
  }


  private void ensureWritable(FileOwnerType ownerType, Long ownerId) {
    JwtPrincipal principal = SecurityUtils.principal();
    if (ownerType == FileOwnerType.COURSE) {
      storageService.workspace(StorageScopeType.COURSE, ownerId, false, principal);
      if (principal.role() != UserRole.ADMIN
          && !(principal.role() == UserRole.TEACHER
              && classMemberRepository.findByCourseIdAndUserId(ownerId, principal.userId()).isPresent())) {
        // rely on storage service create/write checks later
      }
      return;
    }
    if (ownerType == FileOwnerType.TEAM) {
      storageService.workspace(StorageScopeType.TEAM, ownerId, false, principal);
      return;
    }
    if (ownerType == FileOwnerType.ASSIGNMENT_SUBMISSION) {
      ensureAssignmentSubmissionVisible(ownerId, principal);
      return;
    }
    if (ownerType == FileOwnerType.CHAT_MESSAGE) {
      chatRoomRepository.findById(ownerId).orElseThrow(() -> new ApiException("聊天室不存在"));
      return;
    }
    Long projectId = resolveProjectId(ownerType, ownerId);
    projectAccessService.requireEditable(projectId, principal);
  }

  private void ensureVisible(FileOwnerType ownerType, Long ownerId) {
    JwtPrincipal principal = SecurityUtils.principal();
    if (ownerType == FileOwnerType.COURSE) {
      storageService.workspace(StorageScopeType.COURSE, ownerId, false, principal);
      return;
    }
    if (ownerType == FileOwnerType.TEAM) {
      storageService.workspace(StorageScopeType.TEAM, ownerId, false, principal);
      return;
    }
    if (ownerType == FileOwnerType.ASSIGNMENT_SUBMISSION) {
      ensureAssignmentSubmissionVisible(ownerId, principal);
      return;
    }
    if (ownerType == FileOwnerType.CHAT_MESSAGE) {
      chatRoomRepository.findById(ownerId).orElseThrow(() -> new ApiException("聊天室不存在"));
      return;
    }
    Long projectId = resolveProjectId(ownerType, ownerId);
    projectAccessService.requireVisible(projectId, principal);
  }

  private Long resolveProjectId(FileOwnerType ownerType, Long ownerId) {
    if (ownerType == null) {
      throw new ApiException("ownerType 不能为空");
    }
    if (ownerId == null) {
      throw new ApiException("ownerId 不能为空");
    }
    switch (ownerType) {
      case COURSE:
      case TEAM:
        return null;
      case PROJECT:
        return ownerId;
      case TASK:
        return taskRepository.findById(ownerId).orElseThrow(() -> new ApiException("任务不存在"))
            .getProject().getId();
      case DOCUMENT:
        return documentRepository.findById(ownerId).orElseThrow(() -> new ApiException("文档不存在"))
            .getProject().getId();
      case DISCUSSION_POST:
        return discussionPostRepository.findById(ownerId).orElseThrow(() -> new ApiException("讨论不存在"))
            .getProject().getId();
      case CHAT_MESSAGE:
        chatRoomRepository.findById(ownerId).orElseThrow(() -> new ApiException("聊天室不存在"));
        return null;
      default:
        throw new ApiException("不支持的文件类型: " + ownerType);
    }
  }

  private void ensureAssignmentSubmissionVisible(Long ownerId, JwtPrincipal principal) {
    AssignmentSubmissionEntity submission =
        assignmentSubmissionRepository
            .findById(ownerId)
            .orElseThrow(() -> new ApiException("作业提交不存在"));
    if (submission.getStudent() != null
        && submission.getStudent().getId().equals(principal.userId())) {
      return;
    }
    boolean isTeacher =
        principal.role() == UserRole.TEACHER
            && submission.getAssignment() != null
            && submission.getAssignment().getCourse() != null
            && submission.getAssignment().getCourse().getTeacher() != null
            && submission.getAssignment().getCourse().getTeacher().getId().equals(principal.userId());
    if (isTeacher) {
      return;
    }
    Long classId =
        submission.getAssignment() != null && submission.getAssignment().getCourse() != null
            ? submission.getAssignment().getCourse().getId()
            : null;
    boolean classMember =
        classId != null
            && classMemberRepository.findByCourseIdAndUserId(classId, principal.userId()).isPresent();
    if (classMember
        && submission.getStudent() != null
        && submission.getStudent().getId().equals(principal.userId())) {
      return;
    }
    throw new ApiException("无权访问该作业附件");
  }

  private void recordUploadActivity(FileAssetEntity entity) {
    JwtPrincipal principal = SecurityUtils.principal();
    if (principal == null) {
      return;
    }
    ProjectEntity project = resolveActivityProject(entity.getOwnerType(), entity.getOwnerId());
    if (project == null) {
      return;
    }
    projectActivityService.recordFileUploaded(
        project,
        principal.userId(),
        entity.getId(),
        entity.getFileName(),
        entity.getOwnerType().name(),
        entity.getOwnerId(),
        entity.getCreatedAt());
  }

  private ProjectEntity resolveActivityProject(FileOwnerType ownerType, Long ownerId) {
    if (ownerType == null || ownerId == null) {
      return null;
    }
    return switch (ownerType) {
      case COURSE, TEAM -> null;
      case PROJECT -> projectAccessService.requireVisible(ownerId, SecurityUtils.principal());
      case TASK -> taskRepository.findById(ownerId).map(task -> task.getProject()).orElse(null);
      case DOCUMENT -> documentRepository.findById(ownerId).map(document -> document.getProject()).orElse(null);
      case DISCUSSION_POST -> discussionPostRepository.findById(ownerId).map(post -> post.getProject()).orElse(null);
      case ASSIGNMENT_SUBMISSION -> assignmentSubmissionRepository.findById(ownerId).map(AssignmentSubmissionEntity::getLinkedProject).orElse(null);
      case CHAT_MESSAGE -> null;
    };
  }

  private ScopeRef resolveScope(FileOwnerType ownerType, Long ownerId) {
    if (ownerType == null || ownerId == null) {
      return new ScopeRef(null, null, null);
    }
    return switch (ownerType) {
      case COURSE -> new ScopeRef(ownerId, null, null);
      case TEAM -> teamRepository.findById(ownerId).map(team -> new ScopeRef(team.getCourse() != null ? team.getCourse().getId() : null, team.getId(), null)).orElse(new ScopeRef(null, null, null));
      case PROJECT -> projectAccessService.requireVisible(ownerId, SecurityUtils.principal()) != null
          ? scopeFromProject(projectAccessService.requireVisible(ownerId, SecurityUtils.principal()))
          : new ScopeRef(null, null, null);
      case TASK -> taskRepository.findById(ownerId).map(task -> scopeFromProject(task.getProject())).orElse(new ScopeRef(null, null, null));
      case DOCUMENT -> documentRepository.findById(ownerId).map(document -> scopeFromProject(document.getProject())).orElse(new ScopeRef(null, null, null));
      case DISCUSSION_POST -> discussionPostRepository.findById(ownerId).map(post -> scopeFromProject(post.getProject())).orElse(new ScopeRef(null, null, null));
      case ASSIGNMENT_SUBMISSION -> assignmentSubmissionRepository.findById(ownerId)
          .map(submission -> submission.getLinkedProject() != null
              ? scopeFromProject(submission.getLinkedProject())
              : new ScopeRef(submission.getAssignment() != null && submission.getAssignment().getCourse() != null ? submission.getAssignment().getCourse().getId() : null, null, null))
          .orElse(new ScopeRef(null, null, null));
      case CHAT_MESSAGE -> new ScopeRef(null, null, null);
    };
  }

  private ScopeRef scopeFromProject(ProjectEntity project) {
    return new ScopeRef(
        project != null && project.getCourse() != null ? project.getCourse().getId() : null,
        project != null && project.getTeam() != null ? project.getTeam().getId() : null,
        project != null ? project.getId() : null);
  }

  private record ScopeRef(Long courseId, Long teamId, Long projectId) {}
}
