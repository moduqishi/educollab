package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TeamMemberRepository extends JpaRepository<TeamMemberEntity, Long> { List<TeamMemberEntity> findByTeamId(Long teamId); }
