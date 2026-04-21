package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMemberEntity;
import com.educollab.model.TeamMemberEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.TeamMemberRepository;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Access control helper for project visibility.
 *
 * <p>Keep this service free of dependencies that could create cycles (e.g. file storage),
 * since it's used by multiple modules (workspace, files, git http, etc.).</p>
 */
@Service
@Transactional(readOnly = true)
public class ProjectAccessService {
  private final ProjectRepository projectRepository;
  private final ProjectMemberRepository projectMemberRepository;
  private final TeamMemberRepository teamMemberRepository;

  public ProjectAccessService(ProjectRepository projectRepository, ProjectMemberRepository projectMemberRepository, TeamMemberRepository teamMemberRepository) {
    this.projectRepository = projectRepository;
    this.projectMemberRepository = projectMemberRepository;
    this.teamMemberRepository = teamMemberRepository;
  }

  public ProjectEntity requireVisible(Long projectId, JwtPrincipal principal) {
    return visibleProjects(principal).stream()
        .filter(project -> project.getId().equals(projectId))
        .findFirst()
        .orElseThrow(() -> new ApiException("无权访问该项目"));
  }

  public ProjectEntity requireEditable(Long projectId, JwtPrincipal principal) {
    ProjectEntity project = requireVisible(projectId, principal);
    if (!canEdit(project, principal)) {
      throw new ApiException("你只能查看该项目，不能修改其他小组的项目内容");
    }
    return project;
  }

  public boolean canEdit(Long projectId, JwtPrincipal principal) {
    return projectRepository.findById(projectId)
        .map(project -> canEdit(project, principal))
        .orElse(false);
  }

  public List<ProjectEntity> visibleProjects(JwtPrincipal principal) {
    if (principal.role() == UserRole.ADMIN) {
      return projectRepository.findAll().stream()
          .sorted(Comparator.comparing(ProjectEntity::getUpdatedAt).reversed())
          .toList();
    }
    if (principal.role() == UserRole.TEACHER) {
      return projectRepository.findByCourseTeacherId(principal.userId());
    }

    return java.util.stream.Stream.concat(
            projectMemberRepository.findByUserId(principal.userId()).stream().map(ProjectMemberEntity::getProject),
            teamMemberRepository.findByUserId(principal.userId()).stream()
                .map(TeamMemberEntity::getTeam)
                .filter(java.util.Objects::nonNull)
                .map(team -> projectRepository.findByTeamId(team.getId()).orElse(null)))
        .filter(java.util.Objects::nonNull)
        .distinct()
        .sorted(Comparator.comparing(ProjectEntity::getUpdatedAt).reversed())
        .toList();
  }

  private boolean canEdit(ProjectEntity project, JwtPrincipal principal) {
    if (principal.role() == UserRole.ADMIN) {
      return true;
    }
    if (principal.role() == UserRole.TEACHER) {
      return true;
    }
    if (projectMemberRepository.findByProjectIdAndUserId(project.getId(), principal.userId()).isPresent()) {
      return true;
    }
    return project.getTeam() != null
        && teamMemberRepository.findByTeamIdAndUserId(project.getTeam().getId(), principal.userId()).isPresent();
  }
}
