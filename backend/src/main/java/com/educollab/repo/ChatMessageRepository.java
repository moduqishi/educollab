package com.educollab.repo;

import com.educollab.model.ChatMessageEntity;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, Long> {
    List<ChatMessageEntity> findByRoomIdOrderByCreatedAtDesc(Long roomId, Pageable pageable);
    long countByRoomId(Long roomId);
}