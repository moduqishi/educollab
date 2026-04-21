package com.educollab.service.workspace;

import com.educollab.common.exception.ApiException;
import com.educollab.model.ProjectEntity;
import com.educollab.model.ProjectMilestoneEntity;
import com.educollab.model.ProjectMilestoneStatus;
import com.educollab.model.TaskEntity;
import com.educollab.model.TaskStatus;
import com.educollab.repo.ProjectMilestoneRepository;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.TaskRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ProjectProgressService {
  private final ProjectRepository projectRepository;
  private final ProjectMilestoneRepository projectMilestoneRepository;
  private final TaskRepository taskRepository;

  public ProjectProgressService(
      ProjectRepository projectRepository,
      ProjectMilestoneRepository projectMilestoneRepository,
      TaskRepository taskRepository) {
    this.projectRepository = projectRepository;
    this.projectMilestoneRepository = projectMilestoneRepository;
    this.taskRepository = taskRepository;
  }

  public ProjectProgressState snapshotProject(Long projectId) {
    ProjectEntity project =
        projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
    return buildState(project, orderedMilestones(projectId), orderedTasks(projectId));
  }

  @Transactional
  public ProjectProgressState recomputeProject(Long projectId) {
    ProjectEntity project =
        projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
    ProjectProgressState state = buildState(project, orderedMilestones(projectId), orderedTasks(projectId));
    persistComputedState(project, state);
    return state;
  }

  private List<ProjectMilestoneEntity> orderedMilestones(Long projectId) {
    return projectMilestoneRepository.findByProjectIdOrderBySortOrderAscCreatedAtAsc(projectId).stream()
        .sorted(
            Comparator.comparing(
                    (ProjectMilestoneEntity item) -> item.getSortOrder() == null ? Integer.MAX_VALUE : item.getSortOrder())
                .thenComparing(ProjectMilestoneEntity::getCreatedAt)
                .thenComparing(ProjectMilestoneEntity::getId))
        .toList();
  }

  private List<TaskEntity> orderedTasks(Long projectId) {
    return taskRepository.findByProjectId(projectId).stream()
        .sorted(
            Comparator.comparing((TaskEntity item) -> item.getSortOrder() == null ? Integer.MAX_VALUE : item.getSortOrder())
                .thenComparing(TaskEntity::getCreatedAt)
                .thenComparing(TaskEntity::getId))
        .toList();
  }

  private ProjectProgressState buildState(
      ProjectEntity project,
      List<ProjectMilestoneEntity> milestones,
      List<TaskEntity> tasks) {
    Map<Long, TaskEntity> taskById =
        tasks.stream().collect(Collectors.toMap(TaskEntity::getId, item -> item, (left, right) -> left, LinkedHashMap::new));
    Map<Long, List<TaskEntity>> childrenByParentId = new HashMap<>();
    for (TaskEntity task : tasks) {
      Long parentId =
          task.getParentTask() != null && taskById.containsKey(task.getParentTask().getId())
              ? task.getParentTask().getId()
              : null;
      childrenByParentId.computeIfAbsent(parentId, ignored -> new ArrayList<>()).add(task);
    }

    Map<Long, TaskNodeSnapshot> taskSnapshots = new LinkedHashMap<>();
    List<TaskEntity> roots = childrenByParentId.getOrDefault(null, List.of());
    for (TaskEntity root : roots) {
      computeTaskSnapshot(root, childrenByParentId, taskSnapshots, 0);
    }
    for (TaskEntity task : tasks) {
      taskSnapshots.computeIfAbsent(
          task.getId(),
          ignored ->
              new TaskNodeSnapshot(
                  task.getStatus(),
                  task.getStatus() == TaskStatus.DONE ? 100 : 0,
                  false,
                  0,
                  0,
                  true,
                  task.getStatus() == TaskStatus.DONE));
    }

    Map<Long, MilestoneSnapshot> milestoneSnapshots = new LinkedHashMap<>();
    LocalDateTime now = LocalDateTime.now();
    boolean prefixDone = true;
    boolean activeAssigned = false;

    for (ProjectMilestoneEntity milestone : milestones) {
      List<TaskEntity> milestoneRoots =
          roots.stream()
              .filter(task -> task.getMilestone() != null && Objects.equals(task.getMilestone().getId(), milestone.getId()))
              .toList();
      List<TaskEntity> milestoneTasks =
          tasks.stream()
              .filter(task -> task.getMilestone() != null && Objects.equals(task.getMilestone().getId(), milestone.getId()))
              .toList();

      ProjectMilestoneStatus status;
      if (prefixDone && milestone.getStatus() == ProjectMilestoneStatus.DONE) {
        status = ProjectMilestoneStatus.DONE;
      } else if (!activeAssigned) {
        status = ProjectMilestoneStatus.ACTIVE;
        activeAssigned = true;
        prefixDone = false;
      } else {
        status = ProjectMilestoneStatus.LOCKED;
        prefixDone = false;
      }

      int shareCount = milestoneRoots.size() + 1;
      double completedShares = status == ProjectMilestoneStatus.DONE ? 1.0 : 0.0;
      completedShares +=
          milestoneRoots.stream()
              .mapToDouble(root -> taskSnapshots.get(root.getId()).derivedProgressPercent() / 100.0)
              .sum();
      int progressPercent = shareCount == 0 ? 0 : (int) Math.round((completedShares / shareCount) * 100.0);

      int taskCount = milestoneTasks.size();
      int completedTaskCount = (int) milestoneTasks.stream().filter(task -> task.getStatus() == TaskStatus.DONE).count();
      boolean allTasksDone =
          milestoneRoots.stream().allMatch(root -> taskSnapshots.get(root.getId()).subtreeDone())
              && milestoneTasks.stream().allMatch(task -> task.getStatus() == TaskStatus.DONE);
      boolean canMarkDone = status == ProjectMilestoneStatus.ACTIVE && allTasksDone;

      milestoneSnapshots.put(
          milestone.getId(),
          new MilestoneSnapshot(
              normalizedWeight(milestone.getWeight()),
              progressPercent,
              taskCount,
              completedTaskCount,
              status,
              resolveActivatedAt(milestone, status, now),
              status == ProjectMilestoneStatus.DONE ? resolveCompletedAt(milestone, now) : null,
              canMarkDone));
    }

    int totalWeight = milestones.stream().mapToInt(milestone -> milestoneSnapshots.get(milestone.getId()).weight()).sum();
    int weightedProgress =
        totalWeight == 0
            ? 0
            : (int)
                Math.round(
                    milestones.stream()
                            .mapToDouble(
                                milestone ->
                                    milestoneSnapshots.get(milestone.getId()).weight()
                                        * milestoneSnapshots.get(milestone.getId()).progressPercent())
                            .sum()
                        / totalWeight);

    return new ProjectProgressState(project, milestones, tasks, taskSnapshots, milestoneSnapshots, weightedProgress);
  }

  private TaskNodeSnapshot computeTaskSnapshot(
      TaskEntity task,
      Map<Long, List<TaskEntity>> childrenByParentId,
      Map<Long, TaskNodeSnapshot> cache,
      int depth) {
    if (cache.containsKey(task.getId())) {
      return cache.get(task.getId());
    }

    List<TaskEntity> children = childrenByParentId.getOrDefault(task.getId(), List.of());
    if (children.isEmpty()) {
      TaskNodeSnapshot snapshot =
          new TaskNodeSnapshot(
              task.getStatus(),
              task.getStatus() == TaskStatus.DONE ? 100 : 0,
              false,
              0,
              depth,
              true,
              task.getStatus() == TaskStatus.DONE);
      cache.put(task.getId(), snapshot);
      return snapshot;
    }

    List<TaskNodeSnapshot> childSnapshots = new ArrayList<>();
    for (TaskEntity child : children) {
      childSnapshots.add(computeTaskSnapshot(child, childrenByParentId, cache, depth + 1));
    }

    int shareCount = childSnapshots.size() + 1;
    double completedShares = task.getStatus() == TaskStatus.DONE ? 1.0 : 0.0;
    completedShares += childSnapshots.stream().mapToDouble(item -> item.derivedProgressPercent() / 100.0).sum();
    int derivedProgress = (int) Math.round((completedShares / shareCount) * 100.0);
    boolean descendantsDone = childSnapshots.stream().allMatch(TaskNodeSnapshot::subtreeDone);
    boolean subtreeDone = task.getStatus() == TaskStatus.DONE && descendantsDone;

    TaskNodeSnapshot snapshot =
        new TaskNodeSnapshot(
            task.getStatus(),
            derivedProgress,
            true,
            children.size(),
            depth,
            descendantsDone,
            subtreeDone);
    cache.put(task.getId(), snapshot);
    return snapshot;
  }

  private void persistComputedState(ProjectEntity project, ProjectProgressState state) {
    LocalDateTime now = LocalDateTime.now();
    boolean projectDirty = false;

    for (ProjectMilestoneEntity milestone : state.milestones()) {
      MilestoneSnapshot snapshot = state.milestoneSnapshots().get(milestone.getId());
      if (snapshot == null) continue;
      if (milestone.getStatus() != snapshot.status()) {
        milestone.setStatus(snapshot.status());
      }
      if (!Objects.equals(milestone.getActivatedAt(), snapshot.activatedAt())) {
        milestone.setActivatedAt(snapshot.activatedAt());
      }
      LocalDateTime nextCompletedAt =
          snapshot.status() == ProjectMilestoneStatus.DONE
              ? Objects.requireNonNullElse(snapshot.completedAt(), now)
              : null;
      if (!Objects.equals(milestone.getCompletedAt(), nextCompletedAt)) {
        milestone.setCompletedAt(nextCompletedAt);
      }
    }

    if (project.getProgress() != state.projectProgress()) {
      project.setProgress(state.projectProgress());
      projectDirty = true;
    }

    projectMilestoneRepository.saveAll(state.milestones());
    if (projectDirty) {
      projectRepository.save(project);
    }
  }

  private LocalDateTime resolveActivatedAt(
      ProjectMilestoneEntity milestone, ProjectMilestoneStatus status, LocalDateTime now) {
    if (status == ProjectMilestoneStatus.ACTIVE || status == ProjectMilestoneStatus.DONE) {
      return milestone.getActivatedAt() != null ? milestone.getActivatedAt() : now;
    }
    return milestone.getActivatedAt();
  }

  private LocalDateTime resolveCompletedAt(ProjectMilestoneEntity milestone, LocalDateTime now) {
    return milestone.getCompletedAt() != null ? milestone.getCompletedAt() : now;
  }

  private int normalizedWeight(Integer weight) {
    return weight == null || weight <= 0 ? 1 : weight;
  }

  public record TaskNodeSnapshot(
      TaskStatus status,
      int derivedProgressPercent,
      boolean hasChildren,
      int childCount,
      int depth,
      boolean descendantsDone,
      boolean subtreeDone) {}

  public record MilestoneSnapshot(
      int weight,
      int progressPercent,
      int taskCount,
      int completedTaskCount,
      ProjectMilestoneStatus status,
      LocalDateTime activatedAt,
      LocalDateTime completedAt,
      boolean canMarkDone) {}

  public record ProjectProgressState(
      ProjectEntity project,
      List<ProjectMilestoneEntity> milestones,
      List<TaskEntity> tasks,
      Map<Long, TaskNodeSnapshot> taskSnapshots,
      Map<Long, MilestoneSnapshot> milestoneSnapshots,
      int projectProgress) {}
}
