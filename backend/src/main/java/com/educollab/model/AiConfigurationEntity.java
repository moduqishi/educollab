package com.educollab.model;

import jakarta.persistence.*;

@Entity
@Table(name = "ai_configuration")
public class AiConfigurationEntity extends BaseEntity {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;

    @Column(nullable = false, length = 40) private String provider = "doubao";

    @Column(name = "base_url", nullable = false, length = 255) private String baseUrl = "https://ark.cn-beijing.volces.com/api/v3";

    @Column(name = "api_key", length = 500) private String apiKey;

    @Column(nullable = false, length = 100) private String model = "doubao-pro-32k";

    @Column(nullable = false) private boolean enabled = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getBaseUrl() { return baseUrl; }
    public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
    public String getApiKey() { return apiKey; }
    public void setApiKey(String apiKey) { this.apiKey = apiKey; }
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
}