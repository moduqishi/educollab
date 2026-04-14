# EduCollab（课程答辩可交付版）

EduCollab 是一个面向课程团队协作的完整项目，当前仓库已彻底切换为新架构：

- `/Users/cake/toys/educollab/frontend`：Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus
- `/Users/cake/toys/educollab/backend`：Spring Boot 3 + Spring Security + JWT + JPA + MySQL + WebSocket + JGit
- `/Users/cake/toys/educollab/collab-server`：Hocuspocus + Yjs 实时协同文档服务

> 已明确移除会议模块：无会议页面、无会议表、无会议 AI、无会议导航残留。

## 当前交付范围

### 学生端闭环
- 登录 / 注册 / 退出 / 鉴权守卫
- 团队创建、成员邀请、成员展示
- 项目创建、项目列表、项目详情
- 任务新增 / 编辑 / 分配 / 状态流转
- 讨论发帖 / 回复
- 文档列表 / 详情 / 自动保存 / 版本快照 / 版本恢复
- 文件上传 / 下载 / 归属绑定
- 通知列表、未读数、标记已读
- 代码项目 Repository / Merge Request / Release 基础流程
- AI 助手真实调用后端模型接口

### 教师端基础能力
- 课程项目总览
- 项目监督
- 成员贡献统计
- 作业查看
- 反馈提交与评分

### 后端真实能力
- MySQL 持久化实体：
  `users`、`courses`、`teams`、`team_members`、`projects`、`project_members`、
  `tasks`、`task_comments`、`discussion_posts`、`discussion_replies`、
  `documents`、`document_versions`、`file_assets`、`notifications`、
  `assignments`、`teacher_feedback`、`git_repositories`、`merge_requests`、
  `project_releases`、`ai_usage_logs`
- REST API：
  `/api/auth/*`、`/api/users/*`、`/api/teams/*`、`/api/projects/*`、
  `/api/tasks/*`、`/api/discussions/*`、`/api/documents/*`、
  `/api/files/*`、`/api/notifications/*`、`/api/teacher/*`、
  `/api/git/*`、`/api/ai/*`
- 文档协同：Yjs 实时同步 + Spring Boot 文档元数据/版本管理
- Git：JGit 初始化仓库、分支、提交历史、文件树、MR、Release
- AI：后端通过环境变量接入真实大模型；未配置 Key 时明确报错，不回退假答案

## 默认演示账号

- 学生：`alex@educollab.local` / `Password123!`
- 教师：`teacher@educollab.local` / `Password123!`

这些初始数据由 `/Users/cake/toys/educollab/backend/src/main/java/com/educollab/service/DataInitializer.java` 自动写入。

## 本地开发启动

### 1）准备环境变量

```bash
cd /Users/cake/toys/educollab
cp .env.example .env
```

至少需要确认：

- `DB_URL`
- `DB_USERNAME`
- `DB_PASSWORD`
- `JWT_SECRET`
- `AI_BASE_URL`
- `AI_API_KEY`
- `AI_MODEL`
- `VITE_API_BASE_URL`
- `VITE_COLLAB_BASE_URL`

### 2）启动 MySQL

你可以自行准备 MySQL 8，也可以直接用 Docker：

```bash
cd /Users/cake/toys/educollab
docker compose up -d mysql
```

### 3）启动后端

```bash
cd /Users/cake/toys/educollab/backend
mvn spring-boot:run
```

后端默认地址：`http://localhost:8080`

### 4）启动协同服务

```bash
cd /Users/cake/toys/educollab/collab-server
npm install
npm run dev
```

协同服务默认地址：`ws://localhost:1234`

### 5）启动前端

```bash
cd /Users/cake/toys/educollab/frontend
npm install
npm run dev
```

前端默认地址：`http://localhost:5173`

## 纯本机一键启动

如果你不使用 Docker，可以直接走本机模式：

```bash
cd /Users/cake/toys/educollab
chmod +x scripts/*.sh
./scripts/dev-local-up.sh
```

停止：

```bash
cd /Users/cake/toys/educollab
./scripts/dev-local-down.sh
```

说明：

- 依赖本机已安装：MySQL、Node.js、npm、Java 21、Maven
- 若 MySQL 未启动，先执行：`brew services start mysql`
- 首次启动日志位于：`/Users/cake/toys/educollab/.local-run`

## Docker Compose 一键演示

仓库提供了完整 Compose：

```bash
cd /Users/cake/toys/educollab
cp .env.example .env
docker compose up --build
```

启动后默认访问：

- 前端：[http://localhost:5173](http://localhost:5173)
- 后端：[http://localhost:8080](http://localhost:8080)
- 协同服务：`ws://localhost:1234`
- MySQL：`localhost:3306`

## 测试与校验

### 前端

```bash
cd /Users/cake/toys/educollab/frontend
npm run build
npx vitest run
```

### 后端

```bash
cd /Users/cake/toys/educollab/backend
mvn -Dmaven.repo.local=/tmp/educollab-m2 test
```

## 课程答辩建议演示路径

建议按这个顺序演示：

1. 学生登录，进入 Dashboard
2. 创建团队、创建项目
3. 进入项目详情，演示任务、讨论、成员
4. 打开文档页，双端实时编辑、自动保存、查看历史版本并恢复
5. 打开 Repository，演示分支、提交、MR、Release
6. 打开通知页，查看未读与已读
7. 切换教师账号，查看项目总览、贡献、评分与反馈
8. 打开 AI 助手，展示真实模型生成结果

## 目录说明

```text
/Users/cake/toys/educollab
├── frontend/        # Vue 3 前端
├── backend/         # Spring Boot 后端
├── collab-server/   # Hocuspocus 协同服务
├── docker-compose.yml
└── .env.example
```
