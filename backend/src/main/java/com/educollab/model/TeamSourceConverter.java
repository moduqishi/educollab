package com.educollab.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class TeamSourceConverter implements AttributeConverter<TeamSource, String> {
  @Override
  public String convertToDatabaseColumn(TeamSource attribute) {
    return attribute == null ? null : attribute.name();
  }

  @Override
  public TeamSource convertToEntityAttribute(String dbData) {
    if (dbData == null || dbData.isBlank()) {
      return null;
    }
    if ("STANDALONE".equalsIgnoreCase(dbData)) {
      return TeamSource.STANDALONE;
    }
    // Legacy values such as GROUP_TASK are now folded into COURSE.
    return TeamSource.COURSE;
  }
}
