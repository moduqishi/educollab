package com.educollab.service.workspace;

import com.educollab.dto.WorkspaceDtos.DocumentRecord;
import com.educollab.dto.WorkspaceDtos.DiscussionPost;
import com.educollab.dto.WorkspaceDtos.ProjectMember;
import com.educollab.dto.WorkspaceDtos.ProjectMilestoneRecord;
import com.educollab.dto.WorkspaceDtos.ProjectRecord;
import com.educollab.dto.WorkspaceDtos.TaskRecord;
import com.educollab.model.DocumentEntity;
import com.educollab.model.DiscussionPostEntity;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMilestoneEntity;
import com.educollab.model.ProjectMemberEntity;
import com.educollab.model.TaskEntity;
import com.educollab.model.TaskStatus;
import com.educollab.model.UserEntity;
import com.educollab.repo.DiscussionReplyRepository;
import com.educollab.repo.DiscussionTaskLinkRepository;
import com.educollab.repo.ProjectMemberRepository;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class WorkspaceRecordMapper {
    private final ProjectMemberRepository projectMemberRepository;
    private final DiscussionReplyRepository discussionReplyRepository;
    private final DiscussionTaskLinkRepository discussionTaskLinkRepository;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    public WorkspaceRecordMapper(
        ProjectMemberRepository projectMemberRepository,
        DiscussionReplyRepository discussionReplyRepository,
        DiscussionTaskLinkRepository discussionTaskLinkRepository
    ) {
        this.projectMemberRepository = projectMemberRepository;
        this.discussionReplyRepository = discussionReplyRepository;
        this.discussionTaskLinkRepository = discussionTaskLinkRepository;
    }

    public ProjectRecord toProjectRecord(ProjectEntity project) {
        return new ProjectRecord(
            project.getId(),
            project.getName(),
            project.getDescription(),
            project.getType().name(),
            project.getStatus().name(),
            project.getProgress(),
            project.getCourse() != null ? project.getCourse().getId() : null,
            project.getCourse() != null ? project.getCourse().getName() : "",
            project.getTeam() != null ? project.getTeam().getId() : null,
            project.getTeam() != null ? project.getTeam().getName() : "",
            project.getDueDate() != null ? project.getDueDate().toString() : null,
            formatter.format(project.getCreatedAt()),
            projectMemberRepository.findByProjectId(project.getId()).stream().map(item -> userAvatar(item.getUser())).toList()
        );
    }

    public ProjectMilestoneRecord toProjectMilestoneRecord(ProjectMilestoneEntity milestone) {
        return toProjectMilestoneRecord(milestone, null);
    }

    public ProjectMilestoneRecord toProjectMilestoneRecord(
        ProjectMilestoneEntity milestone,
        ProjectProgressService.MilestoneSnapshot snapshot
    ) {
        return new ProjectMilestoneRecord(
            milestone.getId(),
            milestone.getProject().getId(),
            milestone.getTitle(),
            milestone.getDescription(),
            milestone.getSortOrder(),
            milestone.getWeight(),
            milestone.getStatus() != null ? milestone.getStatus().name() : (snapshot != null && snapshot.status() != null ? snapshot.status().name() : null),
            format(snapshot != null ? snapshot.activatedAt() : milestone.getActivatedAt()),
            format(snapshot != null ? snapshot.completedAt() : milestone.getCompletedAt()),
            snapshot != null ? snapshot.progressPercent() : 0,
            snapshot != null ? snapshot.taskCount() : 0,
            snapshot != null ? snapshot.completedTaskCount() : 0,
            snapshot != null && snapshot.canMarkDone(),
            format(milestone.getCreatedAt()),
            format(milestone.getUpdatedAt())
        );
    }

    public ProjectMember toProjectMember(ProjectMemberEntity projectMember) {
        return new ProjectMember(
            projectMember.getUser().getId(),
            projectMember.getUser().getName(),
            projectMember.getUser().getEmail(),
            projectMember.getUser().getRole().name(),
            userAvatar(projectMember.getUser()),
            projectMember.isOwnerFlag()
        );
    }

    public TaskRecord toTaskRecord(TaskEntity task) {
        return toTaskRecord(task, null, false);
    }

    public TaskRecord toTaskRecord(
        TaskEntity task,
        ProjectProgressService.TaskNodeSnapshot snapshot,
        boolean blockedByMilestone
    ) {
        int derivedProgress =
            snapshot != null
                ? snapshot.derivedProgressPercent()
                : (task.getStatus() == TaskStatus.DONE ? 100 : 0);
        boolean canMarkDone =
            !blockedByMilestone
                && (task.getStatus() == TaskStatus.DONE
                    || snapshot == null
                    || !snapshot.hasChildren()
                    || snapshot.descendantsDone());
        boolean canCreateChild =
            !blockedByMilestone && task.getStatus() != TaskStatus.DONE;
        return new TaskRecord(
            task.getId(),
            task.getProject().getId(),
            task.getProject().getName(),
            task.getMilestone() != null ? task.getMilestone().getId() : null,
            task.getMilestone() != null ? task.getMilestone().getTitle() : null,
            task.getParentTask() != null ? task.getParentTask().getId() : null,
            task.getSortOrder(),
            task.getTitle(),
            task.getDescription(),
            task.getStatus().name(),
            task.getAssignee() != null ? task.getAssignee().getId() : null,
            task.getAssignee() != null ? task.getAssignee().getName() : "未分配",
            task.getDueDate() != null ? task.getDueDate().toString() : null,
            task.getPriority().name(),
            format(task.getCreatedAt()),
            format(task.getCompletedAt()),
            snapshot != null && snapshot.hasChildren(),
            snapshot != null ? snapshot.childCount() : 0,
            derivedProgress,
            canMarkDone,
            canCreateChild,
            blockedByMilestone,
            snapshot != null ? snapshot.depth() : 0
        );
    }

    public DiscussionPost toDiscussionListItem(DiscussionPostEntity entity) {
        int replies = discussionReplyRepository.findByPostIdOrderByCreatedAtAsc(entity.getId()).size();
        int linked = (int) discussionTaskLinkRepository.countByPostId(entity.getId());
        return new DiscussionPost(
            entity.getId(),
            entity.getProject().getId(),
            entity.getProject().getName(),
            entity.getTitle(),
            entity.getContent(),
            entity.getAuthor().getName(),
            replies,
            formatter.format(entity.getCreatedAt()),
            entity.getCategory().name(),
            entity.getStatus().name(),
            linked
        );
    }

    public DocumentRecord toDocumentRecord(DocumentEntity entity) {
        List<String> collaborators = projectMemberRepository.findByProjectId(entity.getProject().getId()).stream()
            .map(item -> item.getUser().getName())
            .toList();
        return new DocumentRecord(
            entity.getId(),
            entity.getProject().getId(),
            entity.getProject().getName(),
            entity.getTitle(),
            entity.getExcerpt(),
            formatter.format(entity.getUpdatedAt()),
            collaborators,
            entity.getCollabKey(),
            entity.getCurrentContent(),
            entity.getKind() != null ? entity.getKind().name() : "NOTE",
            entity.getOfficeExt(),
            entity.getFileAssetId()
        );
    }

    public String userAvatar(UserEntity user) {
        if (user == null || user.getAvatar() == null || user.getAvatar().isBlank()) return null;
        if (user.getAvatar().startsWith("local:")) {
            long version = user.getUpdatedAt() != null
                ? user.getUpdatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
                : System.currentTimeMillis();
            return "/api/users/" + user.getId() + "/avatar?v=" + version;
        }
        return user.getAvatar();
    }

    private String format(java.time.LocalDateTime value) {
        return value != null ? formatter.format(value) : null;
    }
}
