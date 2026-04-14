package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMemberEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.repo.ProjectRepository;
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

  public ProjectAccessService(ProjectRepository projectRepository, ProjectMemberRepository projectMemberRepository) {
    this.projectRepository = projectRepository;
    this.projectMemberRepository = projectMemberRepository;
  }

  public ProjectEntity requireVisible(Long projectId, JwtPrincipal principal) {
    return visibleProjects(principal).stream()
        .filter(project -> project.getId().equals(projectId))
        .findFirst()
        .orElseThrow(() -> new ApiException("无权访问该项目"));
  }

  public List<ProjectEntity> visibleProjects(JwtPrincipal principal) {
    if (principal.role() == UserRole.TEACHER) {
      return projectRepository.findByCourseTeacherId(principal.userId());
    }
    return projectMemberRepository.findByUserId(principal.userId()).stream()
        .map(ProjectMemberEntity::getProject)
        .distinct()
        .sorted(Comparator.comparing(ProjectEntity::getUpdatedAt).reversed())
        .toList();
  }
}

