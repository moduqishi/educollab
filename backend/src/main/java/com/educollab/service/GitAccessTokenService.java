package com.educollab.service;

import com.educollab.common.exception.ApiException;
import com.educollab.common.security.JwtPrincipal;
import com.educollab.dto.WorkspaceDtos.GitTokenCreateResponse;
import com.educollab.dto.WorkspaceDtos.GitTokenItem;
import com.educollab.model.GitAccessTokenEntity;
import com.educollab.model.UserEntity;
import com.educollab.repo.GitAccessTokenRepository;
import com.educollab.repo.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GitAccessTokenService {
  private final GitAccessTokenRepository tokenRepository;
  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final SecureRandom random = new SecureRandom();
  private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

  public GitAccessTokenService(GitAccessTokenRepository tokenRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.tokenRepository = tokenRepository;
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  public List<GitTokenItem> list(JwtPrincipal principal) {
    return tokenRepository.findByUserIdOrderByCreatedAtDesc(principal.userId()).stream()
        .map(entity -> new GitTokenItem(
            entity.getId(),
            entity.getName(),
            entity.getTokenPrefix(),
            format(entity.getCreatedAt()),
            entity.getLastUsedAt() == null ? null : formatter.format(entity.getLastUsedAt().atZone(ZoneId.systemDefault())),
            entity.isRevoked(),
            entity.getExpiresAt() == null ? null : formatter.format(entity.getExpiresAt().atZone(ZoneId.systemDefault()))
        ))
        .toList();
  }

  @Transactional
  public GitTokenCreateResponse create(JwtPrincipal principal, String name, Integer expiresInDays) {
    String n = name == null ? "" : name.trim();
    if (n.isBlank()) throw new ApiException("Token 名称不能为空");
    if (n.length() > 150) throw new ApiException("Token 名称过长");

    UserEntity user = userRepository.findById(principal.userId()).orElseThrow(() -> new ApiException("用户不存在"));

    String token = generateToken();
    String prefix = token.substring(0, Math.min(6, token.length()));
    String hash = sha256Hex(token);

    GitAccessTokenEntity entity = new GitAccessTokenEntity();
    entity.setUser(user);
    entity.setName(n);
    entity.setTokenPrefix(prefix);
    entity.setTokenHash(hash);
    entity.setRevoked(false);
    if (expiresInDays != null && expiresInDays > 0) {
      entity.setExpiresAt(LocalDateTime.now().plusDays(expiresInDays));
    }
    tokenRepository.save(entity);

    String expiresAt = entity.getExpiresAt() == null ? null : formatter.format(entity.getExpiresAt().atZone(ZoneId.systemDefault()));
    return new GitTokenCreateResponse(token, prefix, expiresAt);
  }

  @Transactional
  public void revoke(JwtPrincipal principal, Long id) {
    GitAccessTokenEntity entity = tokenRepository.findByUserIdAndId(principal.userId(), id).orElseThrow(() -> new ApiException("Token 不存在"));
    entity.setRevoked(true);
    tokenRepository.save(entity);
  }

  @Transactional
  public JwtPrincipal authenticateByBasic(String email, String tokenPlain) {
    if (email == null || email.isBlank()) throw new ApiException("缺少用户名");
    if (tokenPlain == null || tokenPlain.isBlank()) throw new ApiException("缺少 token");

    // 1) Convenience for local dev: allow using the account password directly.
    //    (Still recommend using a token in production.)
    var userOpt = userRepository.findByEmailIgnoreCase(email.trim());
    if (userOpt.isPresent()) {
      UserEntity user = userOpt.get();
      if (user.getPasswordHash() != null && passwordEncoder.matches(tokenPlain, user.getPasswordHash())) {
        return new JwtPrincipal(user.getId(), user.getEmail(), user.getRole());
      }
    }

    // 2) Token auth (preferred)
    String hash = sha256Hex(tokenPlain);
    GitAccessTokenEntity token = tokenRepository.findByTokenHashAndRevokedFalse(hash).orElseThrow(() -> new ApiException("token 无效"));

    if (token.getExpiresAt() != null && token.getExpiresAt().isBefore(LocalDateTime.now())) {
      throw new ApiException("token 已过期");
    }

    UserEntity user = token.getUser();
    if (user == null) throw new ApiException("token 用户无效");
    if (user.getEmail() == null || !user.getEmail().equalsIgnoreCase(email.trim())) {
      throw new ApiException("token 与用户名不匹配");
    }

    token.setLastUsedAt(LocalDateTime.now());
    tokenRepository.save(token);

    return new JwtPrincipal(user.getId(), user.getEmail(), user.getRole());
  }

  private String generateToken() {
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String sha256Hex(String s) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      byte[] digest = md.digest(s.getBytes(StandardCharsets.UTF_8));
      StringBuilder sb = new StringBuilder(digest.length * 2);
      for (byte b : digest) sb.append(String.format("%02x", b));
      return sb.toString();
    } catch (Exception ex) {
      throw new ApiException("hash 失败: " + ex.getMessage());
    }
  }

  private String format(java.time.LocalDateTime dt) {
    return dt == null ? null : formatter.format(dt.atZone(ZoneId.systemDefault()));
  }
}
