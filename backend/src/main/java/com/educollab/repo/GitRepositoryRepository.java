package com.educollab.repo;

import com.educollab.model.GitRepositoryEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GitRepositoryRepository extends JpaRepository<GitRepositoryEntity, Long> {
  Optional<GitRepositoryEntity> findByProjectId(Long projectId);
  Optional<GitRepositoryEntity> findBySlug(String slug);
}
