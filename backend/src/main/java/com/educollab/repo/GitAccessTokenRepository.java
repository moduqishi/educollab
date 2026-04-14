package com.educollab.repo;

import com.educollab.model.GitAccessTokenEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GitAccessTokenRepository extends JpaRepository<GitAccessTokenEntity, Long> {
  List<GitAccessTokenEntity> findByUserIdOrderByCreatedAtDesc(Long userId);
  Optional<GitAccessTokenEntity> findByUserIdAndId(Long userId, Long id);
  Optional<GitAccessTokenEntity> findByTokenHashAndRevokedFalse(String tokenHash);
}

