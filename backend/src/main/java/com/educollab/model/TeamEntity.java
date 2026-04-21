package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "teams")
public class TeamEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @Column(nullable = false, length = 120) private String name;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "course_id") private CourseEntity course;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "group_task_id") private GroupTaskEntity groupTask;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "leader_id") private UserEntity leader;
 @Convert(converter = TeamSourceConverter.class) @Column(length = 20) private TeamSource source = TeamSource.STANDALONE;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TeamStatus status = TeamStatus.FORMING;
 @Column(name = "group_order") private Integer groupOrder;
 @Column(name = "invite_code", length = 20) private String inviteCode;
 public Long getId(){return id;} public String getName(){return name;} public void setName(String name){this.name=name;} public CourseEntity getCourse(){return course;} public void setCourse(CourseEntity course){this.course=course;} public GroupTaskEntity getGroupTask(){return groupTask;} public void setGroupTask(GroupTaskEntity groupTask){this.groupTask=groupTask;} public UserEntity getLeader(){return leader;} public void setLeader(UserEntity leader){this.leader=leader;} public TeamSource getSource(){return source;} public void setSource(TeamSource source){this.source=source;} public TeamStatus getStatus(){return status;} public void setStatus(TeamStatus status){this.status=status;} public Integer getGroupOrder(){return groupOrder;} public void setGroupOrder(Integer groupOrder){this.groupOrder=groupOrder;} public String getInviteCode(){return inviteCode;} public void setInviteCode(String inviteCode){this.inviteCode=inviteCode;}
}
