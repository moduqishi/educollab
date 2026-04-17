package com.educollab;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(classes = EduCollabApplication.class)
@ActiveProfiles("test")
class EduCollabApplicationTests {
    @Test
    void contextLoads() {
    }
}
