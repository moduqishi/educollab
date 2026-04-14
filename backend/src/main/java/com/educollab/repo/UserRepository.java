package com.educollab.repo;
import com.educollab.model.*;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface UserRepository extends JpaRepository<UserEntity, Long> { Optional<UserEntity> findByEmailIgnoreCase(String email); }
