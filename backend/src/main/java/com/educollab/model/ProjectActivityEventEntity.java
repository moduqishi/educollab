package com.educollab.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "project_activity_events")
public class ProjectActivityEventEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "project_id", nullable = false)
  private ProjectEntity project;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id")
  private CourseEntity course;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "team_id")
  private TeamEntity team;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private UserEntity user;

  @Enumerated(EnumType.STRING)
  @Column(name = "event_type", nullable = false, length = 40)
  private ProjectActivityEventType eventType;

  @Column(name = "target_type", length = 40)
  private String targetType;

  @Column(name = "target_id")
  private Long targetId;

  @Column(name = "target_title", length = 255)
  private String targetTitle;

  @Column(name = "event_count")
  private Integer eventCount;

  @Column(name = "lines_added")
  private Integer linesAdded;

  @Column(name = "lines_deleted")
  private Integer linesDeleted;

  @Column(name = "detail_json", columnDefinition = "TEXT")
  private String detailJson;

  @Column(name = "dedupe_key", length = 255, unique = true)
  private String dedupeKey;

  @Column(name = "occurred_at", nullable = false)
  private LocalDateTime occurredAt;

  public Long getId() {
    return id;
  }

  public ProjectEntity getProject() {
    return project;
  }

  public void setProject(ProjectEntity project) {
    this.project = project;
  }

  public CourseEntity getCourse() {
    return course;
  }

  public void setCourse(CourseEntity course) {
    this.course = course;
  }

  public TeamEntity getTeam() {
    return team;
  }

  public void setTeam(TeamEntity team) {
    this.team = team;
  }

  public UserEntity getUser() {
    return user;
  }

  public void setUser(UserEntity user) {
    this.user = user;
  }

  public ProjectActivityEventType getEventType() {
    return eventType;
  }

  public void setEventType(ProjectActivityEventType eventType) {
    this.eventType = eventType;
  }

  public String getTargetType() {
    return targetType;
  }

  public void setTargetType(String targetType) {
    this.targetType = targetType;
  }

  public Long getTargetId() {
    return targetId;
  }

  public void setTargetId(Long targetId) {
    this.targetId = targetId;
  }

  public String getTargetTitle() {
    return targetTitle;
  }

  public void setTargetTitle(String targetTitle) {
    this.targetTitle = targetTitle;
  }

  public Integer getEventCount() {
    return eventCount;
  }

  public void setEventCount(Integer eventCount) {
    this.eventCount = eventCount;
  }

  public Integer getLinesAdded() {
    return linesAdded;
  }

  public void setLinesAdded(Integer linesAdded) {
    this.linesAdded = linesAdded;
  }

  public Integer getLinesDeleted() {
    return linesDeleted;
  }

  public void setLinesDeleted(Integer linesDeleted) {
    this.linesDeleted = linesDeleted;
  }

  public String getDetailJson() {
    return detailJson;
  }

  public void setDetailJson(String detailJson) {
    this.detailJson = detailJson;
  }

  public String getDedupeKey() {
    return dedupeKey;
  }

  public void setDedupeKey(String dedupeKey) {
    this.dedupeKey = dedupeKey;
  }

  public LocalDateTime getOccurredAt() {
    return occurredAt;
  }

  public void setOccurredAt(LocalDateTime occurredAt) {
    this.occurredAt = occurredAt;
  }
}
