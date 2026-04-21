package com.educollab.service.demo;

import java.util.Locale;

public enum DemoSeedMode {
  OFF,
  ENSURE_DEMO,
  RESET_DEMO;

  public static DemoSeedMode from(String raw) {
    if (raw == null || raw.isBlank()) {
      return OFF;
    }
    try {
      return DemoSeedMode.valueOf(raw.trim().toUpperCase(Locale.ROOT));
    } catch (IllegalArgumentException ex) {
      return OFF;
    }
  }
}
