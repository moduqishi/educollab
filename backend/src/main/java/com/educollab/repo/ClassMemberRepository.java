package com.educollab.repo;

import com.educollab.model.ClassMemberEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClassMemberRepository extends JpaRepository<ClassMemberEntity, Long> {
  List<ClassMemberEntity> findByCourseId(Long courseId);
  List<ClassMemberEntity> findByUserId(Long userId);
  Optional<ClassMemberEntity> findByCourseIdAndUserId(Long courseId, Long userId);
}
