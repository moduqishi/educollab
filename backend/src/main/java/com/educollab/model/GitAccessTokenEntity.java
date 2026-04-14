package com.educollab.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "git_access_tokens", indexes = {
    @Index(name = "idx_git_token_user", columnList = "user_id"),
    @Index(name = "idx_git_token_hash", columnList = "token_hash")
})
public class GitAccessTokenEntity extends BaseEntity {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private UserEntity user;

  @Column(nullable = false)
  private String name;

  @Column(name = "token_prefix", nullable = false, length = 20)
  private String tokenPrefix;

  @Column(name = "token_hash", nullable = false, length = 128)
  private String tokenHash;

  @Column(nullable = false)
  private boolean revoked = false;

  @Column(name = "expires_at")
  private LocalDateTime expiresAt;

  @Column(name = "last_used_at")
  private LocalDateTime lastUsedAt;

  public Long getId() { return id; }
  public UserEntity getUser() { return user; }
  public void setUser(UserEntity user) { this.user = user; }
  public String getName() { return name; }
  public void setName(String name) { this.name = name; }
  public String getTokenPrefix() { return tokenPrefix; }
  public void setTokenPrefix(String tokenPrefix) { this.tokenPrefix = tokenPrefix; }
  public String getTokenHash() { return tokenHash; }
  public void setTokenHash(String tokenHash) { this.tokenHash = tokenHash; }
  public boolean isRevoked() { return revoked; }
  public void setRevoked(boolean revoked) { this.revoked = revoked; }
  public LocalDateTime getExpiresAt() { return expiresAt; }
  public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
  public LocalDateTime getLastUsedAt() { return lastUsedAt; }
  public void setLastUsedAt(LocalDateTime lastUsedAt) { this.lastUsedAt = lastUsedAt; }
}
