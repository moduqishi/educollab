package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DiscussionPostRepository extends JpaRepository<DiscussionPostEntity, Long> { List<DiscussionPostEntity> findByProjectIdOrderByUpdatedAtDesc(Long projectId); List<DiscussionPostEntity> findByProjectIdInOrderByUpdatedAtDesc(List<Long> projectIds); }
