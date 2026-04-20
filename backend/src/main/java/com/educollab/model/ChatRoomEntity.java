package com.educollab.model;

import jakarta.persistence.*;

@Entity
@Table(name = "chat_rooms", uniqueConstraints = {
    @UniqueConstraint(name = "uk_chat_room_project", columnNames = {"project_id"}),
    @UniqueConstraint(name = "uk_chat_room_course", columnNames = {"course_id"})
})
public class ChatRoomEntity extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChatRoomType roomType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private ProjectEntity project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private CourseEntity course;

    @Column(length = 150)
    private String name;

    public Long getId() { return id; }
    public ChatRoomType getRoomType() { return roomType; }
    public void setRoomType(ChatRoomType roomType) { this.roomType = roomType; }
    public ProjectEntity getProject() { return project; }
    public void setProject(ProjectEntity project) { this.project = project; }
    public CourseEntity getCourse() { return course; }
    public void setCourse(CourseEntity course) { this.course = course; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}