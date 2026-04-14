package com.educollab.common.security;
import com.educollab.model.UserRole;
public record JwtPrincipal(Long userId, String email, UserRole role) {}
