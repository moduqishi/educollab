package com.educollab.model;

import jakarta.persistence.*;

@Entity
@Table(name = "chat_messages")
public class ChatMessageEntity extends BaseEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private ChatRoomEntity room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private UserEntity author;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column
    private Long fileAssetId;

    @Column(length = 300)
    private String fileName;

    @Column
    private Long fileSizeBytes;

    @Column(length = 100)
    private String mimeType;

    public Long getId() { return id; }
    public ChatRoomEntity getRoom() { return room; }
    public void setRoom(ChatRoomEntity room) { this.room = room; }
    public UserEntity getAuthor() { return author; }
    public void setAuthor(UserEntity author) { this.author = author; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public Long getFileAssetId() { return fileAssetId; }
    public void setFileAssetId(Long fileAssetId) { this.fileAssetId = fileAssetId; }
    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }
    public Long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(Long fileSizeBytes) { this.fileSizeBytes = fileSizeBytes; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
}