package com.educollab.common.security;
import jakarta.servlet.FilterChain; import jakarta.servlet.ServletException; import jakarta.servlet.http.HttpServletRequest; import jakarta.servlet.http.HttpServletResponse; import java.io.IOException; import java.util.List; import org.springframework.http.HttpHeaders; import org.springframework.security.authentication.UsernamePasswordAuthenticationToken; import org.springframework.security.core.authority.SimpleGrantedAuthority; import org.springframework.security.core.context.SecurityContextHolder; import org.springframework.stereotype.Component; import org.springframework.web.filter.OncePerRequestFilter;
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  private final JwtService jwtService; public JwtAuthenticationFilter(JwtService jwtService) { this.jwtService = jwtService; }
  @Override
  protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
      throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    String bearer = null;
    if (header != null && header.startsWith("Bearer ")) bearer = header.substring(7);

    // For embedded editors (e.g. office web-apps) that can't easily send Authorization headers,
    // allow passing JWT via query param for a narrow set of endpoints (file download / office doc).
    if (bearer == null) {
      String uri = request.getRequestURI();
      String qp = request.getParameter("access_token");
      if (qp != null && !qp.isBlank() && (uri != null) && (uri.startsWith("/api/files/") || uri.startsWith("/api/documents/"))) {
        bearer = qp.trim();
      }
    }

    if (bearer != null) {
      try {
        JwtPrincipal principal = jwtService.parse(bearer);
        var auth = new UsernamePasswordAuthenticationToken(principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + principal.role().name())));
        SecurityContextHolder.getContext().setAuthentication(auth);
      } catch (Exception ignored) {
        SecurityContextHolder.clearContext();
      }
    }
    filterChain.doFilter(request, response);
  }
}
