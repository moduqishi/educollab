package com.educollab.controller;

import com.educollab.common.util.SecurityUtils;
import com.educollab.dto.AuthDtos.ChangePasswordRequest;
import com.educollab.dto.AuthDtos.UpdateProfileRequest;
import com.educollab.dto.AuthDtos.UserProfile;
import com.educollab.repo.UserRepository;
import com.educollab.service.UserProfileService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository userRepository;
    private final UserProfileService userProfileService;

    public UserController(UserRepository userRepository, UserProfileService userProfileService) {
        this.userRepository = userRepository;
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public List<UserProfile> list() {
        return userRepository.findAll().stream().map(userProfileService::toProfile).toList();
    }

    @GetMapping("/me")
    public UserProfile me() {
        return userProfileService.me(SecurityUtils.principal());
    }

    @PutMapping("/me")
    public UserProfile updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        return userProfileService.updateProfile(SecurityUtils.principal(), request);
    }

    @PostMapping("/me/avatar")
    public UserProfile uploadAvatar(@RequestParam("file") MultipartFile file) {
        return userProfileService.uploadAvatar(SecurityUtils.principal(), file);
    }

    @PostMapping("/me/change-password")
    public void changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        userProfileService.changePassword(SecurityUtils.principal(), request);
    }

    @GetMapping("/{id}/avatar")
    public ResponseEntity<Resource> avatar(@PathVariable("id") Long userId) {
        Resource resource = userProfileService.avatar(userId);
        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(userProfileService.avatarContentType(userId)))
            .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0")
            .header(HttpHeaders.PRAGMA, "no-cache")
            .header(HttpHeaders.EXPIRES, "0")
            .body(resource);
    }
}
