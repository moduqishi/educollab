package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface TeamMemberRepository extends JpaRepository<TeamMemberEntity, Long> {
 List<TeamMemberEntity> findByTeamId(Long teamId);
 Optional<TeamMemberEntity> findByTeamIdAndUserId(Long teamId, Long userId);
 List<TeamMemberEntity> findByUserId(Long userId);
}
