package com.educollab.dto;
import com.educollab.model.UserRole; import jakarta.validation.constraints.Email; import jakarta.validation.constraints.NotBlank;
public class AuthDtos {
  public record LoginRequest(@Email String email, @NotBlank String password) {}
  public record RegisterRequest(@NotBlank String name, @Email String email, @NotBlank String password, UserRole role) {}
  public record AuthResponse(String token, UserProfile profile) {}
  public record UserProfile(Long id, String name, String email, UserRole role, String avatar, UserSettings settings) {}
  public record UpdateProfileRequest(@NotBlank String name) {}
  public record ChangePasswordRequest(@NotBlank String currentPassword, @NotBlank String newPassword) {}
  public record UserSettings(Boolean notifyInApp, Boolean notifyTask, Boolean notifyAssignment, Boolean notifyGroupTask, String density, String defaultHome, String timeFormat) {}
  public record UpdateSettingsRequest(Boolean notifyInApp, Boolean notifyTask, Boolean notifyAssignment, Boolean notifyGroupTask, String density, String defaultHome, String timeFormat) {}
}
