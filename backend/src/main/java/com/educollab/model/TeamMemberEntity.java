package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "team_members", uniqueConstraints = @UniqueConstraint(columnNames = {"team_id","user_id"}))
public class TeamMemberEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "team_id", nullable = false) private TeamEntity team;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private UserEntity user;
 public Long getId(){return id;} public TeamEntity getTeam(){return team;} public void setTeam(TeamEntity team){this.team=team;} public UserEntity getUser(){return user;} public void setUser(UserEntity user){this.user=user;}
}
