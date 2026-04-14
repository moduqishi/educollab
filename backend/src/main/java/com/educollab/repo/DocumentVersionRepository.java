package com.educollab.repo;

import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersionEntity, Long> {
    List<DocumentVersionEntity> findByDocumentIdOrderByCreatedAtDesc(Long documentId);
    void deleteByDocumentId(Long documentId);
}
