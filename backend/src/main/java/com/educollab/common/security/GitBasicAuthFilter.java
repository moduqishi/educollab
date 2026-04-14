package com.educollab.common.security;

import com.educollab.service.GitAccessTokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class GitBasicAuthFilter extends OncePerRequestFilter {
  private final GitAccessTokenService tokenService;

  public GitBasicAuthFilter(GitAccessTokenService tokenService) {
    this.tokenService = tokenService;
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return path == null || !path.startsWith("/git/");
  }

  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header == null || !header.startsWith("Basic ")) {
      unauthorized(response);
      return;
    }

    String decoded;
    try {
      decoded = new String(Base64.getDecoder().decode(header.substring(6)), StandardCharsets.UTF_8);
    } catch (Exception ex) {
      unauthorized(response);
      return;
    }

    int idx = decoded.indexOf(':');
    if (idx <= 0) {
      unauthorized(response);
      return;
    }
    String username = decoded.substring(0, idx);
    String password = decoded.substring(idx + 1);

    try {
      JwtPrincipal principal = tokenService.authenticateByBasic(username, password);
      var auth = new UsernamePasswordAuthenticationToken(
          principal,
          null,
          List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().name()))
      );
      SecurityContextHolder.getContext().setAuthentication(auth);
      filterChain.doFilter(request, response);
    } catch (Exception ex) {
      SecurityContextHolder.clearContext();
      unauthorized(response);
    }
  }

  private void unauthorized(HttpServletResponse response) throws IOException {
    response.setStatus(401);
    response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Basic realm=\"EduCollab Git\"");
    response.getWriter().write("Unauthorized");
  }
}

