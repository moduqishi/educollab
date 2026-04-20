package com.educollab.service.workspace;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.ProjectMemberCandidate;
import com.educollab.model.ClassMemberEntity;
import com.educollab.model.NotificationSourceType;
import com.educollab.model.NotificationType;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMemberEntity;
import com.educollab.model.TeamMemberEntity;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.ClassMemberRepository;
import com.educollab.repo.ProjectMemberRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.TeamMemberRepository;
import com.educollab.service.AuthService;
import com.educollab.service.NotificationTarget;
import com.educollab.service.NotificationService;
import com.educollab.service.ProjectAccessService;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.Objects;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class WorkspaceProjectMembershipService {
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ProjectAccessService projectAccessService;
    private final AuthService authService;
    private final NotificationService notificationService;
    private final WorkspaceRecordMapper recordMapper;

    public WorkspaceProjectMembershipService(
        ProjectRepository projectRepository,
        ProjectMemberRepository projectMemberRepository,
        TeamMemberRepository teamMemberRepository,
        ClassMemberRepository classMemberRepository,
        ProjectAccessService projectAccessService,
        AuthService authService,
        NotificationService notificationService,
        WorkspaceRecordMapper recordMapper
    ) {
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.classMemberRepository = classMemberRepository;
        this.projectAccessService = projectAccessService;
        this.authService = authService;
        this.notificationService = notificationService;
        this.recordMapper = recordMapper;
    }

    public boolean canManageProjectMembers(Long projectId, JwtPrincipal principal) {
        if (principal.role() == UserRole.TEACHER) {
            return true;
        }
        return projectMemberRepository.findByProjectIdAndUserId(projectId, principal.userId())
            .map(ProjectMemberEntity::isOwnerFlag)
            .orElse(false);
    }

    public java.util.List<ProjectMemberCandidate> projectMemberCandidates(Long projectId, JwtPrincipal principal) {
        ProjectEntity project = projectAccessService.requireVisible(projectId, principal);
        Set<Long> existingMemberIds = projectMemberRepository.findByProjectId(projectId).stream()
            .map(ProjectMemberEntity::getUser)
            .filter(Objects::nonNull)
            .map(UserEntity::getId)
            .collect(java.util.stream.Collectors.toSet());

        Set<UserEntity> candidateUsers = new LinkedHashSet<>();
        classMemberCandidates(project).stream()
            .map(ClassMemberEntity::getUser)
            .filter(Objects::nonNull)
            .forEach(candidateUsers::add);

        teamMemberCandidates(project).stream()
            .map(TeamMemberEntity::getUser)
            .filter(Objects::nonNull)
            .forEach(candidateUsers::add);

        return candidateUsers.stream()
            .filter(user -> !existingMemberIds.contains(user.getId()))
            .sorted(Comparator.comparing(user -> Objects.toString(user.getName(), ""), String.CASE_INSENSITIVE_ORDER))
            .map(user -> new ProjectMemberCandidate(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                recordMapper.userAvatar(user),
                true
            ))
            .toList();
    }

    @Transactional
    public void addProjectMember(Long projectId, Long userId, JwtPrincipal principal) {
        ProjectEntity project = projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
        projectAccessService.requireVisible(projectId, principal);
        if (!canManageProjectMembers(projectId, principal)) {
            throw new ApiException("无权管理项目成员");
        }
        if (projectMemberRepository.findByProjectIdAndUserId(projectId, userId).isPresent()) {
            return;
        }

        UserEntity user = authService.getUser(userId);
        ProjectMemberEntity projectMember = new ProjectMemberEntity();
        projectMember.setProject(project);
        projectMember.setUser(user);
        projectMember.setOwnerFlag(false);
        projectMemberRepository.save(projectMember);

        if (project.getTeam() != null && teamMemberRepository.findByTeamIdAndUserId(project.getTeam().getId(), userId).isEmpty()) {
            TeamMemberEntity teamMember = new TeamMemberEntity();
            teamMember.setTeam(project.getTeam());
            teamMember.setUser(user);
            teamMemberRepository.save(teamMember);
        }

        notificationService.create(
            user,
            "已加入项目",
            "你已被加入项目：" + project.getName(),
            NotificationType.SYSTEM,
            NotificationTarget.of(
                NotificationSourceType.PROJECT,
                project.getId(),
                "/app/projects/" + project.getId() + "/overview",
                "项目概览"));
    }

    @Transactional
    public void removeProjectMember(Long projectId, Long userId, JwtPrincipal principal) {
        projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
        projectAccessService.requireVisible(projectId, principal);
        if (!canManageProjectMembers(projectId, principal)) {
            throw new ApiException("无权管理项目成员");
        }
        if (principal.userId().equals(userId)) {
            throw new ApiException("不能移除自己");
        }

        ProjectMemberEntity target = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
            .orElseThrow(() -> new ApiException("成员不存在"));
        if (target.isOwnerFlag()) {
            long owners = projectMemberRepository.findByProjectId(projectId).stream().filter(ProjectMemberEntity::isOwnerFlag).count();
            if (owners <= 1) {
                throw new ApiException("不能移除唯一负责人");
            }
        }
        projectMemberRepository.delete(target);
    }

    private java.util.List<ClassMemberEntity> classMemberCandidates(ProjectEntity project) {
        Long courseId = project.getCourse() != null
            ? project.getCourse().getId()
            : project.getTeam() != null && project.getTeam().getCourse() != null
                ? project.getTeam().getCourse().getId()
                : null;
        return courseId == null ? java.util.List.of() : classMemberRepository.findByCourseId(courseId);
    }

    private java.util.List<TeamMemberEntity> teamMemberCandidates(ProjectEntity project) {
        Long teamId = project.getTeam() != null ? project.getTeam().getId() : null;
        return teamId == null ? java.util.List.of() : teamMemberRepository.findByTeamId(teamId);
    }
}
