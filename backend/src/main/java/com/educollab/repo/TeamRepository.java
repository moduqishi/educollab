package com.educollab.repo;
import com.educollab.model.*;

import org.springframework.data.jpa.repository.JpaRepository;
public interface TeamRepository extends JpaRepository<TeamEntity, Long> {  }
