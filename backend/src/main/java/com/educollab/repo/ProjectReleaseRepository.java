package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface ProjectReleaseRepository extends JpaRepository<ProjectReleaseEntity, Long> { List<ProjectReleaseEntity> findByProjectIdOrderByCreatedAtDesc(Long projectId); }
