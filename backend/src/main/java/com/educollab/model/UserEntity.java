package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "users")
public class UserEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @Column(nullable = false, length = 100) private String name;
 @Column(nullable = false, unique = true, length = 150) private String email;
 @Column(name = "password_hash", nullable = false) private String passwordHash;
 @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private UserRole role;
 private String avatar;
 @Column(columnDefinition = "JSON") private String preferences;
 public Long getId(){return id;} public String getName(){return name;} public void setName(String name){this.name=name;} public String getEmail(){return email;} public void setEmail(String email){this.email=email;} public String getPasswordHash(){return passwordHash;} public void setPasswordHash(String passwordHash){this.passwordHash=passwordHash;} public UserRole getRole(){return role;} public void setRole(UserRole role){this.role=role;} public String getAvatar(){return avatar;} public void setAvatar(String avatar){this.avatar=avatar;} public String getPreferences(){return preferences;} public void setPreferences(String preferences){this.preferences=preferences;}
}
