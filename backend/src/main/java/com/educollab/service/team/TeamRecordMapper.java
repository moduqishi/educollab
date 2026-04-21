package com.educollab.service.team;

import com.educollab.dto.WorkspaceDtos.TeamRecord;
import com.educollab.model.ProjectEntity;
import com.educollab.model.TeamEntity;
import com.educollab.model.TeamSource;
import com.educollab.repo.ProjectRepository;
import com.educollab.repo.TeamMemberRepository;
import org.springframework.stereotype.Component;

@Component
public class TeamRecordMapper {
  private final TeamMemberRepository teamMemberRepository;
  private final ProjectRepository projectRepository;

  public TeamRecordMapper(
      TeamMemberRepository teamMemberRepository, ProjectRepository projectRepository) {
    this.teamMemberRepository = teamMemberRepository;
    this.projectRepository = projectRepository;
  }

  public TeamRecord toRecord(TeamEntity team) {
    ProjectEntity project = projectRepository.findByTeamId(team.getId()).orElse(null);
    TeamSource source = resolveSource(team);
    return new TeamRecord(
        team.getId(),
        team.getName(),
        team.getCourse() != null ? team.getCourse().getId() : null,
        team.getCourse() != null ? team.getCourse().getName() : null,
        team.getGroupOrder(),
        teamMemberRepository.findByTeamId(team.getId()).size(),
        team.getLeader() != null ? team.getLeader().getId() : null,
        team.getLeader() != null ? team.getLeader().getName() : null,
        team.getInviteCode(),
        null,
        source.name(),
        team.getStatus() != null ? team.getStatus().name() : null,
        null,
        project != null ? project.getId() : null,
        project != null ? project.getName() : null);
  }

  public TeamSource resolveSource(TeamEntity team) {
    if (team.getSource() != null) {
      return team.getSource() == TeamSource.STANDALONE ? TeamSource.STANDALONE : TeamSource.COURSE;
    }
    if (team.getCourse() != null) {
      return TeamSource.COURSE;
    }
    return TeamSource.STANDALONE;
  }
}
