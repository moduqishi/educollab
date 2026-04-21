package com.educollab.service;

import com.educollab.service.demo.DemoSeedMode;
import com.educollab.service.demo.DemoSeedService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(100)
public class DataInitializer implements CommandLineRunner {
  private final DemoSeedService demoSeedService;

  @Value("${app.demo.seed-mode:OFF}")
  private String seedMode;

  public DataInitializer(DemoSeedService demoSeedService) {
    this.demoSeedService = demoSeedService;
  }

  @Override
  public void run(String... args) {
    demoSeedService.initialize(DemoSeedMode.from(seedMode));
  }
}
