package com.educollab.model;
import jakarta.persistence.*;
import java.time.LocalDate;
@Entity @Table(name = "assignments")
public class AssignmentEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "project_id") private ProjectEntity project;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id") private CourseEntity course;
 @Column(nullable = false, length = 150) private String title;
 @Column(columnDefinition = "TEXT") private String summary;
 @Column(length = 255) private String submissionUrl;
 private LocalDate dueDate;
 public Long getId(){return id;} public ProjectEntity getProject(){return project;} public void setProject(ProjectEntity project){this.project=project;} public CourseEntity getCourse(){return course;} public void setCourse(CourseEntity course){this.course=course;} public String getTitle(){return title;} public void setTitle(String title){this.title=title;} public String getSummary(){return summary;} public void setSummary(String summary){this.summary=summary;} public String getSubmissionUrl(){return submissionUrl;} public void setSubmissionUrl(String submissionUrl){this.submissionUrl=submissionUrl;} public LocalDate getDueDate(){return dueDate;} public void setDueDate(LocalDate dueDate){this.dueDate=dueDate;}
}
