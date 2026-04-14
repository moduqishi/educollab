package com.educollab.dto;
public class AiDtos { public record AiRequest(String prompt, String scenario) {} public record AiReply(String content, String provider, String model) {} }
