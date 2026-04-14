package com.educollab.service;

import com.educollab.model.*;
import com.educollab.repo.*;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {
    private final UserRepository userRepository;
    private final CourseRepository courseRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final TaskRepository taskRepository;
    private final DiscussionPostRepository discussionPostRepository;
    private final DiscussionReplyRepository discussionReplyRepository;
    private final DocumentRepository documentRepository;
    private final AssignmentRepository assignmentRepository;
    private final TeacherFeedbackRepository teacherFeedbackRepository;
    private final PasswordEncoder passwordEncoder;
    private final GitService gitService;

    public DataInitializer(UserRepository userRepository, CourseRepository courseRepository, TeamRepository teamRepository, TeamMemberRepository teamMemberRepository, ProjectRepository projectRepository, ProjectMemberRepository projectMemberRepository, TaskRepository taskRepository, DiscussionPostRepository discussionPostRepository, DiscussionReplyRepository discussionReplyRepository, DocumentRepository documentRepository, AssignmentRepository assignmentRepository, TeacherFeedbackRepository teacherFeedbackRepository, PasswordEncoder passwordEncoder, GitService gitService) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.teamRepository = teamRepository;
        this.teamMemberRepository = teamMemberRepository;
        this.projectRepository = projectRepository;
        this.projectMemberRepository = projectMemberRepository;
        this.taskRepository = taskRepository;
        this.discussionPostRepository = discussionPostRepository;
        this.discussionReplyRepository = discussionReplyRepository;
        this.documentRepository = documentRepository;
        this.assignmentRepository = assignmentRepository;
        this.teacherFeedbackRepository = teacherFeedbackRepository;
        this.passwordEncoder = passwordEncoder;
        this.gitService = gitService;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) return;
        UserEntity alex = user("Alex Rivera", "alex@educollab.local", UserRole.STUDENT, "alex");
        UserEntity sarah = user("Sarah Chen", "sarah@educollab.local", UserRole.STUDENT, "sarah");
        UserEntity teacher = user("Dr. James Wilson", "teacher@educollab.local", UserRole.TEACHER, "james");
        UserEntity liam = user("Liam Smith", "liam@educollab.local", UserRole.STUDENT, "liam");
        userRepository.saveAll(List.of(alex, sarah, teacher, liam));

        CourseEntity software = new CourseEntity();
        software.setName("软件工程");
        software.setTeacher(teacher);
        courseRepository.save(software);

        TeamEntity team = new TeamEntity();
        team.setName("云码工坊");
        team.setCourse(software);
        team.setLeader(alex);
        teamRepository.save(team);
        for (UserEntity user : List.of(alex, sarah, liam)) {
            TeamMemberEntity member = new TeamMemberEntity();
            member.setTeam(team);
            member.setUser(user);
            teamMemberRepository.save(member);
        }

        ProjectEntity codeProject = new ProjectEntity();
        codeProject.setTeam(team);
        codeProject.setCourse(software);
        codeProject.setName("AI Research Assistant");
        codeProject.setDescription("面向课程协作场景的 AI 作业协作平台开发。");
        codeProject.setType(ProjectType.CODE);
        codeProject.setStatus(ProjectStatus.ACTIVE);
        codeProject.setProgress(68);
        projectRepository.save(codeProject);
        for (UserEntity user : List.of(alex, sarah, liam)) {
            ProjectMemberEntity pm = new ProjectMemberEntity();
            pm.setProject(codeProject);
            pm.setUser(user);
            pm.setOwnerFlag(user.getId().equals(alex.getId()));
            projectMemberRepository.save(pm);
        }

        ProjectEntity nonCodeProject = new ProjectEntity();
        nonCodeProject.setTeam(team);
        nonCodeProject.setCourse(software);
        nonCodeProject.setName("Sustainable Campus Initiative");
        nonCodeProject.setDescription("零废弃校园提案与执行计划。");
        nonCodeProject.setType(ProjectType.NON_CODE);
        nonCodeProject.setStatus(ProjectStatus.ACTIVE);
        nonCodeProject.setProgress(54);
        projectRepository.save(nonCodeProject);
        for (UserEntity user : List.of(alex, teacher, liam)) {
            ProjectMemberEntity pm = new ProjectMemberEntity();
            pm.setProject(nonCodeProject);
            pm.setUser(user);
            pm.setOwnerFlag(user.getId().equals(liam.getId()));
            projectMemberRepository.save(pm);
        }

        TaskEntity t1 = task(codeProject, alex, "实现向量检索模块", "接入检索与索引流程", TaskStatus.IN_PROGRESS, TaskPriority.HIGH);
        TaskEntity t2 = task(codeProject, sarah, "迁移 Vue 工作台页面", "迁移原型页面与路由", TaskStatus.TODO, TaskPriority.MEDIUM);
        TaskEntity t3 = task(nonCodeProject, liam, "提交阶段调研报告", "汇总垃圾分类数据", TaskStatus.REVIEW, TaskPriority.HIGH);
        taskRepository.saveAll(List.of(t1, t2, t3));

        DiscussionPostEntity post = new DiscussionPostEntity();
        post.setProject(codeProject);
        post.setAuthor(sarah);
        post.setTitle("本周迭代拆分建议");
        post.setContent("建议先完成登录、项目、任务、文档闭环，再接入 Git 与 AI。") ;
        discussionPostRepository.save(post);
        DiscussionReplyEntity reply = new DiscussionReplyEntity();
        reply.setPost(post);
        reply.setAuthor(alex);
        reply.setContent("同意，先跑通学生端核心流程。") ;
        discussionReplyRepository.save(reply);

        DocumentEntity doc = new DocumentEntity();
        doc.setProject(codeProject);
        doc.setTitle("系统总体设计说明");
        doc.setExcerpt("前后端分离、协同文档与 JGit 仓库托管的一体化架构。");
        doc.setCollabKey("project-1-doc-1");
        doc.setCurrentContent("<h1>系统总体设计说明</h1><p>这是一个支持团队、项目、任务、文档、讨论、Git 与 AI 的课程协作平台。</p>");
        documentRepository.save(doc);

        AssignmentEntity assignment = new AssignmentEntity();
        assignment.setProject(codeProject);
        assignment.setTitle("阶段性演示包");
        assignment.setSummary("提交数据库设计、原型、代码仓库与演示录像。") ;
        assignment.setSubmissionUrl("https://educollab.local/submission/demo");
        assignmentRepository.save(assignment);

        TeacherFeedbackEntity feedback = new TeacherFeedbackEntity();
        feedback.setProject(codeProject);
        feedback.setTeacher(teacher);
        feedback.setScore(90);
        feedback.setContent("整体方向正确，继续补全文档版本恢复和教师端评分闭环。") ;
        teacherFeedbackRepository.save(feedback);

        gitService.ensureRepository(codeProject);
    }

    private UserEntity user(String name, String email, UserRole role, String seed) {
        UserEntity entity = new UserEntity();
        entity.setName(name);
        entity.setEmail(email);
        entity.setRole(role);
        entity.setAvatar("https://picsum.photos/seed/" + seed + "/100/100");
        entity.setPasswordHash(passwordEncoder.encode("Password123!"));
        return entity;
    }

    private TaskEntity task(ProjectEntity project, UserEntity assignee, String title, String description, TaskStatus status, TaskPriority priority) {
        TaskEntity task = new TaskEntity();
        task.setProject(project);
        task.setAssignee(assignee);
        task.setTitle(title);
        task.setDescription(description);
        task.setStatus(status);
        task.setPriority(priority);
        return task;
    }
}
