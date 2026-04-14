package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "ai_usage_logs")
public class AiUsageLogEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false) private UserEntity user;
 @Column(nullable = false, length = 100) private String scenario;
 @Column(nullable = false, length = 100) private String modelName;
 @Column(nullable = false) private boolean success;
 @Column(columnDefinition = "TEXT") private String promptPreview;
 public Long getId(){return id;} public UserEntity getUser(){return user;} public void setUser(UserEntity user){this.user=user;} public String getScenario(){return scenario;} public void setScenario(String scenario){this.scenario=scenario;} public String getModelName(){return modelName;} public void setModelName(String modelName){this.modelName=modelName;} public boolean isSuccess(){return success;} public void setSuccess(boolean success){this.success=success;} public String getPromptPreview(){return promptPreview;} public void setPromptPreview(String promptPreview){this.promptPreview=promptPreview;}
}