package com.educollab.service;

import com.educollab.model.NotificationSourceType;

public record NotificationTarget(
    NotificationSourceType sourceType,
    Long sourceId,
    String sourcePath,
    String sourceLabel) {

  public static NotificationTarget none() {
    return new NotificationTarget(null, null, null, null);
  }

  public static NotificationTarget of(
      NotificationSourceType sourceType, Long sourceId, String sourcePath, String sourceLabel) {
    return new NotificationTarget(sourceType, sourceId, sourcePath, sourceLabel);
  }
}
