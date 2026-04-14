package com.educollab.repo;
import com.educollab.model.*;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface FileAssetRepository extends JpaRepository<FileAssetEntity, Long> { List<FileAssetEntity> findByOwnerTypeAndOwnerId(FileOwnerType ownerType, Long ownerId); }
