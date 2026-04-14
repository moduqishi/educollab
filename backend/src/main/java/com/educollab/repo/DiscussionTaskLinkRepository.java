package com.educollab.repo;

import com.educollab.model.DiscussionTaskLinkEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DiscussionTaskLinkRepository extends JpaRepository<DiscussionTaskLinkEntity, Long> {
  List<DiscussionTaskLinkEntity> findByPostIdOrderByCreatedAtDesc(Long postId);
  Optional<DiscussionTaskLinkEntity> findByPostIdAndTaskId(Long postId, Long taskId);
  long countByPostId(Long postId);
}

