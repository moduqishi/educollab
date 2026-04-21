package com.educollab.model;

import jakarta.persistence.*;

@Entity
@Table(name = "admin_audit_events")
public class AdminAuditEventEntity extends BaseEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "admin_user_id", nullable = false)
  private UserEntity adminUser;

  @Column(name = "scope_type", nullable = false, length = 40)
  private String scopeType;

  @Column(name = "scope_id")
  private Long scopeId;

  @Column(name = "scope_title", length = 255)
  private String scopeTitle;

  @Column(name = "action_type", nullable = false, length = 60)
  private String actionType;

  @Column(name = "detail_text", columnDefinition = "TEXT")
  private String detailText;

  public Long getId() {
    return id;
  }

  public UserEntity getAdminUser() {
    return adminUser;
  }

  public void setAdminUser(UserEntity adminUser) {
    this.adminUser = adminUser;
  }

  public String getScopeType() {
    return scopeType;
  }

  public void setScopeType(String scopeType) {
    this.scopeType = scopeType;
  }

  public Long getScopeId() {
    return scopeId;
  }

  public void setScopeId(Long scopeId) {
    this.scopeId = scopeId;
  }

  public String getScopeTitle() {
    return scopeTitle;
  }

  public void setScopeTitle(String scopeTitle) {
    this.scopeTitle = scopeTitle;
  }

  public String getActionType() {
    return actionType;
  }

  public void setActionType(String actionType) {
    this.actionType = actionType;
  }

  public String getDetailText() {
    return detailText;
  }

  public void setDetailText(String detailText) {
    this.detailText = detailText;
  }
}
