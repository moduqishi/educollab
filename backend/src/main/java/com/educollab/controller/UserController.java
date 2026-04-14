package com.educollab.controller;

import com.educollab.dto.AuthDtos.UserProfile;
import com.educollab.repo.UserRepository;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserRepository userRepository;
    public UserController(UserRepository userRepository) { this.userRepository = userRepository; }
    @GetMapping public List<UserProfile> list() { return userRepository.findAll().stream().map(user -> new UserProfile(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getAvatar())).toList(); }
}
