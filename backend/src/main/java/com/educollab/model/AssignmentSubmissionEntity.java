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
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
    name = "assignment_submissions",
    uniqueConstraints = @UniqueConstraint(columnNames = {"assignment_id", "student_id"}))
public class AssignmentSubmissionEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "assignment_id", nullable = false)
  private AssignmentEntity assignment;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "student_id", nullable = false)
  private UserEntity student;

  @Column(columnDefinition = "TEXT")
  private String content;

  @Column(name = "submission_url", length = 255)
  private String submissionUrl;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private AssignmentSubmissionStatus status;

  private Integer score;

  @Column(name = "teacher_feedback", columnDefinition = "TEXT")
  private String teacherFeedback;

  @Column(name = "submitted_at")
  private LocalDateTime submittedAt;

  @Column(name = "reviewed_at")
  private LocalDateTime reviewedAt;

  @Column(name = "attempt_count", nullable = false)
  private Integer attemptCount = 0;

  public Long getId() {
    return id;
  }

  public AssignmentEntity getAssignment() {
    return assignment;
  }

  public void setAssignment(AssignmentEntity assignment) {
    this.assignment = assignment;
  }

  public UserEntity getStudent() {
    return student;
  }

  public void setStudent(UserEntity student) {
    this.student = student;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public String getSubmissionUrl() {
    return submissionUrl;
  }

  public void setSubmissionUrl(String submissionUrl) {
    this.submissionUrl = submissionUrl;
  }

  public AssignmentSubmissionStatus getStatus() {
    return status;
  }

  public void setStatus(AssignmentSubmissionStatus status) {
    this.status = status;
  }

  public Integer getScore() {
    return score;
  }

  public void setScore(Integer score) {
    this.score = score;
  }

  public String getTeacherFeedback() {
    return teacherFeedback;
  }

  public void setTeacherFeedback(String teacherFeedback) {
    this.teacherFeedback = teacherFeedback;
  }

  public LocalDateTime getSubmittedAt() {
    return submittedAt;
  }

  public void setSubmittedAt(LocalDateTime submittedAt) {
    this.submittedAt = submittedAt;
  }

  public LocalDateTime getReviewedAt() {
    return reviewedAt;
  }

  public void setReviewedAt(LocalDateTime reviewedAt) {
    this.reviewedAt = reviewedAt;
  }

  public Integer getAttemptCount() {
    return attemptCount;
  }

  public void setAttemptCount(Integer attemptCount) {
    this.attemptCount = attemptCount;
  }
}
