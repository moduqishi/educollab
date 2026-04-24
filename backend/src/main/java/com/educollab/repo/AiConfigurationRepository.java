package com.educollab.repo;

import com.educollab.model.AiConfigurationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AiConfigurationRepository extends JpaRepository<AiConfigurationEntity, Long> {
    Optional<AiConfigurationEntity> findTopByOrderByIdDesc();
}