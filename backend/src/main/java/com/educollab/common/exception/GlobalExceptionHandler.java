package com.educollab.common.exception;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(ApiException.class)
  public ResponseEntity<Map<String, String>> handleApi(ApiException ex) { return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage())); }
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) { FieldError error = ex.getBindingResult().getFieldErrors().stream().findFirst().orElse(null); return ResponseEntity.badRequest().body(Map.of("message", error != null ? error.getDefaultMessage() : "参数错误")); }
  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<Map<String, String>> handleStatus(ResponseStatusException ex) {
    String msg = ex.getReason() != null ? ex.getReason() : ex.getMessage();
    return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", msg));
  }
  @ExceptionHandler(Exception.class)
  public ResponseEntity<Map<String, String>> handleOther(Exception ex) { return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("message", ex.getMessage())); }
}
