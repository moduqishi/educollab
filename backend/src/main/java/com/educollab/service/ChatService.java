package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.WorkspaceDtos.*;
import com.educollab.model.*;
import com.educollab.repo.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class ChatService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final ClassMemberRepository classMemberRepository;
    private final ProjectRepository projectRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    public ChatService(
            ChatRoomRepository chatRoomRepository,
            ChatMessageRepository chatMessageRepository,
            ProjectMemberRepository projectMemberRepository,
            ClassMemberRepository classMemberRepository,
            ProjectRepository projectRepository,
            CourseRepository courseRepository,
            UserRepository userRepository) {
        this.chatRoomRepository = chatRoomRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.classMemberRepository = classMemberRepository;
        this.projectRepository = projectRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public List<ChatRoomRecord> listRooms() {
        JwtPrincipal p = SecurityUtils.principal();

        List<ProjectMemberEntity> projectMemberships = projectMemberRepository.findByUserId(p.userId());
        List<Long> memberProjectIds = projectMemberships.stream().map(m -> m.getProject().getId()).toList();
        List<ClassMemberEntity> classMemberships = classMemberRepository.findByUserId(p.userId());
        List<Long> memberCourseIds = classMemberships.stream().map(m -> m.getCourse().getId()).toList();

        List<ChatRoomEntity> existingProjectRooms = chatRoomRepository.findAll().stream()
                .filter(r -> r.getRoomType() == ChatRoomType.PROJECT && memberProjectIds.contains(r.getProject().getId()))
                .toList();

        List<ChatRoomEntity> existingCourseRooms = chatRoomRepository.findAll().stream()
                .filter(r -> r.getRoomType() == ChatRoomType.COURSE && memberCourseIds.contains(r.getCourse().getId()))
                .toList();

        // Auto-create missing project rooms
        for (ProjectMemberEntity m : projectMemberships) {
            Long projId = m.getProject().getId();
            boolean hasRoom = existingProjectRooms.stream().anyMatch(r -> r.getProject().getId().equals(projId));
            if (!hasRoom) {
                ChatRoomEntity r = new ChatRoomEntity();
                r.setRoomType(ChatRoomType.PROJECT);
                r.setProject(m.getProject());
                r.setName(m.getProject().getName());
                r = chatRoomRepository.save(r);
                existingProjectRooms = chatRoomRepository.findAll().stream()
                        .filter(room -> room.getRoomType() == ChatRoomType.PROJECT && memberProjectIds.contains(room.getProject().getId()))
                        .toList();
            }
        }

        // Auto-create missing course rooms
        for (ClassMemberEntity m : classMemberships) {
            Long courseId = m.getCourse().getId();
            boolean hasRoom = existingCourseRooms.stream().anyMatch(r -> r.getCourse().getId().equals(courseId));
            if (!hasRoom) {
                ChatRoomEntity r = new ChatRoomEntity();
                r.setRoomType(ChatRoomType.COURSE);
                r.setCourse(m.getCourse());
                r.setName(m.getCourse().getName());
                r = chatRoomRepository.save(r);
                existingCourseRooms = chatRoomRepository.findAll().stream()
                        .filter(room -> room.getRoomType() == ChatRoomType.COURSE && memberCourseIds.contains(room.getCourse().getId()))
                        .toList();
            }
        }

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        List<ChatRoomRecord> records = new java.util.ArrayList<>();

        for (ChatRoomEntity room : existingProjectRooms) {
            ProjectEntity proj = room.getProject();
            long msgCount = chatMessageRepository.countByRoomId(room.getId());
            ChatMessageEntity last = chatMessageRepository.findByRoomIdOrderByCreatedAtDesc(room.getId(), PageRequest.of(0, 1)).stream().findFirst().orElse(null);
            records.add(new ChatRoomRecord(
                    room.getId(), "PROJECT",
                    proj.getId(), proj.getName(),
                    null, null,
                    proj.getName(),
                    projectMemberRepository.findByProjectId(proj.getId()).size(),
                    msgCount,
                    last != null ? (last.getFileAssetId() != null ? "[文件] " + last.getFileName() : last.getContent()) : null,
                    last != null ? last.getCreatedAt().format(fmt) : null
            ));
        }

        for (ChatRoomEntity room : existingCourseRooms) {
            CourseEntity course = room.getCourse();
            long msgCount = chatMessageRepository.countByRoomId(room.getId());
            ChatMessageEntity last = chatMessageRepository.findByRoomIdOrderByCreatedAtDesc(room.getId(), PageRequest.of(0, 1)).stream().findFirst().orElse(null);
            records.add(new ChatRoomRecord(
                    room.getId(), "COURSE",
                    null, null,
                    course.getId(), course.getName(),
                    course.getName(),
                    classMemberRepository.findByCourseId(course.getId()).size(),
                    msgCount,
                    last != null ? (last.getFileAssetId() != null ? "[文件] " + last.getFileName() : last.getContent()) : null,
                    last != null ? last.getCreatedAt().format(fmt) : null
            ));
        }

        records.sort((a, b) -> {
            if (a.lastMessageAt() == null && b.lastMessageAt() == null) return 0;
            if (a.lastMessageAt() == null) return 1;
            if (b.lastMessageAt() == null) return -1;
            return b.lastMessageAt().compareTo(a.lastMessageAt());
        });

        return records;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageRecord> messages(Long roomId, int page, int size) {
        JwtPrincipal p = SecurityUtils.principal();
        ChatRoomEntity room = chatRoomRepository.findById(roomId).orElseThrow(() -> new ApiException("聊天室不存在"));
        validateMembership(room, p);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        return chatMessageRepository.findByRoomIdOrderByCreatedAtDesc(roomId, PageRequest.of(page, size)).stream()
                .map(m -> new ChatMessageRecord(
                        m.getId(), m.getRoom().getId(), m.getAuthor().getId(),
                        m.getAuthor().getName(), m.getAuthor().getAvatar(),
                        m.getContent(), m.getFileAssetId(), m.getFileName(),
                        m.getFileSizeBytes(), m.getMimeType(),
                        m.getCreatedAt().format(fmt)
                )).toList();
    }

    @Transactional
    public ChatMessageRecord sendMessage(ChatMessageSendRequest req) {
        JwtPrincipal p = SecurityUtils.principal();
        ChatRoomEntity room = chatRoomRepository.findById(req.roomId()).orElseThrow(() -> new ApiException("聊天室不存在"));
        validateMembership(room, p);
        UserEntity author = userRepository.findById(p.userId()).orElseThrow(() -> new ApiException("用户不存在"));
        ChatMessageEntity msg = new ChatMessageEntity();
        msg.setRoom(room);
        msg.setAuthor(author);
        msg.setContent(req.content());
        msg.setFileAssetId(req.fileAssetId());
        msg.setFileName(req.fileName());
        msg.setFileSizeBytes(req.fileSizeBytes());
        msg.setMimeType(req.mimeType());
        msg = chatMessageRepository.save(msg);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        return new ChatMessageRecord(
                msg.getId(), room.getId(), author.getId(), author.getName(), author.getAvatar(),
                msg.getContent(), msg.getFileAssetId(), msg.getFileName(),
                msg.getFileSizeBytes(), msg.getMimeType(),
                msg.getCreatedAt().format(fmt)
        );
    }

    @Transactional
    public ChatRoomRecord getOrCreateProjectRoom(Long projectId) {
        JwtPrincipal p = SecurityUtils.principal();
        ProjectEntity project = projectRepository.findById(projectId).orElseThrow(() -> new ApiException("项目不存在"));
        projectMemberRepository.findByProjectIdAndUserId(projectId, p.userId()).orElseThrow(() -> new ApiException("无权限"));
        ChatRoomEntity room = chatRoomRepository.findByProjectId(projectId).orElseGet(() -> {
            ChatRoomEntity r = new ChatRoomEntity();
            r.setRoomType(ChatRoomType.PROJECT);
            r.setProject(project);
            r.setName(project.getName());
            return chatRoomRepository.save(r);
        });
        return toRecord(room);
    }

    @Transactional
    public ChatRoomRecord getOrCreateCourseRoom(Long courseId) {
        JwtPrincipal p = SecurityUtils.principal();
        CourseEntity course = courseRepository.findById(courseId).orElseThrow(() -> new ApiException("课程不存在"));
        classMemberRepository.findByCourseIdAndUserId(courseId, p.userId()).orElseThrow(() -> new ApiException("无权限"));
        ChatRoomEntity room = chatRoomRepository.findByCourseId(courseId).orElseGet(() -> {
            ChatRoomEntity r = new ChatRoomEntity();
            r.setRoomType(ChatRoomType.COURSE);
            r.setCourse(course);
            r.setName(course.getName());
            return chatRoomRepository.save(r);
        });
        return toRecord(room);
    }

    private void validateMembership(ChatRoomEntity room, JwtPrincipal p) {
        if (room.getRoomType() == ChatRoomType.PROJECT) {
            projectMemberRepository.findByProjectIdAndUserId(room.getProject().getId(), p.userId())
                    .orElseThrow(() -> new ApiException("无权限"));
        } else {
            classMemberRepository.findByCourseIdAndUserId(room.getCourse().getId(), p.userId())
                    .orElseThrow(() -> new ApiException("无权限"));
        }
    }

    private ChatRoomRecord toRecord(ChatRoomEntity room) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        long msgCount = chatMessageRepository.countByRoomId(room.getId());
        ChatMessageEntity last = chatMessageRepository.findByRoomIdOrderByCreatedAtDesc(room.getId(), PageRequest.of(0, 1)).stream().findFirst().orElse(null);
        int memberCount = room.getRoomType() == ChatRoomType.PROJECT
                ? projectMemberRepository.findByProjectId(room.getProject().getId()).size()
                : classMemberRepository.findByCourseId(room.getCourse().getId()).size();
        if (room.getRoomType() == ChatRoomType.PROJECT) {
            return new ChatRoomRecord(room.getId(), "PROJECT", room.getProject().getId(), room.getProject().getName(), null, null, room.getName(), memberCount, msgCount,
                    last != null ? (last.getFileAssetId() != null ? "[文件] " + last.getFileName() : last.getContent()) : null,
                    last != null ? last.getCreatedAt().format(fmt) : null);
        } else {
            return new ChatRoomRecord(room.getId(), "COURSE", null, null, room.getCourse().getId(), room.getCourse().getName(), room.getName(), memberCount, msgCount,
                    last != null ? (last.getFileAssetId() != null ? "[文件] " + last.getFileName() : last.getContent()) : null,
                    last != null ? last.getCreatedAt().format(fmt) : null);
        }
    }
}