package com.educollab.service;
import com.educollab.common.exception.ApiException; import com.educollab.common.security.JwtPrincipal; import com.educollab.common.security.JwtService; import com.educollab.dto.AuthDtos.*; import com.educollab.model.UserEntity; import com.educollab.repo.UserRepository; import org.springframework.security.crypto.password.PasswordEncoder; import org.springframework.stereotype.Service;
@Service
public class AuthService {
  private final UserRepository userRepository; private final PasswordEncoder passwordEncoder; private final JwtService jwtService;
  public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService){this.userRepository=userRepository;this.passwordEncoder=passwordEncoder;this.jwtService=jwtService;}
  public AuthResponse login(LoginRequest request){UserEntity user=userRepository.findByEmailIgnoreCase(request.email()).orElseThrow(() -> new ApiException("用户不存在")); if(!passwordEncoder.matches(request.password(), user.getPasswordHash())) throw new ApiException("密码错误"); return issue(user);} 
  public AuthResponse register(RegisterRequest request){userRepository.findByEmailIgnoreCase(request.email()).ifPresent(x->{throw new ApiException("邮箱已存在");}); UserEntity user=new UserEntity(); user.setName(request.name()); user.setEmail(request.email()); user.setPasswordHash(passwordEncoder.encode(request.password())); user.setRole(request.role()); user.setAvatar("https://picsum.photos/seed/"+request.email()+"/100/100"); userRepository.save(user); return issue(user);} 
  public AuthResponse me(JwtPrincipal principal){return issue(getUser(principal.userId()));}
  public UserEntity getUser(Long id){return userRepository.findById(id).orElseThrow(() -> new ApiException("用户不存在"));}
  private AuthResponse issue(UserEntity user){return new AuthResponse(jwtService.generate(user.getId(), user.getEmail(), user.getRole()), new UserProfile(user.getId(), user.getName(), user.getEmail(), user.getRole(), user.getAvatar()));}
}
