package com.educollab.repo;
import com.educollab.model.*;
import java.util.List; import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProjectMemberRepository extends JpaRepository<ProjectMemberEntity, Long> { List<ProjectMemberEntity> findByProjectId(Long projectId); List<ProjectMemberEntity> findByUserId(Long userId); Optional<ProjectMemberEntity> findByProjectIdAndUserId(Long projectId, Long userId); }
