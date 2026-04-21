package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.common.security.JwtService;
import com.educollab.dto.AuthDtos.AuthResponse;
import com.educollab.dto.AuthDtos.LoginRequest;
import com.educollab.dto.AuthDtos.RegisterRequest;
import com.educollab.model.UserEntity;
import com.educollab.model.UserRole;
import com.educollab.repo.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserProfileService userProfileService;

    public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        JwtService jwtService,
        UserProfileService userProfileService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.userProfileService = userProfileService;
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        UserEntity user = userRepository
            .findByEmailIgnoreCase(email)
            .orElseThrow(() -> new ApiException("用户不存在"));
        if (Boolean.FALSE.equals(user.getActive())) {
            throw new ApiException("该账号已被管理员停用");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ApiException("密码错误");
        }
        return issue(user);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        String email = normalizeEmail(request.email());
        String password = request.password() == null ? "" : request.password().trim();
        UserRole role = request.role() == null ? UserRole.STUDENT : request.role();

        if (name.isBlank()) {
            throw new ApiException("姓名不能为空");
        }
        if (email.isBlank()) {
            throw new ApiException("邮箱不能为空");
        }
        if (password.length() < 8) {
            throw new ApiException("密码至少需要 8 位");
        }
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ApiException("该邮箱已注册");
        }

        UserEntity user = new UserEntity();
        user.setName(name);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role);
        user.setActive(true);
        user.setAvatar(null);
        userRepository.save(user);
        return issue(user);
    }

    public AuthResponse me(JwtPrincipal principal) {
        return issue(getUser(principal.userId()));
    }

    public UserEntity getUser(Long userId) {
        return userRepository.findById(userId).orElseThrow(() -> new ApiException("用户不存在"));
    }

    private AuthResponse issue(UserEntity user) {
        String token = jwtService.generate(user.getId(), user.getEmail(), user.getRole());
        return new AuthResponse(token, userProfileService.toProfile(user));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
