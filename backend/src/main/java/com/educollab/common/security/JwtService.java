package com.educollab.common.security;
import com.educollab.model.UserRole;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
@Service
public class JwtService {
  private final SecretKey key; private final long ttlSeconds;
  public JwtService(@Value("${app.security.jwt-secret}") String secret, @Value("${app.security.jwt-ttl-seconds:86400}") long ttlSeconds) { this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8)); this.ttlSeconds = ttlSeconds; }
  public String generate(Long userId, String email, UserRole role) { Instant now = Instant.now(); return Jwts.builder().subject(String.valueOf(userId)).claim("email", email).claim("role", role.name()).issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(ttlSeconds))).signWith(key).compact(); }
  public JwtPrincipal parse(String token) { var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload(); return new JwtPrincipal(Long.valueOf(claims.getSubject()), claims.get("email", String.class), UserRole.valueOf(claims.get("role", String.class))); }
}
