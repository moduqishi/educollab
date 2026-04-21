package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.service.GitAccessTokenService;
import com.educollab.service.GitService;
import com.educollab.service.WorkspaceService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/git")
public class GitController {
    private final GitService gitService;
    private final WorkspaceService workspaceService;
    private final GitAccessTokenService gitAccessTokenService;
    public GitController(GitService gitService, WorkspaceService workspaceService, GitAccessTokenService gitAccessTokenService) {
        this.gitService = gitService;
        this.workspaceService = workspaceService;
        this.gitAccessTokenService = gitAccessTokenService;
    }
    @PostMapping("/repositories/init/{projectId}") public void init(@PathVariable Long projectId) { gitService.ensureRepository(workspaceService.requireProjectEditable(projectId, SecurityUtils.principal())); }
    @GetMapping("/projects/{projectId}/branches") public java.util.List<String> branches(@PathVariable Long projectId) { workspaceService.requireVisible(projectId, SecurityUtils.principal()); return gitService.listBranches(projectId); }
    @PostMapping("/branches") public void createBranch(@RequestBody BranchCreateRequest request) { workspaceService.requireProjectEditable(request.projectId(), SecurityUtils.principal()); gitService.createBranch(request.projectId(), request.name()); }
    @GetMapping("/projects/{projectId}/commits")
    public java.util.List<CommitRecord> commits(@PathVariable Long projectId, @RequestParam(value = "ref", required = false) String ref) {
        workspaceService.requireVisible(projectId, SecurityUtils.principal());
        return gitService.listCommits(projectId, ref)
            .stream()
            .map(commit -> new CommitRecord(commit.hash(), commit.message(), commit.authorName(), commit.createdAt(), commit.branch()))
            .toList();
    }
    @GetMapping("/projects/{projectId}/files") public java.util.List<GitService.FileNode> files(@PathVariable Long projectId) { workspaceService.requireVisible(projectId, SecurityUtils.principal()); return gitService.listFiles(projectId); }
    @GetMapping("/projects/{projectId}/tree") public java.util.List<GitService.TreeEntry> tree(@PathVariable Long projectId, @RequestParam(value = "ref", required = false) String ref, @RequestParam(value = "path", required = false) String path) { workspaceService.requireVisible(projectId, SecurityUtils.principal()); return gitService.listTree(projectId, ref, path); }
    @GetMapping("/projects/{projectId}/blob") public GitService.BlobView blob(@PathVariable Long projectId, @RequestParam(value = "ref", required = false) String ref, @RequestParam("path") String path) { workspaceService.requireVisible(projectId, SecurityUtils.principal()); return gitService.readBlob(projectId, ref, path); }
    @PostMapping("/merge-requests") public MergeRequestRecord createMr(@RequestBody MergeRequestSaveRequest request) { var project = workspaceService.requireProjectEditable(request.projectId(), SecurityUtils.principal()); var mr = gitService.createMergeRequest(project, request.title(), request.sourceBranch(), request.targetBranch()); return new MergeRequestRecord(mr.getId(), mr.getTitle(), mr.getSourceBranch(), mr.getTargetBranch(), mr.getStatus().name()); }
    @PostMapping("/merge-requests/{id}/merge") public MergeRequestRecord mergeMr(@PathVariable Long id) { var mr = gitService.merge(id); return new MergeRequestRecord(mr.getId(), mr.getTitle(), mr.getSourceBranch(), mr.getTargetBranch(), mr.getStatus().name()); }
    @PostMapping("/releases") public ReleaseRecord createRelease(@RequestBody ReleaseSaveRequest request) { var project = workspaceService.requireProjectEditable(request.projectId(), SecurityUtils.principal()); var release = gitService.createRelease(project, request.version(), request.title(), request.description()); return new ReleaseRecord(release.getId(), release.getVersion(), release.getTitle(), release.getDescription(), release.getCreatedAt().toString()); }

    @GetMapping("/projects/{projectId}/clone-info")
    public GitCloneInfo cloneInfo(@PathVariable Long projectId) {
        var project = workspaceService.requireVisible(projectId, SecurityUtils.principal());
        var repo = gitService.ensureRepository(project);
        var base = ServletUriComponentsBuilder.fromCurrentContextPath().build().toUriString();
        String httpUrl = base + "/git/" + repo.getSlug() + ".git";
        return new GitCloneInfo(repo.getSlug(), httpUrl, gitService.defaultBranch(projectId));
    }

    @GetMapping("/tokens")
    public java.util.List<GitTokenItem> listTokens() {
        return gitAccessTokenService.list(SecurityUtils.principal());
    }

    @PostMapping("/tokens")
    public GitTokenCreateResponse createToken(@RequestBody GitTokenCreateRequest request) {
        return gitAccessTokenService.create(SecurityUtils.principal(), request.name(), request.expiresInDays());
    }

    @DeleteMapping("/tokens/{id}")
    public void revokeToken(@PathVariable Long id) {
        gitAccessTokenService.revoke(SecurityUtils.principal(), id);
    }
}
