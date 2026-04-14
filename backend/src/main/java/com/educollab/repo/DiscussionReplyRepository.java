package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DiscussionReplyRepository extends JpaRepository<DiscussionReplyEntity, Long> { List<DiscussionReplyEntity> findByPostIdOrderByCreatedAtAsc(Long postId); }
