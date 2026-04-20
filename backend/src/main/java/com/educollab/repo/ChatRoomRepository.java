package com.educollab.repo;

import com.educollab.model.ChatRoomEntity;
import com.educollab.model.ChatRoomType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRoomRepository extends JpaRepository<ChatRoomEntity, Long> {
    Optional<ChatRoomEntity> findByProjectId(Long projectId);
    Optional<ChatRoomEntity> findByCourseId(Long courseId);
    List<ChatRoomEntity> findByRoomTypeAndCourseId(ChatRoomType roomType, Long courseId);
}