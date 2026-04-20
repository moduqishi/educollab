package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.AuthDtos.ChangePasswordRequest;
import com.educollab.dto.AuthDtos.UpdateProfileRequest;
import com.educollab.dto.AuthDtos.UpdateSettingsRequest;
import com.educollab.dto.AuthDtos.UserProfile;
import com.educollab.dto.AuthDtos.UserSettings;
import com.educollab.model.UserEntity;
import com.educollab.repo.UserRepository;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.ZoneOffset;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class UserProfileService {
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif"
    );
    private static final long MAX_AVATAR_BYTES = 5L * 1024 * 1024;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final Path avatarRoot;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    public UserProfileService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        @Value("${app.file-storage.root:./data/uploads}") String rootDir
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.avatarRoot = Path.of(rootDir).resolve("avatars");
        this.objectMapper = new com.fasterxml.jackson.databind.ObjectMapper();
    }

    public UserProfile me(JwtPrincipal principal) {
        return toProfile(getUser(principal.userId()));
    }

    @Transactional
    public UserProfile updateProfile(JwtPrincipal principal, UpdateProfileRequest request) {
        UserEntity user = getUser(principal.userId());
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isBlank()) {
            throw new ApiException("姓名不能为空");
        }
        user.setName(name);
        userRepository.save(user);
        return toProfile(user);
    }

    @Transactional
    public UserProfile uploadAvatar(JwtPrincipal principal, MultipartFile file) {
        UserEntity user = getUser(principal.userId());
        validateAvatar(file);

        try {
            Files.createDirectories(avatarRoot);
            deleteExistingLocalAvatar(user);
            String ext = extensionOf(file.getOriginalFilename(), file.getContentType());
            String generatedName = user.getId() + "-" + UUID.randomUUID() + ext;
            Path target = avatarRoot.resolve(generatedName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            user.setAvatar("local:" + generatedName);
            userRepository.save(user);
            return toProfile(user);
        } catch (IOException ex) {
            throw new ApiException("头像上传失败: " + ex.getMessage());
        }
    }

    @Transactional
    public void changePassword(JwtPrincipal principal, ChangePasswordRequest request) {
        UserEntity user = getUser(principal.userId());
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException("当前密码不正确");
        }

        String newPassword = request.newPassword() == null ? "" : request.newPassword().trim();
        if (newPassword.length() < 8) {
            throw new ApiException("新密码至少需要 8 位");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new ApiException("新密码不能与当前密码相同");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public Resource avatar(Long userId) {
        UserEntity user = getUser(userId);
        if (user.getAvatar() == null || !user.getAvatar().startsWith("local:")) {
            throw new ApiException("头像不存在");
        }
        Path avatarFile = avatarRoot.resolve(user.getAvatar().substring("local:".length()));
        if (!Files.exists(avatarFile)) {
            throw new ApiException("头像不存在");
        }
        return new FileSystemResource(avatarFile);
    }

    public String avatarContentType(Long userId) {
        UserEntity user = getUser(userId);
        if (user.getAvatar() == null || !user.getAvatar().startsWith("local:")) {
            return "application/octet-stream";
        }

        String fileName = user.getAvatar().substring("local:".length()).toLowerCase();
        if (fileName.endsWith(".png")) {
            return "image/png";
        }
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (fileName.endsWith(".webp")) {
            return "image/webp";
        }
        if (fileName.endsWith(".gif")) {
            return "image/gif";
        }
        return "application/octet-stream";
    }

    public UserProfile toProfile(UserEntity user) {
        return new UserProfile(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getRole(),
            resolveAvatar(user),
            toSettings(user.getPreferences())
        );
    }

    public UserSettings getSettings(JwtPrincipal principal) {
        UserEntity user = getUser(principal.userId());
        return toSettings(user.getPreferences());
    }

    @Transactional
    public UserSettings updateSettings(JwtPrincipal principal, UpdateSettingsRequest request) {
        UserEntity user = getUser(principal.userId());
        UserSettings updated = new UserSettings(
            request.notifyInApp(), request.notifyTask(), request.notifyAssignment(),
            request.notifyGroupTask(), request.density(), request.defaultHome(), request.timeFormat()
        );
        try {
            user.setPreferences(objectMapper.writeValueAsString(Map.of(
                "notifyInApp", updated.notifyInApp(),
                "notifyTask", updated.notifyTask(),
                "notifyAssignment", updated.notifyAssignment(),
                "notifyGroupTask", updated.notifyGroupTask(),
                "density", updated.density(),
                "defaultHome", updated.defaultHome(),
                "timeFormat", updated.timeFormat()
            )));
        } catch (Exception ex) {
            throw new ApiException("保存设置失败");
        }
        userRepository.save(user);
        return updated;
    }

    private UserSettings toSettings(String preferences) {
        try {
            if (preferences == null || preferences.isBlank()) return defaultSettings();
            Map<String, Object> map = objectMapper.readValue(preferences, Map.class);
            return new UserSettings(
                toBoolean(map.get("notifyInApp"), true),
                toBoolean(map.get("notifyTask"), true),
                toBoolean(map.get("notifyAssignment"), true),
                toBoolean(map.get("notifyGroupTask"), true),
                strOr(map.get("density"), "comfortable"),
                strOr(map.get("defaultHome"), "/app/dashboard"),
                strOr(map.get("timeFormat"), "relative")
            );
        } catch (Exception ex) {
            return defaultSettings();
        }
    }

    private UserSettings defaultSettings() {
        return new UserSettings(true, true, true, true, "comfortable", "/app/dashboard", "relative");
    }

    private Boolean toBoolean(Object val, Boolean fallback) {
        if (val instanceof Boolean) return (Boolean) val;
        return fallback;
    }

    private String strOr(Object val, String fallback) {
        return val instanceof String ? (String) val : fallback;
    }

    private String resolveAvatar(UserEntity user) {
        if (user.getAvatar() == null || user.getAvatar().isBlank()) {
            return null;
        }
        if (user.getAvatar().startsWith("local:")) {
            long version = user.getUpdatedAt() != null
                ? user.getUpdatedAt().toInstant(ZoneOffset.UTC).toEpochMilli()
                : System.currentTimeMillis();
            return "/api/users/" + user.getId() + "/avatar?v=" + version;
        }
        return user.getAvatar();
    }

    private void validateAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("请选择头像文件");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new ApiException("头像文件不能超过 5MB");
        }

        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        if (!ALLOWED_CONTENT_TYPES.contains(contentType)) {
            throw new ApiException("仅支持 PNG、JPG、WEBP 或 GIF 图片");
        }
    }

    private void deleteExistingLocalAvatar(UserEntity user) throws IOException {
        if (user.getAvatar() == null || !user.getAvatar().startsWith("local:")) {
            return;
        }
        Path current = avatarRoot.resolve(user.getAvatar().substring("local:".length()));
        Files.deleteIfExists(current);
    }

    private String extensionOf(String fileName, String contentType) {
        if (fileName != null && fileName.contains(".")) {
            return fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
        }
        if ("image/png".equalsIgnoreCase(contentType)) {
            return ".png";
        }
        if ("image/webp".equalsIgnoreCase(contentType)) {
            return ".webp";
        }
        if ("image/gif".equalsIgnoreCase(contentType)) {
            return ".gif";
        }
        return ".jpg";
    }

    private UserEntity getUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ApiException("用户不存在"));
    }
}
