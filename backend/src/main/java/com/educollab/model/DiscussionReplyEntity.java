package com.educollab.model;
import jakarta.persistence.*;
@Entity @Table(name = "discussion_replies")
public class DiscussionReplyEntity extends BaseEntity {
 @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "post_id", nullable = false) private DiscussionPostEntity post;
 @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "author_id", nullable = false) private UserEntity author;
 @Column(nullable = false, columnDefinition = "TEXT") private String content;
 public Long getId(){return id;} public DiscussionPostEntity getPost(){return post;} public void setPost(DiscussionPostEntity post){this.post=post;} public UserEntity getAuthor(){return author;} public void setAuthor(UserEntity author){this.author=author;} public String getContent(){return content;} public void setContent(String content){this.content=content;}
}
