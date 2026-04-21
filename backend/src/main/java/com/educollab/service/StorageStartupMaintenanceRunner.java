package com.educollab.service;

import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.AdminDtos.AdminActionResultRecord;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.UserRepository;
import java.util.Comparator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class StorageStartupMaintenanceRunner {
  private static final Logger log = LoggerFactory.getLogger(StorageStartupMaintenanceRunner.class);

  private final AdminService adminService;
  private final UserRepository userRepository;
  private final ConfigurableApplicationContext applicationContext;
  private final boolean migrateOnStartup;
  private final boolean exitAfterMigrate;

  public StorageStartupMaintenanceRunner(
      AdminService adminService,
      UserRepository userRepository,
      ConfigurableApplicationContext applicationContext,
      @Value("${app.storage.migrate-on-startup:false}") boolean migrateOnStartup,
      @Value("${app.storage.exit-after-migrate:false}") boolean exitAfterMigrate) {
    this.adminService = adminService;
    this.userRepository = userRepository;
    this.applicationContext = applicationContext;
    this.migrateOnStartup = migrateOnStartup;
    this.exitAfterMigrate = exitAfterMigrate;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void runIfEnabled() {
    if (!migrateOnStartup) {
      return;
    }
    UserEntity admin =
        userRepository.findByEmailIgnoreCase("admin@educollab.local")
            .orElseGet(
                () ->
                    userRepository.findAll().stream()
                        .filter(user -> user.getRole() == UserRole.ADMIN)
                        .min(Comparator.comparing(UserEntity::getId))
                        .orElseThrow(() -> new IllegalStateException("未找到可用于存储迁移的管理员账号")));
    JwtPrincipal principal = new JwtPrincipal(admin.getId(), admin.getEmail(), admin.getRole());
    AdminActionResultRecord result = adminService.migrateStorage(principal);
    log.info("Storage startup migration finished: {} / affected={}", result.message(), result.affectedCount());
    if (exitAfterMigrate) {
      log.info("app.storage.exit-after-migrate=true，迁移完成后退出进程。");
      applicationContext.close();
    }
  }
}
