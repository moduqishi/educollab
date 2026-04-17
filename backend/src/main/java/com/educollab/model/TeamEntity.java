package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "teams")
public class TeamEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @Column(nullable = false, length = 120) private String name;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id") private CourseEntity course;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "group_task_id") private GroupTaskEntity groupTask;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "leader_id") private UserEntity leader;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TeamStatus status = TeamStatus.FORMING;
 public Long getId(){return id;} public String getName(){return name;} public void setName(String name){this.name=name;} public CourseEntity getCourse(){return course;} public void setCourse(CourseEntity course){this.course=course;} public GroupTaskEntity getGroupTask(){return groupTask;} public void setGroupTask(GroupTaskEntity groupTask){this.groupTask=groupTask;} public UserEntity getLeader(){return leader;} public void setLeader(UserEntity leader){this.leader=leader;} public TeamStatus getStatus(){return status;} public void setStatus(TeamStatus status){this.status=status;}
}
