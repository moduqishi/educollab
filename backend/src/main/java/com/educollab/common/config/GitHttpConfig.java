package com.educollab.common.config;

import com.educollab.common.security.JwtPrincipal;
import com.educollab.common.util.SecurityUtils;
import com.educollab.repo.GitRepositoryRepository;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.service.GitService;
import com.educollab.service.ProjectActivityService;
import com.educollab.service.WorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.File;
import java.util.List;
import org.eclipse.jgit.errors.RepositoryNotFoundException;
import org.eclipse.jgit.http.server.GitServlet;
import org.eclipse.jgit.internal.storage.file.FileRepository;
import org.eclipse.jgit.transport.ReceiveCommand;
import org.eclipse.jgit.transport.ReceivePack;
import org.eclipse.jgit.transport.UploadPack;
import org.eclipse.jgit.transport.resolver.ServiceNotAuthorizedException;
import org.eclipse.jgit.transport.resolver.ServiceNotEnabledException;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GitHttpConfig {
  private static final String ATTR_PROJECT_ID = "educollab.git.projectId";

  @Bean
  public ServletRegistrationBean<GitServlet> gitServlet(
      GitRepositoryRepository gitRepositoryRepository,
      WorkspaceService workspaceService,
      ProjectMemberRepository projectMemberRepository,
      GitService gitService,
      ProjectActivityService projectActivityService
  ) {
    GitServlet servlet = new GitServlet();

    servlet.setRepositoryResolver((HttpServletRequest req, String name) -> {
      String repoName = name == null ? "" : name.trim();
      if (repoName.startsWith("/")) repoName = repoName.substring(1);
      if (repoName.endsWith(".git")) repoName = repoName.substring(0, repoName.length() - 4);
      if (repoName.isBlank()) throw new RepositoryNotFoundException(name);

      var entity = gitRepositoryRepository.findBySlug(repoName).orElseThrow(() -> new RepositoryNotFoundException(name));
      req.setAttribute(ATTR_PROJECT_ID, entity.getProject().getId());
      File dir = new File(entity.getBarePath());
      try {
        return new FileRepository(dir);
      } catch (java.io.IOException ex) {
        throw new RepositoryNotFoundException(name, ex);
      }
    });

    servlet.setUploadPackFactory((req, repository) -> {
      JwtPrincipal principal = SecurityUtils.principal();
      Long projectId = (Long) req.getAttribute(ATTR_PROJECT_ID);
      if (projectId == null) throw new ServiceNotEnabledException();
      // read permission: any visible project member / teacher
      workspaceService.requireVisible(projectId, principal);
      return new UploadPack(repository);
    });

    servlet.setReceivePackFactory((req, repository) -> {
      JwtPrincipal principal = SecurityUtils.principal();
      Long projectId = (Long) req.getAttribute(ATTR_PROJECT_ID);
      if (projectId == null) throw new ServiceNotEnabledException();

      // write permission: student project members only (teacher is read-only)
      workspaceService.requireVisible(projectId, principal);
      if (principal.role().name().equals("TEACHER")) throw new ServiceNotAuthorizedException();
      boolean member = projectMemberRepository.findByProjectIdAndUserId(projectId, principal.userId()).isPresent();
      if (!member) throw new ServiceNotAuthorizedException();

      ReceivePack rp = new ReceivePack(repository);
      rp.setAllowCreates(true);
      rp.setPostReceiveHook((receivePack, commands) -> {
        List<ProjectActivityService.GitCommitActivity> commitActivities =
            commands.stream()
                .filter(command -> command.getResult() == ReceiveCommand.Result.OK)
                .filter(command -> command.getType() != ReceiveCommand.Type.DELETE)
                .flatMap(command -> gitService.listNewCommits(projectId, command.getOldId().name(), command.getNewId().name(), shortBranch(command.getRefName())).stream())
                .map(commit -> new ProjectActivityService.GitCommitActivity(
                    commit.hash(),
                    commit.message(),
                    commit.branch(),
                    commit.authorName(),
                    commit.linesAdded(),
                    commit.linesDeleted(),
                    commit.occurredAt()))
                .toList();
        projectActivityService.recordGitPushCommits(projectId, principal.userId(), commitActivities);
      });
      return rp;
    });

    ServletRegistrationBean<GitServlet> reg = new ServletRegistrationBean<>(servlet, "/git/*");
    reg.setName("gitServlet");
    reg.setLoadOnStartup(1);
    return reg;
  }

  private String shortBranch(String refName) {
    if (refName == null) {
      return "main";
    }
    return refName.replace("refs/heads/", "").replace("refs/remotes/origin/", "");
  }
}
