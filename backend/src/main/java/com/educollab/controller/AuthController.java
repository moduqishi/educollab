package com.educollab.controller;

import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.AuthDtos.*;
import com.educollab.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService;
    public AuthController(AuthService authService) { this.authService = authService; }
    @PostMapping("/login") public AuthResponse login(@Valid @RequestBody LoginRequest request) { return authService.login(request); }
    @PostMapping("/register") public AuthResponse register(@Valid @RequestBody RegisterRequest request) { return authService.register(request); }
    @GetMapping("/me")
    public AuthResponse me(@AuthenticationPrincipal JwtPrincipal principal) {
        if (principal == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "未登录");
        return authService.me(principal);
    }
}
