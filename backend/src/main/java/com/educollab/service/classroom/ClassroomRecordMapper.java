package com.educollab.service.classroom;

import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.AssignmentRecord;
import com.educollab.dto.WorkspaceDtos.ClassInvitationRecord;
import com.educollab.dto.WorkspaceDtos.ClassMemberRecord;
import com.educollab.dto.WorkspaceDtos.ClassRecord;
import com.educollab.dto.WorkspaceDtos.GroupTaskRecord;
import com.educollab.dto.WorkspaceDtos.GroupTaskSubTaskRecord;
import com.educollab.dto.WorkspaceDtos.GroupTaskTeamDetail;
import com.educollab.dto.WorkspaceDtos.GroupTaskTeamMember;
import com.educollab.dto.WorkspaceDtos.GroupTaskTeamRecord;
import com.educollab.model.AssignmentEntity;
import com.educollab.model.ClassInvitationEntity;
import com.educollab.model.ClassInvitationStatus;
import com.educollab.model.ClassMemberEntity;
import com.educollab.model.CourseEntity;
import com.educollab.model.GroupTaskEntity;
import com.educollab.model.GroupTaskTeamTaskEntity;
import com.educollab.model.ProjectEntity;
import com.educollab.model.TeamEntity;
import com.educollab.model.TeamMemberEntity;
import com.educollab.repo.ClassInvitationRepository;
import com.educollab.repo.ClassMemberRepository;
import com.educollab.repo.GroupTaskTeamTaskRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.TeamMemberRepository;
import com.educollab.repo.TeamRepository;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ClassroomRecordMapper {
    private final ClassMemberRepository classMemberRepository;
    private final ClassInvitationRepository classInvitationRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final GroupTaskTeamTaskRepository groupTaskTeamTaskRepository;
    private final ProjectRepository projectRepository;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public ClassroomRecordMapper(
        ClassMemberRepository classMemberRepository,
        ClassInvitationRepository classInvitationRepository,
        TeamRepository teamRepository,
        TeamMemberRepository teamMemberRepository,
        GroupTaskTeamTaskRepository groupTaskTeamTaskRepository,
        ProjectRepository projectRepository
    ) {
        this.classMemberRepository = classMemberRepository;
        this.classInvitationRepository = classInvitationRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.groupTaskTeamTaskRepository = groupTaskTeamTaskRepository;
        this.projectRepository = projectRepository;
    }

    public ClassRecord toClassRecord(CourseEntity course) {
        return new ClassRecord(
            course.getId(),
            course.getName(),
            course.getClassCode(),
            course.getTeacher() != null ? course.getTeacher().getName() : null,
            classMemberRepository.findByCourseId(course.getId()).size(),
            (int) classInvitationRepository.findByCourseIdOrderByCreatedAtDesc(course.getId()).stream()
                .filter(inv -> inv.getStatus() == ClassInvitationStatus.PENDING)
                .count()
        );
    }

    public ClassMemberRecord toClassMemberRecord(ClassMemberEntity entity) {
        return new ClassMemberRecord(
            entity.getId(),
            entity.getUser().getId(),
            entity.getUser().getName(),
            entity.getUser().getEmail(),
            entity.getUser().getRole().name(),
            entity.getRole().name(),
            entity.getJoinedVia(),
            entity.getUser().getAvatar()
        );
    }

    public ClassInvitationRecord toClassInvitationRecord(ClassInvitationEntity entity) {
        return new ClassInvitationRecord(
            entity.getId(),
            entity.getCourse().getId(),
            entity.getCourse().getName(),
            entity.getInvitedUser().getId(),
            entity.getInvitedUser().getName(),
            entity.getInvitedUser().getEmail(),
            entity.getInvitedByUser().getName(),
            entity.getStatus().name(),
            formatter.format(entity.getCreatedAt())
        );
    }

    public AssignmentRecord toAssignmentRecord(AssignmentEntity entity) {
        return new AssignmentRecord(
            entity.getId(),
            entity.getCourse() != null ? entity.getCourse().getId() : null,
            entity.getCourse() != null ? entity.getCourse().getName() : null,
            entity.getProject() != null ? entity.getProject().getId() : null,
            entity.getProject() != null ? entity.getProject().getName() : null,
            entity.getTitle(),
            entity.getSummary(),
            entity.getSubmissionUrl(),
            entity.getDueDate() != null ? entity.getDueDate().toString() : null,
            formatter.format(entity.getCreatedAt()),
            null,
            null,
            null,
            null,
            null,
            null,
            null
        );
    }

    public GroupTaskRecord toGroupTaskRecord(GroupTaskEntity entity, JwtPrincipal principal) {
        return new GroupTaskRecord(
            entity.getId(),
            entity.getCourse().getId(),
            entity.getCourse().getName(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getMinMembers(),
            entity.getMaxMembers(),
            entity.getDueDate() != null ? entity.getDueDate().toString() : null,
            formatter.format(entity.getCreatedAt()),
            teamRepository.findByGroupTaskIdOrderByCreatedAtAsc(entity.getId()).stream().map(team -> toGroupTaskTeamRecord(team, principal)).toList()
        );
    }

    public GroupTaskTeamRecord toGroupTaskTeamRecord(TeamEntity team, JwtPrincipal principal) {
        int memberCount = teamMemberRepository.findByTeamId(team.getId()).size();
        boolean isMember = teamMemberRepository.findByTeamIdAndUserId(team.getId(), principal.userId()).isPresent();
        boolean isLeader = team.getLeader() != null && team.getLeader().getId().equals(principal.userId());
        Integer maxMembers = team.getGroupTask() != null ? team.getGroupTask().getMaxMembers() : null;
        return new GroupTaskTeamRecord(
            team.getId(),
            team.getGroupTask() != null ? team.getGroupTask().getId() : null,
            team.getName(),
            team.getLeader() != null ? team.getLeader().getId() : null,
            team.getLeader() != null ? team.getLeader().getName() : null,
            memberCount,
            team.getStatus().name(),
            !isMember && (maxMembers == null || memberCount < maxMembers),
            isMember && !isLeader,
            isLeader && memberCount > 1,
            projectRepository.findByTeamId(team.getId()).map(ProjectEntity::getId).orElse(null)
        );
    }

    public GroupTaskTeamDetail toGroupTaskTeamDetail(TeamEntity team, JwtPrincipal principal, boolean teacherView) {
        List<GroupTaskTeamMember> members = teamMemberRepository.findByTeamId(team.getId()).stream()
            .map(member -> new GroupTaskTeamMember(
                member.getUser().getId(),
                member.getUser().getName(),
                member.getUser().getEmail(),
                member.getUser().getAvatar(),
                team.getLeader() != null && team.getLeader().getId().equals(member.getUser().getId())
            ))
            .toList();
        boolean currentUserLeader = team.getLeader() != null && team.getLeader().getId().equals(principal.userId());
        boolean currentUserMember = teamMemberRepository.findByTeamIdAndUserId(team.getId(), principal.userId()).isPresent();
        return new GroupTaskTeamDetail(
            team.getId(),
            team.getCourse() != null ? team.getCourse().getId() : null,
            team.getCourse() != null ? team.getCourse().getName() : null,
            team.getGroupTask() != null ? team.getGroupTask().getId() : null,
            team.getGroupTask() != null ? team.getGroupTask().getTitle() : null,
            team.getName(),
            team.getLeader() != null ? team.getLeader().getId() : null,
            team.getLeader() != null ? team.getLeader().getName() : null,
            team.getStatus().name(),
            projectRepository.findByTeamId(team.getId()).map(ProjectEntity::getId).orElse(null),
            currentUserLeader,
            currentUserMember,
            teacherView,
            members,
            groupTaskTeamTaskRepository.findByTeamIdOrderByCreatedAtDesc(team.getId()).stream().map(this::toGroupTaskSubTaskRecord).toList()
        );
    }

    public GroupTaskSubTaskRecord toGroupTaskSubTaskRecord(GroupTaskTeamTaskEntity entity) {
        return new GroupTaskSubTaskRecord(
            entity.getId(),
            entity.getTeam().getId(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getStatus().name(),
            entity.getAssignee() != null ? entity.getAssignee().getId() : null,
            entity.getAssignee() != null ? entity.getAssignee().getName() : null,
            entity.getDueDate() != null ? entity.getDueDate().toString() : null,
            formatter.format(entity.getCreatedAt())
        );
    }
}
