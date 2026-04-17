package com.educollab.model;
import jakarta.persistence.*; import java.time.LocalDate;
@Entity @Table(name = "projects")
public class ProjectEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "team_id") private TeamEntity team;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id") private CourseEntity course;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "group_task_id") private GroupTaskEntity groupTask;
 @Column(nullable = false, length = 150) private String name;
 @Column(columnDefinition = "TEXT") private String description;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ProjectType type;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ProjectStatus status = ProjectStatus.ACTIVE;
 @Column(nullable = false) private Integer progress = 0;
 private LocalDate dueDate;
 public Long getId(){return id;} public TeamEntity getTeam(){return team;} public void setTeam(TeamEntity team){this.team=team;} public CourseEntity getCourse(){return course;} public void setCourse(CourseEntity course){this.course=course;} public GroupTaskEntity getGroupTask(){return groupTask;} public void setGroupTask(GroupTaskEntity groupTask){this.groupTask=groupTask;} public String getName(){return name;} public void setName(String name){this.name=name;} public String getDescription(){return description;} public void setDescription(String description){this.description=description;} public ProjectType getType(){return type;} public void setType(ProjectType type){this.type=type;} public ProjectStatus getStatus(){return status;} public void setStatus(ProjectStatus status){this.status=status;} public Integer getProgress(){return progress;} public void setProgress(Integer progress){this.progress=progress;} public LocalDate getDueDate(){return dueDate;} public void setDueDate(LocalDate dueDate){this.dueDate=dueDate;}
}
