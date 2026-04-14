package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DocumentRepository extends JpaRepository<DocumentEntity, Long> { List<DocumentEntity> findByProjectId(Long projectId); List<DocumentEntity> findByProjectIdIn(List<Long> projectIds); }
