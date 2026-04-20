package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "courses")
public class CourseEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @Column(nullable = false, length = 120) private String name;
 @Column(name = "class_code", length = 20, unique = true) private String classCode;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "teacher_id") private UserEntity teacher;
 public Long getId(){return id;} public String getName(){return name;} public void setName(String name){this.name=name;} public String getClassCode(){return classCode;} public void setClassCode(String classCode){this.classCode=classCode;} public UserEntity getTeacher(){return teacher;} public void setTeacher(UserEntity teacher){this.teacher=teacher;}
}
