package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "teacher_feedback")
public class TeacherFeedbackEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "project_id", nullable = false) private ProjectEntity project;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "teacher_id", nullable = false) private UserEntity teacher;
 @Column(nullable = false) private Integer score;
 @Column(nullable = false, columnDefinition = "TEXT") private String content;
 public Long getId(){return id;} public ProjectEntity getProject(){return project;} public void setProject(ProjectEntity project){this.project=project;} public UserEntity getTeacher(){return teacher;} public void setTeacher(UserEntity teacher){this.teacher=teacher;} public Integer getScore(){return score;} public void setScore(Integer score){this.score=score;} public String getContent(){return content;} public void setContent(String content){this.content=content;}
}
