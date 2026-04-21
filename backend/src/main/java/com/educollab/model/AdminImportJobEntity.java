package com.educollab.model;

import jakarta.persistence.*;

@Entity
@Table(name = "admin_import_jobs")
public class AdminImportJobEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "course_id")
  private CourseEntity course;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by_user_id", nullable = false)
  private UserEntity createdBy;

  @Column(name = "job_type", nullable = false, length = 60)
  private String jobType;

  @Column(name = "file_name", length = 255)
  private String fileName;

  @Column(name = "status", nullable = false, length = 40)
  private String status;

  @Column(name = "total_rows")
  private Integer totalRows;

  @Column(name = "imported_rows")
  private Integer importedRows;

  @Column(name = "skipped_rows")
  private Integer skippedRows;

  @Column(name = "created_users_count")
  private Integer createdUsersCount;

  @Column(name = "report_json", columnDefinition = "TEXT")
  private String reportJson;

  public Long getId() {
    return id;
  }

  public CourseEntity getCourse() {
    return course;
  }

  public void setCourse(CourseEntity course) {
    this.course = course;
  }

  public UserEntity getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(UserEntity createdBy) {
    this.createdBy = createdBy;
  }

  public String getJobType() {
    return jobType;
  }

  public void setJobType(String jobType) {
    this.jobType = jobType;
  }

  public String getFileName() {
    return fileName;
  }

  public void setFileName(String fileName) {
    this.fileName = fileName;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public Integer getTotalRows() {
    return totalRows;
  }

  public void setTotalRows(Integer totalRows) {
    this.totalRows = totalRows;
  }

  public Integer getImportedRows() {
    return importedRows;
  }

  public void setImportedRows(Integer importedRows) {
    this.importedRows = importedRows;
  }

  public Integer getSkippedRows() {
    return skippedRows;
  }

  public void setSkippedRows(Integer skippedRows) {
    this.skippedRows = skippedRows;
  }

  public Integer getCreatedUsersCount() {
    return createdUsersCount;
  }

  public void setCreatedUsersCount(Integer createdUsersCount) {
    this.createdUsersCount = createdUsersCount;
  }

  public String getReportJson() {
    return reportJson;
  }

  public void setReportJson(String reportJson) {
    this.reportJson = reportJson;
  }
}
