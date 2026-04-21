package com.educollab.service;

import static com.educollab.dto.StorageDtos.*;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.FileAssetRecord;
import com.educollab.model.*;
import com.educollab.repo.*;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class StorageService {
  private static final String VIRTUAL_DOCUMENTS_PATH = "@documents";
  private static final String COLLAB_FOLDER_NAME = "协同文档";
  private final StorageNodeRepository storageNodeRepository;
  private final FileAssetRepository fileAssetRepository;
  private final CourseRepository courseRepository;
  private final TeamRepository teamRepository;
  private final TeamMemberRepository teamMemberRepository;
  private final ProjectRepository projectRepository;
  private final ClassMemberRepository classMemberRepository;
  private final TaskRepository taskRepository;
  private final DiscussionPostRepository discussionPostRepository;
  private final AssignmentSubmissionRepository assignmentSubmissionRepository;
  private final DocumentRepository documentRepository;
  private final ProjectAccessService projectAccessService;
  private final StoragePathService storagePathService;
  private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public StorageService(
      StorageNodeRepository storageNodeRepository,
      FileAssetRepository fileAssetRepository,
      CourseRepository courseRepository,
      TeamRepository teamRepository,
      TeamMemberRepository teamMemberRepository,
      ProjectRepository projectRepository,
      ClassMemberRepository classMemberRepository,
      TaskRepository taskRepository,
      DiscussionPostRepository discussionPostRepository,
      AssignmentSubmissionRepository assignmentSubmissionRepository,
      DocumentRepository documentRepository,
      ProjectAccessService projectAccessService,
      StoragePathService storagePathService) {
    this.storageNodeRepository = storageNodeRepository;
    this.fileAssetRepository = fileAssetRepository;
    this.courseRepository = courseRepository;
    this.teamRepository = teamRepository;
    this.teamMemberRepository = teamMemberRepository;
    this.projectRepository = projectRepository;
    this.classMemberRepository = classMemberRepository;
    this.taskRepository = taskRepository;
    this.discussionPostRepository = discussionPostRepository;
    this.assignmentSubmissionRepository = assignmentSubmissionRepository;
    this.documentRepository = documentRepository;
    this.projectAccessService = projectAccessService;
    this.storagePathService = storagePathService;
  }

  @Transactional
  public StorageWorkspaceRecord workspace(
      StorageScopeType scopeType, Long scopeId, boolean includeSystem, JwtPrincipal principal) {
    ScopeContext context = requireScope(scopeType, scopeId, principal, false);
    ensureScopeStructure(context);
    migrateMarkdownDocumentsForScope(context);
    boolean canViewSystem = principal.role() == UserRole.ADMIN;
    List<StorageTreeNodeRecord> tree =
        buildFilesystemTree(context, resolveAbsolutePath("", context), "", includeSystem && canViewSystem);
    StoragePermissionRecord permissions = permissions(context, principal);
    return new StorageWorkspaceRecord(
        scopeType.name(),
        scopeId,
        context.scopeName(),
        "",
        permissions,
        new StorageToolbarCapabilityRecord(
            permissions.canCreateFolder(),
            permissions.canUpload(),
            permissions.canRename(),
            permissions.canDelete(),
            permissions.canMove(),
            permissions.canDownload()),
        tree);
  }

  @Transactional
  public StorageFolderRecord folder(
      StorageScopeType scopeType, Long scopeId, String path, JwtPrincipal principal) {
    ScopeContext context = requireScope(scopeType, scopeId, principal, false);
    ensureScopeStructure(context);
    migrateMarkdownDocumentsForScope(context);
    String relativePath = sanitizeRelativePath(path);
    if (isVirtualDocumentsPath(relativePath)) {
      return virtualDocumentsFolder(context, principal);
    }
    if (relativePath.startsWith("system") && principal.role() == UserRole.STUDENT) {
      throw new ApiException("无权访问系统目录");
    }
    Path folder = resolveAbsolutePath(relativePath, context).normalize();
    if (!folder.startsWith(resolveAbsolutePath("", context).normalize()) || !Files.exists(folder)) {
      throw new ApiException("目录不存在");
    }
    if (!Files.isDirectory(folder)) throw new ApiException("当前条目不是目录");
    List<StorageEntryRecord> entries = new ArrayList<>(listFilesystemEntries(context, relativePath, principal));
    entries.sort(
        Comparator.comparing((StorageEntryRecord item) -> "FILE".equals(item.nodeType()) || item.virtualDocument())
            .thenComparing(StorageEntryRecord::name, String.CASE_INSENSITIVE_ORDER));
    return new StorageFolderRecord(relativePath, relativePath.isBlank() ? context.scopeName() : folder.getFileName().toString(), breadcrumbs(relativePath, context), false, entries);
  }

  @Transactional
  public StorageEntryRecord createFolder(CreateStorageFolderRequest request, JwtPrincipal principal) {
    StorageScopeType scopeType = parseScopeType(request.scopeType());
    ScopeContext context = requireScope(scopeType, request.scopeId(), principal, true);
    ensureWritable(context, principal);
    String parentPath = sanitizeRelativePath(request.parentPath());
    if (isVirtualDocumentsPath(parentPath)) {
      throw new ApiException("文档聚合目录为只读");
    }
    Path parent = resolveAbsolutePath(parentPath, context);
    if (!Files.exists(parent) || !Files.isDirectory(parent)) {
      throw new ApiException("目录不存在");
    }
    String name = sanitizeFolderName(request.name());
    try {
      Path target = parent.resolve(name).normalize();
      if (Files.exists(target)) throw new ApiException("同级目录下已存在同名文件夹");
      Files.createDirectories(target);
    } catch (IOException ex) {
      throw new ApiException("创建目录失败: " + ex.getMessage());
    }
    return toFilesystemEntry(context, principal, joinRelative(parentPath, name), true);
  }

  @Transactional
  public StorageEntryRecord uploadFile(
      StorageScopeType scopeType, Long scopeId, String path, MultipartFile file, JwtPrincipal principal) {
    if (file == null || file.isEmpty()) {
      throw new ApiException("请先选择要上传的文件");
    }
    ScopeContext context = requireScope(scopeType, scopeId, principal, true);
    ensureWritable(context, principal);
    String folderPath = sanitizeRelativePath(path);
    if (isVirtualDocumentsPath(folderPath)) {
      throw new ApiException("文档聚合目录为只读");
    }
    Path folder = resolveAbsolutePath(folderPath, context);
    if (!Files.exists(folder) || !Files.isDirectory(folder)) throw new ApiException("目标不是目录");
    try {
      return doStoreFileByPath(
          folderPath,
          context,
          file.getOriginalFilename(),
          file.getContentType(),
          principal.userId(),
          file.getBytes());
    } catch (IOException ex) {
      throw new ApiException("文件上传失败: " + ex.getMessage());
    }
  }

  @Transactional
  public StorageEntryRecord renameEntry(UpdateStorageEntryRequest request, JwtPrincipal principal) {
    ScopeContext context = requireScope(parseScopeType(request.scopeType()), request.scopeId(), principal, true);
    ensureWritable(context, principal);
    String entryPath = sanitizeRelativePath(request.path());
    if (isVirtualDocumentsPath(entryPath) || isVirtualDocumentsPath(parentRelative(entryPath))) {
      throw new ApiException("文档聚合目录为只读");
    }
    if (entryPath.isBlank()) throw new ApiException("根目录不支持重命名");
    String nextName = sanitizeFileName(request.name());
    String parentPath = parentRelative(entryPath);
    String nextRelative = joinRelative(parentPath, nextName);
    if (Objects.equals(nextRelative, entryPath)) {
      return toFilesystemEntry(context, principal, entryPath, Files.isDirectory(resolveAbsolutePath(entryPath, context)));
    }
    try {
      Path from = resolveAbsolutePath(entryPath, context);
      Path to = resolveAbsolutePath(nextRelative, context);
      if (!Files.exists(from)) throw new ApiException("条目不存在");
      if (Files.exists(to)) throw new ApiException("同级目录下已存在同名条目");
      if (Files.exists(from)) {
        Files.createDirectories(Objects.requireNonNull(to.getParent()));
        Files.move(from, to, StandardCopyOption.REPLACE_EXISTING);
      }
      syncAssetMetadataAfterMove(context, entryPath, nextRelative, nextName);
    } catch (IOException ex) {
      throw new ApiException("重命名失败: " + ex.getMessage());
    }
    return toFilesystemEntry(context, principal, nextRelative, Files.isDirectory(resolveAbsolutePath(nextRelative, context)));
  }

  @Transactional
  public StorageEntryRecord moveEntry(MoveStorageEntryRequest request, JwtPrincipal principal) {
    ScopeContext context = requireScope(parseScopeType(request.scopeType()), request.scopeId(), principal, true);
    ensureWritable(context, principal);
    String entryPath = sanitizeRelativePath(request.path());
    String targetPath = sanitizeRelativePath(request.targetPath());
    if (isVirtualDocumentsPath(entryPath) || isVirtualDocumentsPath(targetPath)) {
      throw new ApiException("文档聚合目录为只读");
    }
    if (entryPath.isBlank()) throw new ApiException("根目录不支持移动");
    Path source = resolveAbsolutePath(entryPath, context);
    Path targetFolder = resolveAbsolutePath(targetPath, context);
    if (!Files.exists(source)) throw new ApiException("条目不存在");
    if (!Files.exists(targetFolder) || !Files.isDirectory(targetFolder)) throw new ApiException("目标目录不存在");
    if (targetFolder.normalize().startsWith(source.normalize())) throw new ApiException("不能把目录移动到自己的子目录下面");
    String nextRelative = joinRelative(targetPath, source.getFileName().toString());
    try {
      Path to = resolveAbsolutePath(nextRelative, context);
      if (Files.exists(to)) throw new ApiException("目标目录下已存在同名条目");
      if (Files.exists(source)) {
        Files.createDirectories(Objects.requireNonNull(to.getParent()));
        Files.move(source, to, StandardCopyOption.REPLACE_EXISTING);
      }
      syncAssetMetadataAfterMove(context, entryPath, nextRelative, source.getFileName().toString());
    } catch (IOException ex) {
      throw new ApiException("移动失败: " + ex.getMessage());
    }
    return toFilesystemEntry(context, principal, nextRelative, Files.isDirectory(resolveAbsolutePath(nextRelative, context)));
  }

  @Transactional
  public void deleteEntry(StorageScopeType scopeType, Long scopeId, String path, JwtPrincipal principal) {
    ScopeContext context = requireScope(scopeType, scopeId, principal, true);
    ensureWritable(context, principal);
    String entryPath = sanitizeRelativePath(path);
    if (isVirtualDocumentsPath(entryPath) || isVirtualDocumentsPath(parentRelative(entryPath))) {
      throw new ApiException("文档聚合目录为只读");
    }
    if (entryPath.isBlank()) throw new ApiException("根目录不支持删除");
    deletePathRecursive(context, entryPath);
  }

  @Transactional
  public void batchDelete(String scopeType, Long scopeId, List<String> entryPaths, JwtPrincipal principal) {
    if (entryPaths == null) return;
    StorageScopeType parsed = parseScopeType(scopeType);
    for (String entryPath : entryPaths) {
      if (entryPath != null) deleteEntry(parsed, scopeId, entryPath, principal);
    }
  }

  @Transactional
  public void batchMove(String scopeType, Long scopeId, List<String> entryPaths, String targetPath, JwtPrincipal principal) {
    if (entryPaths == null || targetPath == null) return;
    for (String entryPath : entryPaths) {
      if (entryPath != null) {
        moveEntry(new MoveStorageEntryRequest(scopeType, scopeId, entryPath, targetPath), principal);
      }
    }
  }

  public record StorageDownloadInfo(Resource resource, String filename, String mimeType) {}

  public StorageDownloadInfo downloadEntry(
      StorageScopeType scopeType, Long scopeId, String path, JwtPrincipal principal) {
    ScopeContext context = requireScope(scopeType, scopeId, principal, false);
    String relativePath = sanitizeRelativePath(path);
    FileAssetEntity asset = findAssetByScopeAndPath(context, relativePath);
    if (asset != null && asset.getStoragePath() != null) {
      return new StorageDownloadInfo(new FileSystemResource(asset.getStoragePath()), asset.getFileName(), asset.getMimeType());
    }
    Path absolute = resolveAbsolutePath(relativePath, context);
    if (!Files.exists(absolute) || Files.isDirectory(absolute)) throw new ApiException("当前条目不支持下载");
    return new StorageDownloadInfo(new FileSystemResource(absolute), absolute.getFileName().toString(), null);
  }

  @Transactional
  public FileAssetRecord storeOwnedFile(MultipartFile file, FileOwnerType ownerType, Long ownerId, JwtPrincipal principal) {
    try {
      return storeOwnedBytes(
          file.getBytes(),
          Objects.requireNonNullElse(file.getOriginalFilename(), "file.bin"),
          file.getContentType(),
          ownerType,
          ownerId,
          principal);
    } catch (IOException ex) {
      throw new ApiException("文件上传失败: " + ex.getMessage());
    }
  }

  @Transactional
  public FileAssetRecord storeOwnedBytes(
      byte[] bytes,
      String fileName,
      String mimeType,
      FileOwnerType ownerType,
      Long ownerId,
      JwtPrincipal principal) {
    LegacyOwnerContext ownerContext = resolveLegacyOwner(ownerType, ownerId, principal);
    String folderPath = legacyFolderPath(ownerContext.ownerType());
    FileAssetEntity asset =
        storeAsset(folderPath, ownerContext.scopeContext(), fileName, mimeType, bytes, ownerType, ownerId);
    return toLegacyFileAssetRecord(asset);
  }

  @Transactional
  public int migrateLegacyStorage() {
    int moved = 0;
    for (CourseEntity course : courseRepository.findAll()) {
      ensureScopeStructure(
          new ScopeContext(
              StorageScopeType.COURSE,
              course.getId(),
              course.getName(),
              course.getId(),
              null,
              null,
              StorageSpaceType.COURSE_SPACE,
              StorageVisibility.TEACHERS_ONLY,
              false));
    }
    for (TeamEntity team : teamRepository.findAll()) {
      ensureScopeStructure(
          new ScopeContext(
              StorageScopeType.TEAM,
              team.getId(),
              team.getName(),
              team.getCourse() != null ? team.getCourse().getId() : null,
              team.getId(),
              null,
              StorageSpaceType.TEAM_SPACE,
              StorageVisibility.TEAM_MEMBERS,
              false));
    }
    for (ProjectEntity project : projectRepository.findAll()) {
      ensureProjectStructure(project);
    }
    for (FileAssetEntity asset : fileAssetRepository.findAll()) {
      try {
        moved += migrateFileAsset(asset) ? 1 : 0;
      } catch (Exception ignored) {
      }
    }
    for (ProjectEntity project : projectRepository.findAll()) {
      try {
        moved += syncProjectDocumentNodes(project.getId());
      } catch (Exception ignored) {
      }
    }
    moved += migrateAllMarkdownDocuments();
    moved += normalizeFileAssetMetadata();
    moved += cleanupLegacyStorageNodes();
    moved += cleanupLegacyEmptyDirectories();
    return moved;
  }

  public Path absoluteProjectActivityRoot(ProjectEntity project) {
    return storagePathService.projectActivityLogsRoot(project);
  }

  private boolean migrateFileAsset(FileAssetEntity asset) throws IOException {
    FileOwnerType ownerType = asset.getOwnerType();
    if (ownerType == null || asset.getOwnerId() == null) {
      return false;
    }
    LegacyOwnerContext ownerContext = resolveLegacyOwner(ownerType, asset.getOwnerId(), new JwtPrincipal(0L, "system@educollab.local", UserRole.ADMIN));
    String folderPath = legacyFolderPath(ownerContext.ownerType());
    String targetName = sanitizeFileName(asset.getFileName());
    String relativePath = joinRelative(folderPath, targetName);
    if (findAssetByScopeAndPath(ownerContext.scopeContext(), relativePath) != null && !Objects.equals(findAssetByScopeAndPath(ownerContext.scopeContext(), relativePath).getId(), asset.getId())) {
      targetName = dedupePhysicalName(folderPath, targetName, ownerContext.scopeContext());
      relativePath = joinRelative(folderPath, targetName);
    }
    Path target = resolveAbsolutePath(relativePath, ownerContext.scopeContext());
    Files.createDirectories(Objects.requireNonNull(target.getParent()));
    if (asset.getStoragePath() != null && !asset.getStoragePath().isBlank()) {
      Path current = Path.of(asset.getStoragePath());
      if (Files.exists(current) && !current.equals(target)) {
        Files.move(current, target, StandardCopyOption.REPLACE_EXISTING);
      }
    }
    asset.setStoragePath(target.toString());
    asset.setRelativePath(relativePath);
    asset.setCourseId(ownerContext.scopeContext().courseId());
    asset.setTeamId(ownerContext.scopeContext().teamId());
    asset.setProjectId(ownerContext.scopeContext().projectId());
    asset.setSpaceType(ownerContext.scopeContext().spaceType());
    asset.setVisibility(ownerContext.scopeContext().defaultVisibility());
    asset.setSystemManaged(ownerContext.scopeContext().hiddenFromStudents());
    asset.setHiddenFromStudents(ownerContext.scopeContext().hiddenFromStudents());
    asset.setStorageNodeId(null);
    asset.setStorageKey(relativePath);
    fileAssetRepository.save(asset);
    return true;
  }

  @Transactional
  public void onFileAssetDeleted(FileAssetEntity asset) {
    if (asset == null) return;
    if (asset.getStorageNodeId() != null) {
      storageNodeRepository.findById(asset.getStorageNodeId()).ifPresent(storageNodeRepository::delete);
    } else {
      storageNodeRepository.findByFileAssetId(asset.getId()).ifPresent(storageNodeRepository::delete);
    }
  }

  private StorageEntryRecord doStoreFile(
      StorageNodeEntity folder,
      ScopeContext context,
      String originalName,
      String mimeType,
      Long userId,
      byte[] bytes) {
    FileOwnerType ownerType =
        switch (context.scopeType()) {
          case COURSE -> FileOwnerType.COURSE;
          case TEAM -> FileOwnerType.TEAM;
          case PROJECT -> FileOwnerType.PROJECT;
          case SYSTEM -> FileOwnerType.CHAT_MESSAGE;
        };
    Long ownerId = context.projectId() != null ? context.projectId() : context.scopeId();
    FileAssetEntity asset = storeAsset(folder.getRelativePath(), context, originalName, mimeType, bytes, ownerType, ownerId);
    return toFilesystemEntry(context, new JwtPrincipal(userId, "system@educollab.local", UserRole.ADMIN), asset.getRelativePath(), false);
  }

  private StorageEntryRecord doStoreFileByPath(
      String folderPath,
      ScopeContext context,
      String originalName,
      String mimeType,
      Long userId,
      byte[] bytes) {
    String safeName = sanitizeFileName(originalName);
    String targetRelative = joinRelative(folderPath, safeName);
    if (findAssetByScopeAndPath(context, targetRelative) != null || Files.exists(resolveAbsolutePath(targetRelative, context))) {
      safeName = dedupePhysicalName(folderPath, safeName, context);
      targetRelative = joinRelative(folderPath, safeName);
    }
    Path target = resolveAbsolutePath(targetRelative, context);
    try {
      Files.createDirectories(Objects.requireNonNull(target.getParent()));
      Files.copy(new ByteArrayInputStream(bytes), target, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException ex) {
      throw new ApiException("文件写入失败: " + ex.getMessage());
    }
    FileOwnerType ownerType =
        switch (context.scopeType()) {
          case COURSE -> FileOwnerType.COURSE;
          case TEAM -> FileOwnerType.TEAM;
          case PROJECT -> FileOwnerType.PROJECT;
          case SYSTEM -> FileOwnerType.CHAT_MESSAGE;
        };
    Long ownerId = context.projectId() != null ? context.projectId() : context.scopeId();
    FileAssetEntity asset = new FileAssetEntity();
    asset.setOwnerType(ownerType);
    asset.setOwnerId(ownerId);
    asset.setFileName(safeName);
    asset.setStoragePath(target.toString());
    asset.setMimeType(mimeType);
    asset.setSizeBytes((long) bytes.length);
    asset.setRelativePath(targetRelative);
    asset.setCourseId(context.courseId());
    asset.setTeamId(context.teamId());
    asset.setProjectId(context.projectId());
    asset.setSpaceType(context.spaceType());
    asset.setVisibility(context.defaultVisibility());
    asset.setSystemManaged(context.hiddenFromStudents());
    asset.setHiddenFromStudents(context.hiddenFromStudents());
    asset = fileAssetRepository.save(asset);
    return toFilesystemEntry(context, new JwtPrincipal(userId, "system@educollab.local", UserRole.ADMIN), targetRelative, false);
  }

  private FileAssetEntity storeAsset(
      String folderPath,
      ScopeContext context,
      String originalName,
      String mimeType,
      byte[] bytes,
      FileOwnerType ownerType,
      Long ownerId) {
    String safeName = sanitizeFileName(originalName);
    String relativePath = joinRelative(folderPath, safeName);
    if (findAssetByScopeAndPath(context, relativePath) != null || Files.exists(resolveAbsolutePath(relativePath, context))) {
      safeName = dedupePhysicalName(folderPath, safeName, context);
      relativePath = joinRelative(folderPath, safeName);
    }
    Path target = resolveAbsolutePath(relativePath, context);
    try {
      Files.createDirectories(Objects.requireNonNull(target.getParent()));
      Files.copy(new ByteArrayInputStream(bytes), target, StandardCopyOption.REPLACE_EXISTING);
    } catch (IOException ex) {
      throw new ApiException("文件写入失败: " + ex.getMessage());
    }
    FileAssetEntity asset = new FileAssetEntity();
    asset.setOwnerType(ownerType);
    asset.setOwnerId(ownerId);
    asset.setFileName(safeName);
    asset.setStoragePath(target.toString());
    asset.setMimeType(mimeType);
    asset.setSizeBytes((long) bytes.length);
    asset.setRelativePath(relativePath);
    asset.setCourseId(context.courseId());
    asset.setTeamId(context.teamId());
    asset.setProjectId(context.projectId());
    asset.setSpaceType(context.spaceType());
    asset.setVisibility(context.defaultVisibility());
    asset.setSystemManaged(context.hiddenFromStudents());
    asset.setHiddenFromStudents(context.hiddenFromStudents());
    asset.setStorageKey(relativePath);
    asset = fileAssetRepository.save(asset);
    return asset;
  }

  private StorageEntryRecord toEntryRecord(
      StorageNodeEntity entity, ScopeContext context, JwtPrincipal principal) {
    FileAssetEntity asset =
        entity.getFileAssetId() != null
            ? fileAssetRepository.findById(entity.getFileAssetId()).orElse(null)
            : null;
    boolean linkedDocument = entity.getLinkedDocumentId() != null;
    boolean editable = canEdit(context, principal) && !entity.isSystemManaged() && !linkedDocument;
    boolean downloadable = asset != null;
    DocumentEntity document =
        linkedDocument ? documentRepository.findById(entity.getLinkedDocumentId()).orElse(null) : null;
    return new StorageEntryRecord(
        entity.getRelativePath(),
        entity.getParentId() != null
            ? storageNodeRepository.findById(entity.getParentId()).map(StorageNodeEntity::getRelativePath).orElse("")
            : "",
        entity.getNodeType().name(),
        entity.getName(),
        entity.getRelativePath(),
        asset != null
            ? asset.getMimeType()
            : linkedDocument
                ? "application/x-educollab-document"
                : null,
        asset != null ? asset.getSizeBytes() : null,
        formatter.format(entity.getUpdatedAt()),
        entity.getCreatedBy() != null && entity.getCreatedBy() > 0 ? "成员" : (entity.isSystemManaged() ? "系统" : null),
        entity.getFileAssetId(),
        entity.getLinkedDocumentId(),
        linkedDocument ? "DOCUMENT" : entity.getNodeType() == StorageNodeType.FILE ? "FILE" : "FOLDER",
        document != null ? normalizeDocumentKind(document.getKind()).name() : null,
        document != null ? document.getOfficeExt() : null,
        document != null ? document.getProject().getId() : context.projectId(),
        document != null ? document.getProject().getName() : context.scopeName(),
        entity.getLinkedDocumentId() != null ? "/app/projects/" + context.projectId() + "/documents/" + entity.getLinkedDocumentId() : null,
        entity.isSystemManaged() || linkedDocument,
        entity.isSystemManaged(),
        entity.isHiddenFromStudents(),
        downloadable,
        editable,
        editable,
        editable,
        false);
  }

  @Transactional
  public int syncProjectDocumentNodes(Long projectId) {
    ProjectEntity project =
        projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
    ScopeContext context = projectFilesContext(project);
    StorageNodeEntity root = ensureRootFolder(context);
    int changed = 0;
    List<DocumentEntity> documents = documentRepository.findByProjectId(projectId);
    for (DocumentEntity document : documents) {
      changed += syncDocumentNode(document, root, context) ? 1 : 0;
    }
    Set<Long> validDocumentIds =
        documents.stream().map(DocumentEntity::getId).collect(java.util.stream.Collectors.toSet());
    for (StorageNodeEntity node :
        storageNodeRepository.findByScopeTypeAndScopeIdAndSpaceTypeOrderByNodeTypeAscNameAsc(
            StorageScopeType.PROJECT, projectId, StorageSpaceType.PROJECT_FILES)) {
      if (node.getLinkedDocumentId() != null && !validDocumentIds.contains(node.getLinkedDocumentId())) {
        deleteEntryRecursive(node, context);
        changed++;
      }
    }
    return changed;
  }

  @Transactional
  public int migrateAllMarkdownDocuments() {
    int changed = 0;
    for (ProjectEntity project : projectRepository.findAll()) {
      changed += syncProjectDocumentNodes(project.getId());
    }
    return changed;
  }

  @Transactional
  public DocumentEntity ensureDocumentFromProjectFile(ProjectEntity project, String path, Long userId) {
    ScopeContext context = projectFilesContext(project);
    ensureScopeStructure(context);
    String relativePath = sanitizeRelativePath(path);
    if (relativePath.isBlank()) {
      throw new ApiException("缺少文件路径");
    }
    FileAssetEntity asset = findAssetByScopeAndPath(context, relativePath);
    if (asset == null) {
      throw new ApiException("文件不存在");
    }
    String ext = detectOfficeExt(asset.getFileName(), asset.getMimeType());
    boolean markdown = isMarkdownFile(asset.getFileName(), asset.getMimeType());
    if (ext == null && !markdown) {
      throw new ApiException("当前文件不是可编辑的文档");
    }
    DocumentEntity existing =
        documentRepository.findByProjectId(project.getId()).stream()
            .filter(doc -> Objects.equals(doc.getFileAssetId(), asset.getId()))
            .findFirst()
            .orElse(null);
    if (existing != null) {
      return existing;
    }
    DocumentEntity document = new DocumentEntity();
    document.setProject(project);
    document.setTitle(stripDocumentExtension(asset.getFileName(), markdown ? "md" : ext));
    document.setExcerpt("");
    document.setCurrentContent(markdown ? readMarkdownAsset(asset) : null);
    document.setCollabKey((markdown ? "doc-" : "office-") + UUID.randomUUID());
    document.setKind(markdown ? DocumentKind.MARKDOWN : DocumentKind.OFFICE);
    document.setOfficeExt(markdown ? null : ext);
    documentRepository.save(document);
    asset.setOwnerType(FileOwnerType.DOCUMENT);
    asset.setOwnerId(document.getId());
    fileAssetRepository.save(asset);
    document.setFileAssetId(asset.getId());
    if (markdown) {
      document.setExcerpt(excerptMarkdown(document.getCurrentContent()));
    }
    documentRepository.save(document);
    syncProjectDocumentNodes(project.getId());
    return document;
  }

  private boolean syncDocumentNode(
      DocumentEntity document, StorageNodeEntity root, ScopeContext context) {
    StorageNodeEntity node =
        storageNodeRepository
            .findByLinkedDocumentId(document.getId())
            .orElseGet(
                () -> {
                  StorageNodeEntity created = new StorageNodeEntity();
                  created.setParentId(root.getId());
                  created.setNodeType(StorageNodeType.FILE);
                  applyScope(created, context);
                  created.setCreatedBy(0L);
                  created.setVisibility(context.defaultVisibility());
                  created.setHiddenFromStudents(false);
                  created.setSystemManaged(false);
                  created.setLinkedDocumentId(document.getId());
                  return created;
                });
    String folderPath = documentFolderPath(document);
    String preferredName = documentFileName(document);
    String targetName = dedupeDocumentName(document, folderPath, preferredName);
    String targetRelativePath = joinRelative(folderPath, targetName);
    boolean changed =
        !Objects.equals(node.getName(), targetName)
            || !Objects.equals(node.getRelativePath(), targetRelativePath)
            || !Objects.equals(node.getFileAssetId(), document.getFileAssetId())
            || !Objects.equals(node.getParentId(), root.getId());
    node.setParentId(root.getId());
    node.setName(targetName);
    node.setRelativePath(targetRelativePath);
    node.setFileAssetId(document.getFileAssetId());
    node = storageNodeRepository.save(node);

    changed |= ensureDocumentAsset(document, context, targetRelativePath, targetName);
    return changed;
  }

  private String documentFileName(DocumentEntity document) {
    String title = sanitizeFileName(document.getTitle());
    if (normalizeDocumentKind(document.getKind()) == DocumentKind.OFFICE && document.getOfficeExt() != null) {
      String ext = "." + document.getOfficeExt().toLowerCase(Locale.ROOT);
      return title.toLowerCase(Locale.ROOT).endsWith(ext) ? title : title + ext;
    }
    return title.toLowerCase(Locale.ROOT).endsWith(".md") ? title : title + ".md";
  }

  private String documentFolderPath(DocumentEntity document) {
    if (normalizeDocumentKind(document.getKind()) == DocumentKind.MARKDOWN) {
      return COLLAB_FOLDER_NAME;
    }
    FileAssetEntity asset =
        document.getFileAssetId() != null
            ? fileAssetRepository.findById(document.getFileAssetId()).orElse(null)
            : null;
    if (asset != null && asset.getRelativePath() != null && !asset.getRelativePath().isBlank()) {
      String parent = parentRelative(asset.getRelativePath());
      if (!parent.isBlank() && !"文档附件".equals(parent)) {
        return parent;
      }
    }
    return "";
  }

  private DocumentKind normalizeDocumentKind(DocumentKind kind) {
    if (kind == null || kind == DocumentKind.NOTE) {
      return DocumentKind.MARKDOWN;
    }
    return kind;
  }

  private String dedupeDocumentName(DocumentEntity document, String folderPath, String preferredName) {
    ScopeContext context = projectFilesContext(document.getProject());
    String candidate = preferredName;
    FileAssetEntity existingAsset =
        document.getFileAssetId() != null
            ? fileAssetRepository.findById(document.getFileAssetId()).orElse(null)
            : null;
    Path existingPath =
        existingAsset != null && existingAsset.getRelativePath() != null
            ? resolveAbsolutePath(existingAsset.getRelativePath(), context).normalize()
            : null;
    while (true) {
      String relative = joinRelative(folderPath, candidate);
      FileAssetEntity collision = findAssetByScopeAndPath(context, relative);
      if (collision != null && !Objects.equals(collision.getId(), document.getFileAssetId())) {
        candidate = dedupePhysicalName(folderPath, candidate, context);
        continue;
      }
      Path target = resolveAbsolutePath(relative, context).normalize();
      if (Files.exists(target) && (existingPath == null || !existingPath.equals(target))) {
        candidate = dedupePhysicalName(folderPath, candidate, context);
        continue;
      }
      return candidate;
    }
  }

  private boolean ensureDocumentAsset(
      DocumentEntity document, ScopeContext context, String targetRelativePath, String targetName) {
    Path targetPath = resolveAbsolutePath(targetRelativePath, context);
    try {
      Files.createDirectories(Objects.requireNonNull(targetPath.getParent()));
      DocumentKind normalizedKind = normalizeDocumentKind(document.getKind());
      FileAssetEntity asset =
          document.getFileAssetId() != null
              ? fileAssetRepository.findById(document.getFileAssetId()).orElse(null)
              : null;
      boolean changed = false;

      if (asset == null) {
        asset = new FileAssetEntity();
        asset.setOwnerType(FileOwnerType.DOCUMENT);
        asset.setOwnerId(document.getId());
        changed = true;
      }

      if (normalizedKind == DocumentKind.OFFICE) {
        if (asset.getStoragePath() != null && !asset.getStoragePath().isBlank()) {
          Path current = Path.of(asset.getStoragePath());
          if (Files.exists(current) && !current.equals(targetPath)) {
            Files.move(current, targetPath, StandardCopyOption.REPLACE_EXISTING);
            changed = true;
          }
        }
      } else {
        Files.writeString(targetPath, Objects.requireNonNullElse(document.getCurrentContent(), ""), StandardCharsets.UTF_8);
        asset.setMimeType("text/markdown; charset=utf-8");
        asset.setSizeBytes(Files.size(targetPath));
        changed = true;
      }

      if (asset.getStoragePath() == null || !Objects.equals(asset.getStoragePath(), targetPath.toString())) {
        asset.setStoragePath(targetPath.toString());
        changed = true;
      }
      if (!Objects.equals(asset.getRelativePath(), targetRelativePath)) {
        asset.setRelativePath(targetRelativePath);
        changed = true;
      }
      if (!Objects.equals(asset.getStorageKey(), targetRelativePath)) {
        asset.setStorageKey(targetRelativePath);
        changed = true;
      }
      if (!Objects.equals(asset.getFileName(), targetName)) {
        asset.setFileName(targetName);
        changed = true;
      }
      if (!Objects.equals(asset.getCourseId(), context.courseId())) {
        asset.setCourseId(context.courseId());
        changed = true;
      }
      if (!Objects.equals(asset.getTeamId(), context.teamId())) {
        asset.setTeamId(context.teamId());
        changed = true;
      }
      if (!Objects.equals(asset.getProjectId(), context.projectId())) {
        asset.setProjectId(context.projectId());
        changed = true;
      }
      if (!Objects.equals(asset.getSpaceType(), context.spaceType())) {
        asset.setSpaceType(context.spaceType());
        changed = true;
      }
      if (!Objects.equals(asset.getVisibility(), context.defaultVisibility())) {
        asset.setVisibility(context.defaultVisibility());
        changed = true;
      }
      if (asset.isSystemManaged()) {
        asset.setSystemManaged(false);
        changed = true;
      }
      if (asset.isHiddenFromStudents()) {
        asset.setHiddenFromStudents(false);
        changed = true;
      }
      asset.setStorageNodeId(null);
      asset = fileAssetRepository.save(asset);
      if (!Objects.equals(document.getFileAssetId(), asset.getId())) {
        document.setFileAssetId(asset.getId());
        documentRepository.save(document);
        changed = true;
      }
      return changed;
    } catch (IOException ex) {
      throw new ApiException("同步文档文件结构失败: " + ex.getMessage());
    }
  }

  private void migrateMarkdownDocumentsForScope(ScopeContext context) {
    if (context.projectId() != null) {
      syncProjectDocumentNodes(context.projectId());
      return;
    }
    scopeProjects(context).forEach(project -> syncProjectDocumentNodes(project.getId()));
  }

  private boolean isVirtualDocumentsPath(String path) {
    return VIRTUAL_DOCUMENTS_PATH.equals(sanitizeRelativePath(path));
  }

  private List<StorageTreeNodeRecord> maybePrependVirtualDocumentsNode(
      ScopeContext context, String relativePath, List<StorageTreeNodeRecord> nodes) {
    if (!relativePath.isBlank()
        || !(context.scopeType() == StorageScopeType.COURSE || context.scopeType() == StorageScopeType.TEAM)) {
      return nodes;
    }
    List<StorageTreeNodeRecord> result = new ArrayList<>();
    result.add(
        new StorageTreeNodeRecord(
            VIRTUAL_DOCUMENTS_PATH,
            "文档",
            StorageNodeType.FOLDER.name(),
            "VIRTUAL_FOLDER",
            true,
            false,
            false,
            List.of()));
    result.addAll(nodes);
    return result;
  }

  private StorageFolderRecord virtualDocumentsFolder(ScopeContext context, JwtPrincipal principal) {
    List<StorageEntryRecord> entries =
        aggregateScopeDocuments(context, principal).stream()
            .sorted(
                Comparator.comparing(
                        (StorageEntryRecord item) -> Objects.requireNonNullElse(item.updatedAt(), ""))
                    .reversed()
                    .thenComparing(StorageEntryRecord::name, String.CASE_INSENSITIVE_ORDER))
            .toList();
    return new StorageFolderRecord(
        VIRTUAL_DOCUMENTS_PATH,
        "文档",
        List.of(
            new StoragePathBreadcrumbRecord("", context.scopeName()),
            new StoragePathBreadcrumbRecord(VIRTUAL_DOCUMENTS_PATH, "文档")),
        true,
        entries);
  }

  private List<StorageEntryRecord> aggregateScopeDocuments(ScopeContext context, JwtPrincipal principal) {
    return visibleProjectsForScope(context, principal).stream()
        .flatMap(project -> documentRepository.findByProjectId(project.getId()).stream())
        .map(document -> toVirtualDocumentEntry(document))
        .toList();
  }

  private List<ProjectEntity> visibleProjectsForScope(ScopeContext context, JwtPrincipal principal) {
    return projectAccessService.visibleProjects(principal).stream()
        .filter(project -> switch (context.scopeType()) {
          case COURSE -> Objects.equals(project.getCourse() != null ? project.getCourse().getId() : null, context.courseId());
          case TEAM -> Objects.equals(project.getTeam() != null ? project.getTeam().getId() : null, context.teamId());
          case PROJECT -> Objects.equals(project.getId(), context.projectId());
          case SYSTEM -> false;
        })
        .sorted(Comparator.comparing(ProjectEntity::getUpdatedAt).reversed())
        .toList();
  }

  private List<ProjectEntity> scopeProjects(ScopeContext context) {
    return switch (context.scopeType()) {
      case COURSE -> projectRepository.findByCourseIdOrderByCreatedAtAsc(context.courseId());
      case TEAM -> projectRepository.findByTeamId(context.teamId()).stream().toList();
      case PROJECT -> projectRepository.findById(context.projectId()).stream().toList();
      case SYSTEM -> List.of();
    };
  }

  private StorageEntryRecord toVirtualDocumentEntry(DocumentEntity document) {
    DocumentKind normalizedKind = normalizeDocumentKind(document.getKind());
    String path = joinRelative(VIRTUAL_DOCUMENTS_PATH, document.getId().toString());
    return new StorageEntryRecord(
        path,
        VIRTUAL_DOCUMENTS_PATH,
        StorageNodeType.FILE.name(),
        documentFileName(document),
        path,
        normalizedKind == DocumentKind.OFFICE
            ? switch (Objects.requireNonNullElse(document.getOfficeExt(), "").toLowerCase(Locale.ROOT)) {
              case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
              case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
              case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
              default -> "application/octet-stream";
            }
            : "text/markdown; charset=utf-8",
        null,
        formatter.format(document.getUpdatedAt()),
        null,
        document.getFileAssetId(),
        document.getId(),
        "DOCUMENT",
        normalizedKind.name(),
        document.getOfficeExt(),
        document.getProject().getId(),
        document.getProject().getName(),
        "/app/projects/" + document.getProject().getId() + "/documents/" + document.getId(),
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        true);
  }

  private List<StorageTreeNodeRecord> buildFilesystemTree(
      ScopeContext context, Path directory, String relativePath, boolean includeSystem) {
    if (!Files.exists(directory) || !Files.isDirectory(directory)) {
      return maybePrependVirtualDocumentsNode(context, relativePath, List.of());
    }
    try (Stream<Path> stream = Files.list(directory)) {
      List<StorageTreeNodeRecord> nodes =
          stream
          .filter(Files::isDirectory)
          .filter(path -> includeSystem || !"system".equals(path.getFileName().toString()))
          .sorted(Comparator.comparing(path -> path.getFileName().toString(), String.CASE_INSENSITIVE_ORDER))
          .map(
              path -> {
                String childRelative = joinRelative(relativePath, path.getFileName().toString());
                boolean systemManaged = childRelative.startsWith("system");
                return new StorageTreeNodeRecord(
                    childRelative,
                    path.getFileName().toString(),
                    systemManaged ? StorageNodeType.SYSTEM_FOLDER.name() : StorageNodeType.FOLDER.name(),
                    "FOLDER",
                    systemManaged,
                    systemManaged,
                    systemManaged,
                    buildFilesystemTree(context, path, childRelative, includeSystem));
              })
          .toList();
      return maybePrependVirtualDocumentsNode(context, relativePath, nodes);
    } catch (IOException ex) {
      throw new ApiException("读取目录结构失败: " + ex.getMessage());
    }
  }

  private List<StorageEntryRecord> listFilesystemEntries(
      ScopeContext context, String folderPath, JwtPrincipal principal) {
    Path absolute = resolveAbsolutePath(folderPath, context);
    Map<String, FileAssetEntity> assetsByPath = assetsByScope(context).stream()
        .filter(asset -> asset.getRelativePath() != null && !asset.getRelativePath().isBlank())
        .collect(Collectors.toMap(FileAssetEntity::getRelativePath, asset -> asset, (left, right) -> right));
    Map<Long, DocumentEntity> documentsByAssetId =
        context.projectId() == null
            ? Map.of()
            : documentRepository.findByProjectId(context.projectId()).stream()
                .filter(doc -> doc.getFileAssetId() != null)
                .collect(Collectors.toMap(DocumentEntity::getFileAssetId, doc -> doc, (left, right) -> right));
    try (Stream<Path> stream = Files.list(absolute)) {
      return stream
          .filter(path -> principal.role() == UserRole.ADMIN || !"system".equals(path.getFileName().toString()))
          .sorted(
              Comparator
                  .comparing((Path path) -> Files.isRegularFile(path))
                  .thenComparing(path -> path.getFileName().toString(), String.CASE_INSENSITIVE_ORDER))
          .map(path -> toFilesystemEntry(context, principal, relativize(context, path), Files.isDirectory(path), assetsByPath, documentsByAssetId))
          .toList();
    } catch (IOException ex) {
      throw new ApiException("读取目录失败: " + ex.getMessage());
    }
  }

  private StorageEntryRecord toFilesystemEntry(
      ScopeContext context, JwtPrincipal principal, String relativePath, boolean directory) {
    return toFilesystemEntry(context, principal, relativePath, directory, null, null);
  }

  private StorageEntryRecord toFilesystemEntry(
      ScopeContext context,
      JwtPrincipal principal,
      String relativePath,
      boolean directory,
      Map<String, FileAssetEntity> assetsByPath,
      Map<Long, DocumentEntity> documentsByAssetId) {
    String safePath = sanitizeRelativePath(relativePath);
    Path absolute = resolveAbsolutePath(safePath, context);
    if (!Files.exists(absolute)) throw new ApiException("条目不存在");
    FileAssetEntity asset = assetsByPath != null ? assetsByPath.get(safePath) : findAssetByScopeAndPath(context, safePath);
    DocumentEntity linkedDocument =
        asset != null && documentsByAssetId != null && asset.getId() != null
            ? documentsByAssetId.get(asset.getId())
            : null;
    if (linkedDocument == null && asset != null && context.projectId() != null) {
      linkedDocument =
          documentRepository.findByProjectId(context.projectId()).stream()
              .filter(doc -> Objects.equals(doc.getFileAssetId(), asset.getId()))
              .findFirst()
              .orElse(null);
    }
    String name = safePath.isBlank() ? context.scopeName() : absolute.getFileName().toString();
    boolean systemManaged = safePath.startsWith("system");
    boolean isDocument = linkedDocument != null;
    String officeExt = linkedDocument != null ? linkedDocument.getOfficeExt() : detectOfficeExt(name, asset != null ? asset.getMimeType() : null);
    boolean markdownFile = linkedDocument == null && isMarkdownFile(name, asset != null ? asset.getMimeType() : null);
    if (!isDocument && officeExt != null) {
      isDocument = true;
    }
    if (!isDocument && markdownFile) {
      isDocument = true;
    }
    String documentKind =
        linkedDocument != null
            ? normalizeDocumentKind(linkedDocument.getKind()).name()
            : officeExt != null ? DocumentKind.OFFICE.name() : markdownFile ? DocumentKind.MARKDOWN.name() : null;
    boolean editable = canEdit(context, principal) && !systemManaged && !isDocument;
    try {
      return new StorageEntryRecord(
          safePath,
          parentRelative(safePath),
          directory ? (systemManaged ? StorageNodeType.SYSTEM_FOLDER.name() : StorageNodeType.FOLDER.name()) : StorageNodeType.FILE.name(),
          name,
          safePath,
          directory ? null : asset != null ? asset.getMimeType() : Files.probeContentType(absolute),
          directory ? null : (asset != null ? asset.getSizeBytes() : Files.size(absolute)),
          formatter.format(Files.getLastModifiedTime(absolute).toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDateTime()),
          systemManaged ? "系统" : null,
          asset != null ? asset.getId() : null,
          linkedDocument != null ? linkedDocument.getId() : null,
          isDocument ? "DOCUMENT" : directory ? "FOLDER" : "FILE",
          documentKind,
          officeExt,
          linkedDocument != null ? linkedDocument.getProject().getId() : context.projectId(),
          linkedDocument != null ? linkedDocument.getProject().getName() : context.scopeName(),
          linkedDocument != null ? "/app/projects/" + context.projectId() + "/documents/" + linkedDocument.getId() : null,
          systemManaged,
          systemManaged,
          systemManaged,
          !directory,
          editable,
          editable,
          editable,
          linkedDocument != null);
    } catch (IOException ex) {
      throw new ApiException("读取文件信息失败: " + ex.getMessage());
    }
  }

  private List<StoragePathBreadcrumbRecord> breadcrumbs(String relativePath, ScopeContext context) {
    List<StoragePathBreadcrumbRecord> crumbs = new ArrayList<>();
    crumbs.add(new StoragePathBreadcrumbRecord("", context.scopeName()));
    String current = "";
    for (String segment : sanitizeRelativePath(relativePath).split("/")) {
      if (segment == null || segment.isBlank()) continue;
      current = joinRelative(current, segment);
      crumbs.add(new StoragePathBreadcrumbRecord(current, segment));
    }
    return crumbs;
  }

  private String sanitizeRelativePath(String path) {
    String value = Objects.requireNonNullElse(path, "").trim().replace('\\', '/');
    while (value.startsWith("/")) value = value.substring(1);
    while (value.endsWith("/")) value = value.substring(0, value.length() - 1);
    if (value.contains("..")) throw new ApiException("非法路径");
    return value;
  }

  private String parentRelative(String relativePath) {
    String value = sanitizeRelativePath(relativePath);
    int idx = value.lastIndexOf('/');
    return idx < 0 ? "" : value.substring(0, idx);
  }

  private String relativize(ScopeContext context, Path path) {
    return sanitizeRelativePath(resolveAbsolutePath("", context).relativize(path).toString().replace('\\', '/'));
  }

  private List<FileAssetEntity> assetsByScope(ScopeContext context) {
    return fileAssetRepository.findAll().stream()
        .filter(
            asset ->
                Objects.equals(asset.getCourseId(), context.courseId())
                    && Objects.equals(asset.getTeamId(), context.teamId())
                    && Objects.equals(asset.getProjectId(), context.projectId())
                    && Objects.equals(asset.getSpaceType(), context.spaceType()))
        .toList();
  }

  private FileAssetEntity findAssetByScopeAndPath(ScopeContext context, String relativePath) {
    return assetsByScope(context).stream()
        .filter(asset -> Objects.equals(asset.getRelativePath(), relativePath))
        .findFirst()
        .orElse(null);
  }

  private void deletePathRecursive(ScopeContext context, String relativePath) {
    Path absolute = resolveAbsolutePath(relativePath, context);
    if (!Files.exists(absolute)) throw new ApiException("条目不存在");
    List<FileAssetEntity> relatedAssets =
        assetsByScope(context).stream()
            .filter(asset -> Objects.equals(asset.getRelativePath(), relativePath) || asset.getRelativePath() != null && asset.getRelativePath().startsWith(relativePath + "/"))
            .toList();
    for (FileAssetEntity asset : relatedAssets) {
      onFileAssetDeleted(asset);
      fileAssetRepository.delete(asset);
    }
    try (Stream<Path> walk = Files.walk(absolute)) {
      walk.sorted(Comparator.reverseOrder()).forEach(path -> {
        try {
          Files.deleteIfExists(path);
        } catch (IOException ignored) {
        }
      });
    } catch (IOException ex) {
      throw new ApiException("删除失败: " + ex.getMessage());
    }
  }

  private void syncAssetMetadataAfterMove(
      ScopeContext context, String previousRelative, String nextRelative, String nextName) {
    for (FileAssetEntity asset : assetsByScope(context)) {
      if (asset.getRelativePath() == null) continue;
      if (Objects.equals(asset.getRelativePath(), previousRelative)) {
        Path absolute = resolveAbsolutePath(nextRelative, context);
        asset.setRelativePath(nextRelative);
        asset.setStoragePath(absolute.toString());
        asset.setFileName(nextName);
        fileAssetRepository.save(asset);
        continue;
      }
      if (asset.getRelativePath().startsWith(previousRelative + "/")) {
        String suffix = asset.getRelativePath().substring(previousRelative.length());
        String updated = nextRelative + suffix;
        asset.setRelativePath(updated);
        asset.setStoragePath(resolveAbsolutePath(updated, context).toString());
        fileAssetRepository.save(asset);
      }
    }
  }

  private int cleanupLegacyStorageNodes() {
    int removed = 0;
    Set<Long> validDocumentIds =
        documentRepository.findAll().stream().map(DocumentEntity::getId).collect(Collectors.toSet());
    for (StorageNodeEntity node : storageNodeRepository.findAll()) {
      boolean keepRoot = node.getParentId() == null && (node.getRelativePath() == null || node.getRelativePath().isBlank());
      boolean keepDocumentLink = node.getLinkedDocumentId() != null && validDocumentIds.contains(node.getLinkedDocumentId());
      if (keepRoot || keepDocumentLink) {
        continue;
      }
      storageNodeRepository.delete(node);
      removed++;
    }
    return removed;
  }

  private int normalizeFileAssetMetadata() {
    int updated = 0;
    for (FileAssetEntity asset : fileAssetRepository.findAll()) {
      if (asset.getOwnerType() == null || asset.getOwnerId() == null) {
        continue;
      }
      try {
        LegacyOwnerContext ownerContext =
            resolveLegacyOwner(
                asset.getOwnerType(),
                asset.getOwnerId(),
                new JwtPrincipal(0L, "system@educollab.local", UserRole.ADMIN));
        ScopeContext context = ownerContext.scopeContext();
        String safeRelativePath = sanitizeRelativePath(Objects.requireNonNullElse(asset.getRelativePath(), ""));
        String safeFileName = sanitizeFileName(asset.getFileName());
        String normalizedRelativePath =
            safeRelativePath.isBlank() ? safeFileName : safeRelativePath;

        Path currentPath =
            asset.getStoragePath() == null || asset.getStoragePath().isBlank()
                ? null
                : Path.of(asset.getStoragePath()).normalize();
        Path expectedPath = resolveAbsolutePath(normalizedRelativePath, context).normalize();
        boolean changed = false;

        if ((currentPath == null || !Files.exists(currentPath)) && !Files.exists(expectedPath)) {
          currentPath = locatePhysicalAssetCandidate(expectedPath, safeFileName);
        }

        if (currentPath != null && Files.exists(currentPath) && !currentPath.equals(expectedPath)) {
          Files.createDirectories(Objects.requireNonNull(expectedPath.getParent()));
          Files.move(currentPath, expectedPath, StandardCopyOption.REPLACE_EXISTING);
          currentPath = expectedPath;
          changed = true;
        }

        if (!Objects.equals(asset.getRelativePath(), normalizedRelativePath)) {
          asset.setRelativePath(normalizedRelativePath);
          changed = true;
        }
        if (!Objects.equals(asset.getStoragePath(), expectedPath.toString())) {
          asset.setStoragePath(expectedPath.toString());
          changed = true;
        }
        if (!Objects.equals(asset.getStorageKey(), normalizedRelativePath)) {
          asset.setStorageKey(normalizedRelativePath);
          changed = true;
        }
        if (asset.getStorageNodeId() != null) {
          asset.setStorageNodeId(null);
          changed = true;
        }
        if (!Objects.equals(asset.getCourseId(), context.courseId())) {
          asset.setCourseId(context.courseId());
          changed = true;
        }
        if (!Objects.equals(asset.getTeamId(), context.teamId())) {
          asset.setTeamId(context.teamId());
          changed = true;
        }
        if (!Objects.equals(asset.getProjectId(), context.projectId())) {
          asset.setProjectId(context.projectId());
          changed = true;
        }
        if (!Objects.equals(asset.getSpaceType(), context.spaceType())) {
          asset.setSpaceType(context.spaceType());
          changed = true;
        }
        if (!Objects.equals(asset.getVisibility(), context.defaultVisibility())) {
          asset.setVisibility(context.defaultVisibility());
          changed = true;
        }
        if (asset.isSystemManaged() != context.hiddenFromStudents()) {
          asset.setSystemManaged(context.hiddenFromStudents());
          changed = true;
        }
        if (asset.isHiddenFromStudents() != context.hiddenFromStudents()) {
          asset.setHiddenFromStudents(context.hiddenFromStudents());
          changed = true;
        }

        if (changed) {
          fileAssetRepository.save(asset);
          updated++;
        }
      } catch (Exception ignored) {
      }
    }
    return updated;
  }

  private Path locatePhysicalAssetCandidate(Path expectedPath, String expectedName) {
    Path parent = expectedPath.getParent();
    if (parent == null || !Files.isDirectory(parent)) {
      return null;
    }
    String normalizedExpected = expectedName.toLowerCase(Locale.ROOT);
    String baseName = stripSuffixNumber(expectedName).toLowerCase(Locale.ROOT);
    try (Stream<Path> stream = Files.list(parent)) {
      return stream
          .filter(Files::isRegularFile)
          .filter(path -> {
            String candidate = path.getFileName().toString().toLowerCase(Locale.ROOT);
            return candidate.equals(normalizedExpected)
                || candidate.equals(baseName)
                || stripSuffixNumber(candidate).equals(baseName);
          })
          .sorted(Comparator.comparing(path -> path.getFileName().toString(), String.CASE_INSENSITIVE_ORDER))
          .findFirst()
          .orElse(null);
    } catch (IOException ignored) {
      return null;
    }
  }

  private String stripSuffixNumber(String filename) {
    if (filename == null || filename.isBlank()) {
      return "";
    }
    int dot = filename.lastIndexOf('.');
    String stem = dot >= 0 ? filename.substring(0, dot) : filename;
    String ext = dot >= 0 ? filename.substring(dot) : "";
    return stem.replaceFirst(" \\(\\d+\\)$", "") + ext;
  }

  private int cleanupLegacyEmptyDirectories() {
    int removed = 0;
    for (CourseEntity course : courseRepository.findAll()) {
      removed += removeEmptyDirsRecursively(storagePathService.courseFilesRoot(course));
    }
    for (TeamEntity team : teamRepository.findAll()) {
      removed += removeEmptyDirsRecursively(storagePathService.teamFilesRoot(team));
    }
    for (ProjectEntity project : projectRepository.findAll()) {
      removed += removeEmptyDirsRecursively(storagePathService.projectFilesRoot(project));
    }
    return removed;
  }

  private int removeEmptyDirsRecursively(Path root) {
    if (!Files.exists(root)) return 0;
    try (Stream<Path> walk = Files.walk(root)) {
      List<Path> directories =
          walk.filter(Files::isDirectory)
              .sorted(Comparator.reverseOrder())
              .toList();
      int removed = 0;
      for (Path dir : directories) {
        if (dir.equals(root)) continue;
        try (Stream<Path> children = Files.list(dir)) {
          if (children.findAny().isEmpty()) {
            Files.deleteIfExists(dir);
            removed++;
          }
        }
      }
      return removed;
    } catch (IOException ex) {
      return 0;
    }
  }

  private List<StorageTreeNodeRecord> buildTree(Long rootId, boolean includeSystem, JwtPrincipal principal) {
    StorageNodeEntity root = storageNodeRepository.findById(rootId).orElseThrow();
    return storageNodeRepository.findByParentIdOrderByNodeTypeAscNameAsc(rootId).stream()
        .filter(node -> includeSystem || !node.isHiddenFromStudents())
        .map(node -> buildTreeNode(node, includeSystem, principal))
        .toList();
  }

  private StorageTreeNodeRecord buildTreeNode(StorageNodeEntity node, boolean includeSystem, JwtPrincipal principal) {
    List<StorageTreeNodeRecord> children =
        node.getNodeType() == StorageNodeType.FILE
            ? List.of()
            : storageNodeRepository.findByParentIdOrderByNodeTypeAscNameAsc(node.getId()).stream()
                .filter(child -> includeSystem || !child.isHiddenFromStudents())
                .map(child -> buildTreeNode(child, includeSystem, principal))
                .toList();
    return new StorageTreeNodeRecord(
        node.getRelativePath(),
        node.getName(),
        node.getNodeType().name(),
        node.getNodeType() == StorageNodeType.FILE ? "FILE" : "FOLDER",
        node.isSystemManaged(),
        node.isSystemManaged(),
        node.isHiddenFromStudents(),
        children);
  }

  private List<StorageBreadcrumbRecord> breadcrumbs(StorageNodeEntity node) {
    List<StorageBreadcrumbRecord> breadcrumbs = new ArrayList<>();
    StorageNodeEntity cursor = node;
    while (cursor != null) {
      breadcrumbs.add(new StorageBreadcrumbRecord(cursor.getId(), cursor.getName()));
      cursor = cursor.getParentId() != null ? storageNodeRepository.findById(cursor.getParentId()).orElse(null) : null;
    }
    Collections.reverse(breadcrumbs);
    return breadcrumbs;
  }

  private StorageNodeEntity ensureRootFolder(ScopeContext context) {
    String name = switch (context.spaceType()) {
      case COURSE_SPACE -> "课程文件";
      case TEAM_SPACE -> "团队文件";
      case PROJECT_FILES -> "项目文件";
      case PROJECT_REPOSITORY -> "仓库";
      case PROJECT_SYSTEM -> "系统文件";
    };
    return storageNodeRepository
        .findByScopeTypeAndScopeIdAndSpaceTypeAndRelativePath(
            context.scopeType(), context.scopeId(), context.spaceType(), "")
        .orElseGet(
            () -> {
              StorageNodeEntity root = new StorageNodeEntity();
              root.setParentId(null);
              root.setNodeType(context.hiddenFromStudents() ? StorageNodeType.SYSTEM_FOLDER : StorageNodeType.FOLDER);
              root.setName(name);
              applyScope(root, context);
              root.setRelativePath("");
              root.setSystemManaged(context.hiddenFromStudents());
              root.setHiddenFromStudents(context.hiddenFromStudents());
              root.setVisibility(context.defaultVisibility());
              root.setCreatedBy(0L);
              return storageNodeRepository.save(root);
            });
  }

  private void ensureScopeStructure(ScopeContext context) {
    StorageNodeEntity root = ensureRootFolder(context);
    try {
      Files.createDirectories(resolveAbsolutePath(root, context));
    } catch (IOException ex) {
      throw new ApiException("初始化文件空间失败: " + ex.getMessage());
    }
    if (context.scopeType() == StorageScopeType.PROJECT && context.projectId() != null) {
      ProjectEntity project =
          projectRepository.findById(context.projectId()).orElseThrow(() -> new ApiException("项目不存在"));
      ensureProjectStructure(project);
    }
  }

  private void ensureProjectStructure(ProjectEntity project) {
    try {
      Files.createDirectories(storagePathService.projectFilesRoot(project));
      Files.createDirectories(storagePathService.projectRepositoryRoot(project));
      Files.createDirectories(storagePathService.projectActivityLogsRoot(project));
      Files.createDirectories(storagePathService.projectSummaryCacheRoot(project));
      Files.createDirectories(storagePathService.projectAuditRoot(project));
    } catch (IOException ex) {
      throw new ApiException("初始化项目目录失败: " + ex.getMessage());
    }
  }

  private StorageNodeEntity ensureLegacyFolder(LegacyOwnerContext ownerContext, Long userId) {
    ScopeContext context = ownerContext.scopeContext();
    StorageNodeEntity root = ensureRootFolder(context);
    String ownerFolderName =
        switch (ownerContext.ownerType()) {
          case COURSE -> "";
          case TEAM -> "";
          case PROJECT -> "";
          case TASK -> "任务附件";
          case DOCUMENT -> "文档附件";
          case DISCUSSION_POST -> "讨论附件";
          case ASSIGNMENT_SUBMISSION -> "作业附件";
          case CHAT_MESSAGE -> "聊天附件";
        };
    if (ownerFolderName.isBlank()) {
      return root;
    }
    return storageNodeRepository
        .findByScopeTypeAndScopeIdAndSpaceTypeAndParentIdAndNameIgnoreCase(
            context.scopeType(), context.scopeId(), context.spaceType(), root.getId(), ownerFolderName)
        .orElseGet(
            () -> {
              StorageNodeEntity folder = new StorageNodeEntity();
              folder.setParentId(root.getId());
              folder.setNodeType(StorageNodeType.FOLDER);
              folder.setName(ownerFolderName);
              applyScope(folder, context);
              folder.setRelativePath(joinRelative(root.getRelativePath(), ownerFolderName));
              folder.setCreatedBy(userId);
              folder.setVisibility(context.defaultVisibility());
              folder.setHiddenFromStudents(context.hiddenFromStudents());
              folder = storageNodeRepository.save(folder);
              try {
                Files.createDirectories(resolveAbsolutePath(folder, context));
              } catch (IOException ignored) {
              }
              return folder;
            });
  }

  private String legacyFolderPath(FileOwnerType ownerType) {
    return switch (ownerType) {
      case COURSE, TEAM, PROJECT -> "";
      case TASK -> "任务附件";
      case DOCUMENT -> "文档附件";
      case DISCUSSION_POST -> "讨论附件";
      case ASSIGNMENT_SUBMISSION -> "作业附件";
      case CHAT_MESSAGE -> "聊天附件";
    };
  }

  private ScopeContext requireScope(
      StorageScopeType scopeType, Long scopeId, JwtPrincipal principal, boolean write) {
    if (scopeType == null || scopeId == null) {
      throw new ApiException("缺少文件空间参数");
    }
    return switch (scopeType) {
      case COURSE -> requireCourseScope(scopeId, principal, write);
      case TEAM -> requireTeamScope(scopeId, principal, write);
      case PROJECT -> requireProjectScope(scopeId, principal, write);
      case SYSTEM -> throw new ApiException("当前接口不开放系统空间");
    };
  }

  private ScopeContext requireCourseScope(Long courseId, JwtPrincipal principal, boolean write) {
    CourseEntity course = courseRepository.findById(courseId).orElseThrow(() -> new ApiException("课程不存在"));
    boolean visible =
        principal.role() == UserRole.ADMIN
            || (principal.role() == UserRole.TEACHER
                && course.getTeacher() != null
                && Objects.equals(course.getTeacher().getId(), principal.userId()))
            || classMemberRepository.findByCourseIdAndUserId(courseId, principal.userId()).isPresent();
    if (!visible) throw new ApiException("无权访问该课程文件空间");
    if (write
        && !(principal.role() == UserRole.ADMIN
            || (principal.role() == UserRole.TEACHER
                && course.getTeacher() != null
                && Objects.equals(course.getTeacher().getId(), principal.userId())))) {
      throw new ApiException("只有教师或管理员可以管理课程文件");
    }
    return new ScopeContext(
        StorageScopeType.COURSE,
        courseId,
        course.getName(),
        course.getId(),
        null,
        null,
        StorageSpaceType.COURSE_SPACE,
        StorageVisibility.TEACHERS_ONLY,
        false);
  }

  private ScopeContext requireTeamScope(Long teamId, JwtPrincipal principal, boolean write) {
    TeamEntity team = teamRepository.findById(teamId).orElseThrow(() -> new ApiException("团队不存在"));
    CourseEntity course = team.getCourse();
    boolean isTeacher =
        principal.role() == UserRole.ADMIN
            || (principal.role() == UserRole.TEACHER
                && course != null
                && course.getTeacher() != null
                && Objects.equals(course.getTeacher().getId(), principal.userId()));
    boolean member = teamMemberRepository.findByTeamIdAndUserId(teamId, principal.userId()).isPresent();
    if (!(isTeacher || member)) throw new ApiException("无权访问该团队文件空间");
    if (write && !(isTeacher || member)) throw new ApiException("无权管理该团队文件");
    return new ScopeContext(
        StorageScopeType.TEAM,
        teamId,
        team.getName(),
        course != null ? course.getId() : null,
        team.getId(),
        null,
        StorageSpaceType.TEAM_SPACE,
        StorageVisibility.TEAM_MEMBERS,
        false);
  }

  private ScopeContext requireProjectScope(Long projectId, JwtPrincipal principal, boolean write) {
    ProjectEntity project =
        write
            ? projectAccessService.requireEditable(projectId, principal)
            : projectAccessService.requireVisible(projectId, principal);
    return projectFilesContext(project);
  }

  private ScopeContext projectFilesContext(ProjectEntity project) {
    return new ScopeContext(
        StorageScopeType.PROJECT,
        project.getId(),
        project.getName(),
        project.getCourse() != null ? project.getCourse().getId() : null,
        project.getTeam() != null ? project.getTeam().getId() : null,
        project.getId(),
        StorageSpaceType.PROJECT_FILES,
        StorageVisibility.PROJECT_MEMBERS,
        false);
  }

  private StoragePermissionRecord permissions(ScopeContext context, JwtPrincipal principal) {
    boolean editable = canEdit(context, principal);
    return new StoragePermissionRecord(
        editable,
        editable,
        editable,
        editable,
        editable,
        true,
        principal.role() == UserRole.ADMIN);
  }

  private boolean canEdit(ScopeContext context, JwtPrincipal principal) {
    if (principal.role() == UserRole.ADMIN) return true;
    return switch (context.scopeType()) {
      case COURSE ->
          principal.role() == UserRole.TEACHER
              && courseRepository.findById(context.scopeId()).map(CourseEntity::getTeacher).map(UserEntity::getId).filter(id -> Objects.equals(id, principal.userId())).isPresent();
      case TEAM -> teamMemberRepository.findByTeamIdAndUserId(context.scopeId(), principal.userId()).isPresent()
          || teamRepository.findById(context.scopeId()).map(TeamEntity::getCourse).map(CourseEntity::getTeacher).map(UserEntity::getId).filter(id -> Objects.equals(id, principal.userId())).isPresent();
      case PROJECT -> projectAccessService.canEdit(context.scopeId(), principal);
      case SYSTEM -> false;
    };
  }

  private void ensureWritable(ScopeContext context, JwtPrincipal principal) {
    if (!canEdit(context, principal)) {
      throw new ApiException("当前文件空间为只读");
    }
  }

  private StorageNodeEntity requireFolder(Long folderId, ScopeContext context, JwtPrincipal principal) {
    StorageNodeEntity folder =
        folderId != null
            ? storageNodeRepository.findById(folderId).orElseThrow(() -> new ApiException("目录不存在"))
            : ensureRootFolder(context);
    if (!Objects.equals(folder.getScopeType(), context.scopeType())
        || !Objects.equals(folder.getScopeId(), context.scopeId())) {
      throw new ApiException("目录不属于当前文件空间");
    }
    if (folder.getNodeType() == StorageNodeType.FILE) {
      throw new ApiException("目标不是目录");
    }
    if (folder.isHiddenFromStudents() && principal.role() == UserRole.STUDENT) {
      throw new ApiException("无权写入系统目录");
    }
    return folder;
  }

  private void deleteEntryRecursive(StorageNodeEntity entry, ScopeContext context) {
    if (entry.getNodeType() != StorageNodeType.FILE) {
      for (StorageNodeEntity child : storageNodeRepository.findByParentIdOrderByNodeTypeAscNameAsc(entry.getId())) {
        deleteEntryRecursive(child, context);
      }
    }
    if (entry.getFileAssetId() != null) {
      fileAssetRepository.findById(entry.getFileAssetId())
          .ifPresent(
              asset -> {
                try {
                  if (asset.getStoragePath() != null) {
                    Files.deleteIfExists(Path.of(asset.getStoragePath()));
                  }
                } catch (IOException ignored) {
                }
                fileAssetRepository.delete(asset);
              });
    } else {
      try {
        Path path = resolveAbsolutePath(entry, context);
        if (Files.isDirectory(path)) {
          try (var walk = Files.walk(path)) {
            walk.sorted(Comparator.reverseOrder()).forEach(item -> {
              try {
                Files.deleteIfExists(item);
              } catch (IOException ignored) {
              }
            });
          }
        }
      } catch (IOException ignored) {
      }
    }
    storageNodeRepository.delete(entry);
  }

  private void syncDescendantsAfterMove(
      StorageNodeEntity entry, String previousRelative, String nextRelative, ScopeContext context) {
    List<StorageNodeEntity> descendants = storageNodeRepository.findByScopeTypeAndScopeIdOrderByRelativePathAsc(context.scopeType(), context.scopeId()).stream()
        .filter(item -> item.getId() != null && !item.getId().equals(entry.getId()))
        .filter(item -> previousRelative.isBlank() ? false : item.getRelativePath() != null && item.getRelativePath().startsWith(previousRelative + "/"))
        .toList();
    for (StorageNodeEntity descendant : descendants) {
      String suffix = descendant.getRelativePath().substring(previousRelative.length());
      String updated = nextRelative + suffix;
      descendant.setRelativePath(updated);
      storageNodeRepository.save(descendant);
      if (descendant.getFileAssetId() != null) {
        fileAssetRepository.findById(descendant.getFileAssetId()).ifPresent(asset -> {
          Path absolute = resolveAbsolutePath(updated, context);
          asset.setRelativePath(updated);
          asset.setStoragePath(absolute.toString());
          fileAssetRepository.save(asset);
        });
      }
    }
    if (entry.getFileAssetId() != null) {
      fileAssetRepository.findById(entry.getFileAssetId()).ifPresent(asset -> {
        Path absolute = resolveAbsolutePath(nextRelative, context);
        asset.setRelativePath(nextRelative);
        asset.setStoragePath(absolute.toString());
        asset.setFileName(entry.getName());
        fileAssetRepository.save(asset);
      });
    }
  }

  private boolean isDescendant(StorageNodeEntity candidate, StorageNodeEntity ancestor) {
    StorageNodeEntity cursor = candidate;
    while (cursor != null) {
      if (Objects.equals(cursor.getParentId(), ancestor.getId())) return true;
      cursor = cursor.getParentId() != null ? storageNodeRepository.findById(cursor.getParentId()).orElse(null) : null;
    }
    return false;
  }

  private Path resolveAbsolutePath(StorageNodeEntity node, ScopeContext context) {
    return resolveAbsolutePath(node.getRelativePath(), context);
  }

  private Path resolveAbsolutePath(String relativePath, ScopeContext context) {
    Path base = switch (context.spaceType()) {
      case COURSE_SPACE -> storagePathService.courseFilesRoot(courseRepository.findById(context.courseId()).orElseThrow());
      case TEAM_SPACE -> storagePathService.teamFilesRoot(teamRepository.findById(context.teamId()).orElseThrow());
      case PROJECT_FILES -> storagePathService.projectFilesRoot(projectRepository.findById(context.projectId()).orElseThrow());
      case PROJECT_REPOSITORY -> storagePathService.projectRepositoryRoot(projectRepository.findById(context.projectId()).orElseThrow());
      case PROJECT_SYSTEM -> storagePathService.projectSystemRoot(projectRepository.findById(context.projectId()).orElseThrow());
    };
    return relativePath == null || relativePath.isBlank() ? base : base.resolve(relativePath);
  }

  private String joinRelative(String parent, String name) {
    if (parent == null || parent.isBlank()) return name;
    return parent + "/" + name;
  }

  private String sanitizeFolderName(String name) {
    String normalized = Objects.requireNonNullElse(name, "").trim().replaceAll("[\\\\/:*?\"<>|]+", "_");
    if (normalized.isBlank()) throw new ApiException("文件夹名称不能为空");
    return normalized;
  }

  private String sanitizeFileName(String name) {
    String normalized = Objects.requireNonNullElse(name, "file.bin").trim().replaceAll("[\\\\/:*?\"<>|]+", "_");
    if (normalized.isBlank()) return "file.bin";
    return normalized;
  }

  private String dedupeName(StorageNodeEntity folder, String preferredName, Long excludeNodeId) {
    String base = preferredName;
    String stem = base;
    String ext = "";
    int dot = base.lastIndexOf('.');
    if (dot > 0) {
      stem = base.substring(0, dot);
      ext = base.substring(dot);
    }
    String candidate = base;
    int index = 2;
    while (storageNodeRepository
        .findByScopeTypeAndScopeIdAndSpaceTypeAndParentIdAndNameIgnoreCase(
            folder.getScopeType(), folder.getScopeId(), folder.getSpaceType(), folder.getId(), candidate)
        .filter(existing -> excludeNodeId == null || !Objects.equals(existing.getId(), excludeNodeId))
        .isPresent()) {
      candidate = stem + " (" + index++ + ")" + ext;
    }
    return candidate;
  }

  private String dedupePhysicalName(String parentPath, String preferredName, ScopeContext context) {
    String stem = preferredName;
    String ext = "";
    int dot = preferredName.lastIndexOf('.');
    if (dot > 0) {
      stem = preferredName.substring(0, dot);
      ext = preferredName.substring(dot);
    }
    String candidate = preferredName;
    int index = 2;
    while (Files.exists(resolveAbsolutePath(joinRelative(parentPath, candidate), context))) {
      candidate = stem + " (" + index++ + ")" + ext;
    }
    return candidate;
  }

  private String detectOfficeExt(String fileName, String mimeType) {
    String lowerName = Objects.requireNonNullElse(fileName, "").toLowerCase(Locale.ROOT);
    for (String ext : List.of("docx", "doc", "xlsx", "xls", "pptx", "ppt")) {
      if (lowerName.endsWith("." + ext)) {
        return ext;
      }
    }
    String lowerMime = Objects.requireNonNullElse(mimeType, "").toLowerCase(Locale.ROOT);
    if (lowerMime.contains("word")) return lowerMime.contains("document") ? "docx" : "doc";
    if (lowerMime.contains("sheet") || lowerMime.contains("excel")) return lowerMime.contains("spreadsheetml") ? "xlsx" : "xls";
    if (lowerMime.contains("presentation")) return lowerMime.contains("presentationml") ? "pptx" : "ppt";
    return null;
  }

  private boolean isMarkdownFile(String fileName, String mimeType) {
    String lowerName = Objects.requireNonNullElse(fileName, "").toLowerCase(Locale.ROOT);
    if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
      return true;
    }
    String lowerMime = Objects.requireNonNullElse(mimeType, "").toLowerCase(Locale.ROOT);
    return lowerMime.contains("text/markdown") || lowerMime.contains("markdown");
  }

  private String stripDocumentExtension(String fileName, String ext) {
    String normalized = Objects.requireNonNullElse(fileName, "");
    if (ext == null || ext.isBlank()) {
      return normalized;
    }
    String suffix = "." + ext.toLowerCase(Locale.ROOT);
    return normalized.toLowerCase(Locale.ROOT).endsWith(suffix)
        ? normalized.substring(0, normalized.length() - suffix.length())
        : normalized;
  }

  private String readMarkdownAsset(FileAssetEntity asset) {
    try {
      if (asset.getStoragePath() == null || asset.getStoragePath().isBlank()) {
        return "";
      }
      Path path = Path.of(asset.getStoragePath());
      if (!Files.exists(path)) {
        return "";
      }
      return Files.readString(path, StandardCharsets.UTF_8);
    } catch (IOException ex) {
      throw new ApiException("读取 Markdown 文件失败: " + ex.getMessage());
    }
  }

  private String excerptMarkdown(String content) {
    if (content == null || content.isBlank()) return "";
    String plain = content.replaceAll("[#>*_`\\-\\[\\]\\(\\)]", " ").replaceAll("\\s+", " ").trim();
    return plain.substring(0, Math.min(plain.length(), 80));
  }

  private void applyScope(StorageNodeEntity node, ScopeContext context) {
    node.setScopeType(context.scopeType());
    node.setScopeId(context.scopeId());
    node.setSpaceType(context.spaceType());
    node.setCourseId(context.courseId());
    node.setTeamId(context.teamId());
    node.setProjectId(context.projectId());
  }

  private FileAssetRecord toLegacyFileAssetRecord(FileAssetEntity entity) {
    return new FileAssetRecord(
        entity.getId(),
        entity.getFileName(),
        entity.getOwnerType().name(),
        entity.getOwnerId(),
        entity.getMimeType(),
        entity.getSizeBytes(),
        formatter.format(entity.getCreatedAt()));
  }

  private LegacyOwnerContext resolveLegacyOwner(FileOwnerType ownerType, Long ownerId, JwtPrincipal principal) {
    if (ownerType == null || ownerId == null) throw new ApiException("缺少附件归属");
    return switch (ownerType) {
      case COURSE -> {
        CourseEntity course = courseRepository.findById(ownerId).orElseThrow(() -> new ApiException("课程不存在"));
        yield new LegacyOwnerContext(ownerType, new ScopeContext(StorageScopeType.COURSE, course.getId(), course.getName(), course.getId(), null, null, StorageSpaceType.COURSE_SPACE, StorageVisibility.TEACHERS_ONLY, false));
      }
      case TEAM -> {
        TeamEntity team = teamRepository.findById(ownerId).orElseThrow(() -> new ApiException("团队不存在"));
        yield new LegacyOwnerContext(ownerType, new ScopeContext(StorageScopeType.TEAM, team.getId(), team.getName(), team.getCourse() != null ? team.getCourse().getId() : null, team.getId(), null, StorageSpaceType.TEAM_SPACE, StorageVisibility.TEAM_MEMBERS, false));
      }
      case PROJECT -> {
        ProjectEntity project =
            principal.role() == UserRole.ADMIN
                ? projectRepository.findById(ownerId).orElseThrow(() -> new ApiException("项目不存在"))
                : projectAccessService.requireEditable(ownerId, principal);
        yield new LegacyOwnerContext(ownerType, new ScopeContext(StorageScopeType.PROJECT, project.getId(), project.getName(), project.getCourse() != null ? project.getCourse().getId() : null, project.getTeam() != null ? project.getTeam().getId() : null, project.getId(), StorageSpaceType.PROJECT_FILES, StorageVisibility.PROJECT_MEMBERS, false));
      }
      case TASK -> taskScope(ownerId, ownerType, principal);
      case DOCUMENT -> documentScope(ownerId, ownerType, principal);
      case DISCUSSION_POST -> discussionScope(ownerId, ownerType, principal);
      case ASSIGNMENT_SUBMISSION -> assignmentScope(ownerId, ownerType, principal);
      case CHAT_MESSAGE -> new LegacyOwnerContext(ownerType, new ScopeContext(StorageScopeType.SYSTEM, ownerId, "聊天附件", null, null, null, StorageSpaceType.COURSE_SPACE, StorageVisibility.ADMIN_ONLY, true));
    };
  }

  private LegacyOwnerContext taskScope(Long ownerId, FileOwnerType ownerType, JwtPrincipal principal) {
    TaskEntity task = taskRepository.findById(ownerId).orElseThrow(() -> new ApiException("任务不存在"));
    ProjectEntity project = principal.role() == UserRole.ADMIN ? task.getProject() : projectAccessService.requireEditable(task.getProject().getId(), principal);
    return new LegacyOwnerContext(ownerType, new ScopeContext(StorageScopeType.PROJECT, project.getId(), project.getName(), project.getCourse() != null ? project.getCourse().getId() : null, project.getTeam() != null ? project.getTeam().getId() : null, project.getId(), StorageSpaceType.PROJECT_FILES, StorageVisibility.PROJECT_MEMBERS, false));
  }

  private LegacyOwnerContext documentScope(Long ownerId, FileOwnerType ownerType, JwtPrincipal principal) {
    DocumentEntity document = documentRepository.findById(ownerId).orElseThrow(() -> new ApiException("文档不存在"));
    ProjectEntity project = principal.role() == UserRole.ADMIN ? document.getProject() : projectAccessService.requireEditable(document.getProject().getId(), principal);
    return new LegacyOwnerContext(ownerType, new ScopeContext(StorageScopeType.PROJECT, project.getId(), project.getName(), project.getCourse() != null ? project.getCourse().getId() : null, project.getTeam() != null ? project.getTeam().getId() : null, project.getId(), StorageSpaceType.PROJECT_FILES, StorageVisibility.PROJECT_MEMBERS, false));
  }

  private LegacyOwnerContext discussionScope(Long ownerId, FileOwnerType ownerType, JwtPrincipal principal) {
    DiscussionPostEntity post = discussionPostRepository.findById(ownerId).orElseThrow(() -> new ApiException("讨论不存在"));
    ProjectEntity project = principal.role() == UserRole.ADMIN ? post.getProject() : projectAccessService.requireEditable(post.getProject().getId(), principal);
    return new LegacyOwnerContext(ownerType, new ScopeContext(StorageScopeType.PROJECT, project.getId(), project.getName(), project.getCourse() != null ? project.getCourse().getId() : null, project.getTeam() != null ? project.getTeam().getId() : null, project.getId(), StorageSpaceType.PROJECT_FILES, StorageVisibility.PROJECT_MEMBERS, false));
  }

  private LegacyOwnerContext assignmentScope(Long ownerId, FileOwnerType ownerType, JwtPrincipal principal) {
    AssignmentSubmissionEntity submission =
        assignmentSubmissionRepository.findById(ownerId).orElseThrow(() -> new ApiException("作业提交不存在"));
    if (submission.getLinkedProject() != null) {
      ProjectEntity project = principal.role() == UserRole.ADMIN ? submission.getLinkedProject() : projectAccessService.requireVisible(submission.getLinkedProject().getId(), principal);
      return new LegacyOwnerContext(ownerType, new ScopeContext(StorageScopeType.PROJECT, project.getId(), project.getName(), project.getCourse() != null ? project.getCourse().getId() : null, project.getTeam() != null ? project.getTeam().getId() : null, project.getId(), StorageSpaceType.PROJECT_FILES, StorageVisibility.PROJECT_MEMBERS, false));
    }
    CourseEntity course = submission.getAssignment() != null ? submission.getAssignment().getCourse() : null;
    if (course == null) throw new ApiException("作业提交缺少课程归属");
    boolean visible = principal.role() == UserRole.ADMIN || principal.role() == UserRole.TEACHER || Objects.equals(submission.getStudent() != null ? submission.getStudent().getId() : null, principal.userId());
    if (!visible) throw new ApiException("无权访问该作业附件");
    return new LegacyOwnerContext(ownerType, new ScopeContext(StorageScopeType.COURSE, course.getId(), course.getName(), course.getId(), null, null, StorageSpaceType.COURSE_SPACE, StorageVisibility.TEACHERS_ONLY, false));
  }

  private String mimeForOffice(String ext) {
    return switch (Objects.requireNonNullElse(ext, "").toLowerCase(Locale.ROOT)) {
      case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case "pptx" -> "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      default -> "application/octet-stream";
    };
  }

  private StorageScopeType parseScopeType(String value) {
    try {
      return StorageScopeType.valueOf(Objects.requireNonNullElse(value, "").trim().toUpperCase(Locale.ROOT));
    } catch (Exception ex) {
      throw new ApiException("无效的 scopeType");
    }
  }

  private record ScopeContext(
      StorageScopeType scopeType,
      Long scopeId,
      String scopeName,
      Long courseId,
      Long teamId,
      Long projectId,
      StorageSpaceType spaceType,
      StorageVisibility defaultVisibility,
      boolean hiddenFromStudents) {}

  private record LegacyOwnerContext(FileOwnerType ownerType, ScopeContext scopeContext) {}
}
