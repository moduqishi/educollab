package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.model.GitRepositoryEntity;
import com.educollab.model.MergeRequestEntity;
import com.educollab.model.MergeRequestStatus;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectReleaseEntity;
import com.educollab.repo.GitRepositoryRepository;
import com.educollab.repo.MergeRequestRepository;
import com.educollab.repo.ProjectReleaseRepository;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.ListBranchCommand;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.diff.Edit;
import org.eclipse.jgit.internal.storage.file.FileRepository;
import org.eclipse.jgit.lib.Constants;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.PersonIdent;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevSort;
import org.eclipse.jgit.revwalk.RevTree;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.treewalk.CanonicalTreeParser;
import org.eclipse.jgit.treewalk.TreeWalk;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GitService {
    private final GitRepositoryRepository gitRepoRepository;
    private final MergeRequestRepository mergeRequestRepository;
    private final ProjectReleaseRepository projectReleaseRepository;
    private final Path repoRoot;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public GitService(
        GitRepositoryRepository gitRepoRepository,
        MergeRequestRepository mergeRequestRepository,
        ProjectReleaseRepository projectReleaseRepository,
        @Value("${app.git.root:./data/repos}") String repoRoot
    ) {
        this.gitRepoRepository = gitRepoRepository;
        this.mergeRequestRepository = mergeRequestRepository;
        this.projectReleaseRepository = projectReleaseRepository;
        this.repoRoot = Path.of(repoRoot);
    }

    @Transactional
    public GitRepositoryEntity ensureRepository(ProjectEntity project) {
        return gitRepoRepository.findByProjectId(project.getId()).orElseGet(() -> createRepository(project));
    }

    @Transactional
    public GitRepositoryEntity createRepository(ProjectEntity project) {
        try {
            Files.createDirectories(repoRoot);
            String slug = project.getName().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
            Path bareDir = repoRoot.resolve(slug + ".git");
            if (!Files.exists(bareDir)) {
                Git.init().setBare(true).setInitialBranch("main").setDirectory(bareDir.toFile()).call().close();
                seedRepository(bareDir, slug);
            }
            GitRepositoryEntity entity = new GitRepositoryEntity();
            entity.setProject(project);
            entity.setSlug(slug);
            entity.setBarePath(bareDir.toString());
            return gitRepoRepository.save(entity);
        } catch (Exception ex) {
            throw new ApiException("初始化仓库失败: " + ex.getMessage());
        }
    }

    private void seedRepository(Path bareDir, String slug) throws Exception {
        Path workDir = Files.createTempDirectory("educollab-git-");
        try (Git git = Git.cloneRepository().setURI(bareDir.toUri().toString()).setDirectory(workDir.toFile()).call()) {
            try {
                git.checkout().setCreateBranch(true).setName("main").call();
            } catch (Exception ignored) {
                try {
                    git.checkout().setName("main").call();
                } catch (Exception ignored2) {
                }
            }
            Files.writeString(workDir.resolve("README.md"), "# " + slug + "\n\nEduCollab code project.\n");
            git.add().addFilepattern("README.md").call();
            PersonIdent author = new PersonIdent("EduCollab", "noreply@educollab.local");
            git.commit().setMessage("feat: initialize project repository").setAuthor(author).call();
            git.push().setPushAll().call();
        } finally {
            Files.walk(workDir).sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                }
            });
        }
    }

    public void createBranch(Long projectId, String name) {
        GitRepositoryEntity repo = requireRepository(projectId);
        Path temp = null;
        try {
            temp = Files.createTempDirectory("educollab-branch-");
            try (Git git = Git.cloneRepository().setURI(Path.of(repo.getBarePath()).toUri().toString()).setDirectory(temp.toFile()).call()) {
                git.checkout().setCreateBranch(true).setName(name).call();
                git.push().setPushAll().call();
            }
        } catch (Exception ex) {
            throw new ApiException("创建分支失败: " + ex.getMessage());
        } finally {
            cleanup(temp);
        }
    }

    public List<String> listBranches(Long projectId) {
        GitRepositoryEntity repo = findRepository(projectId);
        if (repo == null) return List.of();
        try (var repository = new FileRepository(repo.getBarePath())) {
            try (Git git = new Git(repository)) {
                return git.branchList()
                    .setListMode(ListBranchCommand.ListMode.ALL)
                    .call()
                    .stream()
                    .map(ref -> ref.getName().replace("refs/heads/", "").replace("refs/remotes/origin/", ""))
                    .distinct()
                    .toList();
            }
        } catch (Exception ex) {
            throw new ApiException("读取分支失败: " + ex.getMessage());
        }
    }

    public List<CommitView> listCommits(Long projectId) {
        GitRepositoryEntity repo = findRepository(projectId);
        if (repo == null) return List.of();
        try (var repository = new FileRepository(repo.getBarePath())) {
            try (Git git = new Git(repository)) {
                var head = repository.resolve(Constants.HEAD);
                if (head == null) return List.of();
                Iterable<RevCommit> log = git.log().add(head).call();
                List<CommitView> items = new ArrayList<>();
                for (RevCommit commit : log) {
                    items.add(
                        new CommitView(
                            commit.getId().abbreviate(7).name(),
                            commit.getShortMessage(),
                            commit.getAuthorIdent().getName(),
                            formatter.format(commit.getAuthorIdent().getWhenAsInstant().atZone(ZoneId.systemDefault())),
                            "main"
                        )
                    );
                    if (items.size() >= 50) break;
                }
                return items;
            }
        } catch (Exception ex) {
            throw new ApiException("读取提交失败: " + ex.getMessage());
        }
    }

    public List<CommitStatsView> listNewCommits(Long projectId, String oldRevision, String newRevision, String branch) {
        GitRepositoryEntity repo = findRepository(projectId);
        if (repo == null) return List.of();
        try (var repository = new FileRepository(repo.getBarePath()); var revWalk = new RevWalk(repository)) {
            ObjectId newId = newRevision == null ? null : repository.resolve(newRevision);
            if (newId == null) return List.of();
            RevCommit newCommit = revWalk.parseCommit(newId);
            List<RevCommit> commits = new ArrayList<>();
            if (oldRevision != null && !oldRevision.isBlank() && !ObjectId.zeroId().name().equals(oldRevision)) {
                ObjectId oldId = repository.resolve(oldRevision);
                if (oldId != null) {
                    RevCommit oldCommit = revWalk.parseCommit(oldId);
                    revWalk.reset();
                    revWalk.markStart(newCommit);
                    revWalk.markUninteresting(oldCommit);
                    revWalk.sort(RevSort.TOPO);
                    revWalk.sort(RevSort.REVERSE, true);
                    for (RevCommit commit : revWalk) {
                        commits.add(revWalk.parseCommit(commit.getId()));
                    }
                }
            } else {
                commits.add(newCommit);
            }
            List<CommitStatsView> items = new ArrayList<>();
            for (RevCommit commit : commits) {
                DiffStat diffStat = diffStat(repository, commit);
                items.add(new CommitStatsView(
                    commit.getId().name(),
                    commit.getShortMessage(),
                    commit.getAuthorIdent().getName(),
                    formatter.format(commit.getAuthorIdent().getWhenAsInstant().atZone(ZoneId.systemDefault())),
                    branch == null || branch.isBlank() ? "main" : branch,
                    diffStat.linesAdded(),
                    diffStat.linesDeleted(),
                    LocalDateTime.ofInstant(commit.getAuthorIdent().getWhenAsInstant(), ZoneId.systemDefault())
                ));
            }
            return items;
        } catch (Exception ex) {
            throw new ApiException("读取提交统计失败: " + ex.getMessage());
        }
    }

    public List<FileNode> listFiles(Long projectId) {
        GitRepositoryEntity repo = findRepository(projectId);
        if (repo == null) return List.of();
        try (var repository = new FileRepository(repo.getBarePath()); var walk = new TreeWalk(repository)) {
            var headTree = repository.resolve(Constants.HEAD + "^{tree}");
            if (headTree == null) return List.of();
            walk.addTree(headTree);
            walk.setRecursive(false);
            List<FileNode> items = new ArrayList<>();
            while (walk.next()) {
                items.add(new FileNode(walk.getPathString(), walk.isSubtree() ? "directory" : "file"));
            }
            return items;
        } catch (Exception ex) {
            throw new ApiException("读取文件树失败: " + ex.getMessage());
        }
    }

    public List<TreeEntry> listTree(Long projectId, String path) {
        GitRepositoryEntity repo = findRepository(projectId);
        if (repo == null) return List.of();
        String base = path == null ? "" : path.trim();
        if (base.startsWith("/")) base = base.substring(1);
        if (base.endsWith("/")) base = base.substring(0, base.length() - 1);

        try (var repository = new FileRepository(repo.getBarePath()); var revWalk = new RevWalk(repository)) {
            var headId = repository.resolve(Constants.HEAD);
            if (headId == null) return List.of();
            RevCommit commit = revWalk.parseCommit(headId);
            RevTree rootTree = commit.getTree();

            List<TreeEntry> items = new ArrayList<>();

            if (base.isEmpty()) {
                try (TreeWalk walk = new TreeWalk(repository)) {
                    walk.addTree(rootTree);
                    walk.setRecursive(false);
                    while (walk.next()) {
                        items.add(toEntry(repository, "", walk));
                    }
                }
                return items;
            }

            try (TreeWalk tw = TreeWalk.forPath(repository, base, rootTree)) {
                if (tw == null) return List.of();
                if (!tw.isSubtree()) throw new ApiException("不是目录: " + base);
                var subtreeId = tw.getObjectId(0);
                try (TreeWalk walk = new TreeWalk(repository)) {
                    walk.addTree(subtreeId);
                    walk.setRecursive(false);
                    while (walk.next()) {
                        items.add(toEntry(repository, base, walk));
                    }
                }
                return items;
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException("读取文件树失败: " + ex.getMessage());
        }
    }

    public BlobView readBlob(Long projectId, String path) {
        GitRepositoryEntity repo = requireRepository(projectId);
        String p = path == null ? "" : path.trim();
        if (p.startsWith("/")) p = p.substring(1);
        if (p.isBlank()) throw new ApiException("路径不能为空");

        try (var repository = new FileRepository(repo.getBarePath()); var revWalk = new RevWalk(repository)) {
            var headId = repository.resolve(Constants.HEAD);
            if (headId == null) throw new ApiException("仓库为空");
            RevCommit commit = revWalk.parseCommit(headId);
            RevTree tree = commit.getTree();

            try (TreeWalk tw = TreeWalk.forPath(repository, p, tree)) {
                if (tw == null) throw new ApiException("文件不存在: " + p);
                if (tw.isSubtree()) throw new ApiException("不是文件: " + p);
                var loader = repository.open(tw.getObjectId(0));
                long size = loader.getSize();
                long cap = 1024L * 1024L;
                byte[] bytes = loader.getBytes((int) Math.min(size, cap));
                boolean binary = isBinary(bytes);
                if (binary) {
                    return new BlobView(p, true, "base64", Base64.getEncoder().encodeToString(bytes), size);
                }
                return new BlobView(p, false, "utf-8", new String(bytes, StandardCharsets.UTF_8), size);
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException("读取文件失败: " + ex.getMessage());
        }
    }

    private GitRepositoryEntity findRepository(Long projectId) {
        return gitRepoRepository.findByProjectId(projectId).orElse(null);
    }

    private GitRepositoryEntity requireRepository(Long projectId) {
        GitRepositoryEntity repo = findRepository(projectId);
        if (repo == null) {
            throw new ApiException("仓库尚未初始化");
        }
        return repo;
    }

    private TreeEntry toEntry(org.eclipse.jgit.lib.Repository repository, String base, TreeWalk walk) throws IOException {
        boolean dir = walk.isSubtree();
        long size = dir ? 0L : repository.open(walk.getObjectId(0)).getSize();
        String rel = walk.getPathString();
        String fullPath = base == null || base.isBlank() ? rel : (base + "/" + rel);
        return new TreeEntry(fullPath, walk.getNameString(), dir ? "directory" : "file", size);
    }

    private boolean isBinary(byte[] bytes) {
        int max = Math.min(bytes.length, 4096);
        for (int i = 0; i < max; i++) {
            if (bytes[i] == 0) return true;
        }
        return false;
    }

    private DiffStat diffStat(org.eclipse.jgit.lib.Repository repository, RevCommit commit) throws IOException {
        try (DiffFormatter formatter = new DiffFormatter(OutputStream.nullOutputStream());
             ObjectReaderHolder reader = new ObjectReaderHolder(repository.newObjectReader());
             RevWalk walk = new RevWalk(repository)) {
            formatter.setRepository(repository);
            formatter.setDetectRenames(true);
            var newTreeIter = new CanonicalTreeParser();
            newTreeIter.reset(reader.reader(), commit.getTree());
            List<DiffEntry> diffs;
            if (commit.getParentCount() > 0) {
                RevCommit parent = walk.parseCommit(commit.getParent(0).getId());
                var oldTreeIter = new CanonicalTreeParser();
                oldTreeIter.reset(reader.reader(), parent.getTree());
                diffs = formatter.scan(oldTreeIter, newTreeIter);
            } else {
                diffs = formatter.scan(new org.eclipse.jgit.treewalk.EmptyTreeIterator(), newTreeIter);
            }
            int added = 0;
            int deleted = 0;
            for (DiffEntry diff : diffs) {
                for (Edit edit : formatter.toFileHeader(diff).toEditList()) {
                    added += edit.getEndB() - edit.getBeginB();
                    deleted += edit.getEndA() - edit.getBeginA();
                }
            }
            return new DiffStat(added, deleted);
        }
    }

    @Transactional
    public MergeRequestEntity createMergeRequest(ProjectEntity project, String title, String source, String target) {
        MergeRequestEntity mr = new MergeRequestEntity();
        mr.setProject(project);
        mr.setTitle(title);
        mr.setSourceBranch(source);
        mr.setTargetBranch(target);
        mr.setStatus(MergeRequestStatus.OPEN);
        return mergeRequestRepository.save(mr);
    }

    @Transactional
    public MergeRequestEntity merge(Long mergeRequestId) {
        MergeRequestEntity mr = mergeRequestRepository.findById(mergeRequestId).orElseThrow(() -> new ApiException("MR 不存在"));
        mr.setStatus(MergeRequestStatus.MERGED);
        return mergeRequestRepository.save(mr);
    }

    public List<MergeRequestEntity> listMergeRequests(Long projectId) {
        return mergeRequestRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    @Transactional
    public ProjectReleaseEntity createRelease(ProjectEntity project, String version, String title, String description) {
        ProjectReleaseEntity release = new ProjectReleaseEntity();
        release.setProject(project);
        release.setVersion(version);
        release.setTitle(title);
        release.setDescription(description);
        return projectReleaseRepository.save(release);
    }

    public List<ProjectReleaseEntity> listReleases(Long projectId) {
        return projectReleaseRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
    }

    private void cleanup(Path temp) {
        if (temp == null) return;
        try {
            Files.walk(temp).sorted(Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                }
            });
        } catch (IOException ignored) {
        }
    }

    public record CommitView(String hash, String message, String authorName, String createdAt, String branch) {}

    public record CommitStatsView(
        String hash,
        String message,
        String authorName,
        String createdAt,
        String branch,
        int linesAdded,
        int linesDeleted,
        LocalDateTime occurredAt) {}

    public record FileNode(String path, String type) {}

    public record TreeEntry(String path, String name, String type, long sizeBytes) {}

    public record BlobView(String path, boolean binary, String encoding, String content, long sizeBytes) {}

    private record DiffStat(int linesAdded, int linesDeleted) {}

    private record ObjectReaderHolder(org.eclipse.jgit.lib.ObjectReader reader) implements AutoCloseable {
        @Override
        public void close() {
            reader.close();
        }
    }
}
