package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface MergeRequestRepository extends JpaRepository<MergeRequestEntity, Long> { List<MergeRequestEntity> findByProjectIdOrderByCreatedAtDesc(Long projectId); }
