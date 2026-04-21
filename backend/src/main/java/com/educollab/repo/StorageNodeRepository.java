package com.educollab.repo;

import com.educollab.model.StorageNodeEntity;
import com.educollab.model.StorageScopeType;
import com.educollab.model.StorageSpaceType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StorageNodeRepository extends JpaRepository<StorageNodeEntity, Long> {
  List<StorageNodeEntity> findByParentIdOrderByNodeTypeAscNameAsc(Long parentId);

  List<StorageNodeEntity> findByScopeTypeAndScopeIdAndSpaceTypeOrderByNodeTypeAscNameAsc(
      StorageScopeType scopeType, Long scopeId, StorageSpaceType spaceType);

  Optional<StorageNodeEntity>
      findByScopeTypeAndScopeIdAndSpaceTypeAndParentIdAndNameIgnoreCase(
          StorageScopeType scopeType,
          Long scopeId,
          StorageSpaceType spaceType,
          Long parentId,
          String name);

  Optional<StorageNodeEntity>
      findByScopeTypeAndScopeIdAndSpaceTypeAndRelativePath(
          StorageScopeType scopeType,
          Long scopeId,
          StorageSpaceType spaceType,
          String relativePath);

  List<StorageNodeEntity> findByRelativePathStartingWith(String relativePath);

  List<StorageNodeEntity> findByScopeTypeAndScopeIdOrderByRelativePathAsc(
      StorageScopeType scopeType, Long scopeId);

  Optional<StorageNodeEntity> findByFileAssetId(Long fileAssetId);

  Optional<StorageNodeEntity> findByLinkedDocumentId(Long linkedDocumentId);
}
