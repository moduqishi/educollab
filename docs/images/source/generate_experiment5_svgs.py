from pathlib import Path

ROOT = Path('/Users/cake/toys/educollab/docs/images')
SRC = ROOT / 'source'
ROOT.mkdir(parents=True, exist_ok=True)
SRC.mkdir(parents=True, exist_ok=True)

FONT = 'font-family="PingFang SC, Microsoft YaHei, Noto Sans CJK SC, Arial, sans-serif"'


def svg_header(w, h):
    return [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">',
        '<defs>',
        '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">',
        '<path d="M 0 0 L 10 5 L 0 10 z" fill="#222"/>',
        '</marker>',
        '<style>',
        f'text {{ {FONT}; fill:#111; font-size:16px; }}',
        '.title { font-size:26px; font-weight:700; }',
        '.subtitle { font-size:16px; }',
        '.box { fill:white; stroke:#222; stroke-width:2; rx:8; ry:8; }',
        '.subbox { fill:#fafafa; stroke:#222; stroke-width:1.8; rx:6; ry:6; }',
        '.line { stroke:#222; stroke-width:2; fill:none; marker-end:url(#arrow); }',
        '.dash { stroke:#222; stroke-width:2; fill:none; stroke-dasharray:8 6; marker-end:url(#arrow); }',
        '.thin { stroke:#222; stroke-width:1.5; fill:none; }',
        '.caption { font-size:20px; font-weight:700; }',
        '.small { font-size:14px; }',
        '.tiny { font-size:12px; }',
        '</style>',
        '</defs>',
    ]


def box(x, y, w, h, text_lines, cls='box', font_size=16):
    parts = [f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}"/>']
    total = len(text_lines)
    start_y = y + h/2 - (total-1)*font_size*0.7/2
    for i, line in enumerate(text_lines):
        ty = start_y + i*font_size*1.25
        parts.append(f'<text x="{x+w/2}" y="{ty}" text-anchor="middle" dominant-baseline="middle" style="font-size:{font_size}px">{line}</text>')
    return parts


def text(x, y, content, cls='subtitle', anchor='start'):
    return [f'<text class="{cls}" x="{x}" y="{y}" text-anchor="{anchor}">{content}</text>']


def line(x1, y1, x2, y2, dashed=False):
    cls = 'dash' if dashed else 'line'
    return [f'<path class="{cls}" d="M {x1} {y1} L {x2} {y2}"/>']


def poly(points, dashed=False):
    cls = 'dash' if dashed else 'line'
    d = 'M ' + ' L '.join(f'{x} {y}' for x, y in points)
    return [f'<path class="{cls}" d="{d}"/>']


def write_svg(name, w, h, content):
    path = ROOT / name
    path.write_text('\n'.join(svg_header(w, h) + content + ['</svg>']), encoding='utf-8')


# 图5-1 项目结构图
content = []
content += text(40, 40, 'EduCollab 软件总体（结构）设计图集', 'title')
content += text(40, 72, '项目结构图 / 课程作业风格示意', 'subtitle')
content += box(460, 120, 220, 90, ['EduCollab', '课程-团队-项目协作平台'], 'box', 20)
children = [
    (90, 320, '前端子系统'),
    (285, 320, '后端子系统'),
    (480, 320, '协同文档子系统'),
    (675, 320, 'Git 服务子系统'),
    (870, 320, '文件存储子系统'),
    (220, 510, '管理子系统'),
    (740, 510, 'AI 子系统'),
]
for x, y, label in children:
    content += box(x, y, 180, 74, [label], 'subbox', 18)
    content += line(570, 210, x+90, y)
content += text(360, 650, '图5-1 EduCollab 系统项目结构图', 'caption')
write_svg('fig-5-1-educollab-project-structure.svg', 1180, 700, content)

# 图5-2 处理流程图
content = []
content += text(40, 40, 'EduCollab 系统总体处理流程图', 'title')
steps = [
    (70, 140, 170, 70, ['用户请求']),
    (290, 140, 170, 70, ['前端页面', 'React + Vite']),
    (510, 140, 170, 70, ['后端鉴权', 'JWT / API']),
    (730, 140, 170, 70, ['业务分发', '课程/团队/项目']),
    (950, 140, 170, 70, ['结果返回']),
]
for x, y, w, h, t in steps:
    content += box(x, y, w, h, t)
for i in range(len(steps)-1):
    x1 = steps[i][0]+steps[i][2]
    y1 = steps[i][1]+steps[i][3]/2
    x2 = steps[i+1][0]
    y2 = steps[i+1][1]+steps[i+1][3]/2
    content += line(x1, y1, x2, y2)
subs = [
    (180, 330, ['文档处理', 'Markdown 协同']),
    (420, 330, ['文件处理', '上传/移动/下载']),
    (660, 330, ['Git 处理', '分支/提交/树浏览']),
    (900, 330, ['通知与总结', '消息/报告/告警']),
]
for x, y, t in subs:
    content += box(x, y, 180, 78, t, 'subbox')
    content += line(815, 210, x+90, y)
resources = [
    (140, 520, ['MySQL', '业务数据']),
    (390, 520, ['文件系统', 'data/']),
    (640, 520, ['Git 裸仓库', 'repository/*.git']),
    (890, 520, ['协同服务', 'Hocuspocus']),
]
for x, y, t in resources:
    content += box(x, y, 180, 78, t, 'subbox')
for x, y, t in resources:
    content += line(x+90, 408, x+90, y)
content += text(330, 650, '图5-2 EduCollab 系统总体处理流程图', 'caption')
write_svg('fig-5-2-system-context.svg', 1180, 700, content)

# 图5-3 模块结构图
content = []
content += text(40, 40, 'EduCollab 系统模块结构图', 'title')
content += box(470, 90, 240, 82, ['EduCollab 业务系统'], 'box', 22)
mods = [
    (60, 250, ['管理员模块', '系统概览 / 内容治理']),
    (290, 250, ['教师模块', '课程 / 作业 / 反馈']),
    (520, 250, ['学生模块', '任务 / 讨论 / 协作']),
    (750, 250, ['项目协作模块', '项目 / 成员 / 总结']),
    (980, 250, ['文档模块', 'Markdown / Office']),
    (175, 470, ['Git 模块', '仓库 / 分支 / MR / Release']),
    (470, 470, ['存储模块', '文件 / 下载 / 目录管理']),
    (765, 470, ['AI 模块', '问答 / 辅助分析']),
]
for x, y, t in mods:
    content += box(x, y, 170, 84, t, 'subbox', 16)
    content += line(590, 172, x+85, y)
content += text(380, 640, '图5-3 EduCollab 系统模块结构图', 'caption')
write_svg('fig-5-3-module-breakdown.svg', 1180, 690, content)

# 图5-4 文档协同流程
content = []
content += text(40, 40, 'EduCollab 文档协同处理流程图', 'title')
boxes = [
    (70, 140, 160, 72, ['项目成员 A']),
    (70, 290, 160, 72, ['项目成员 B']),
    (320, 210, 190, 86, ['Markdown 文档页', '编辑区 + 预览区']),
    (600, 210, 200, 86, ['Collab Server', 'Hocuspocus / Yjs']),
    (910, 120, 180, 72, ['documents 表']),
    (910, 250, 180, 72, ['document_versions 表']),
    (910, 380, 180, 72, ['file_assets / .md 文件']),
]
for x, y, w, h, t in boxes:
    content += box(x, y, w, h, t)
content += line(230, 176, 320, 245)
content += line(230, 326, 320, 255)
content += line(510, 253, 600, 253)
content += line(700, 210, 1000, 192)
content += line(700, 253, 1000, 286)
content += line(700, 296, 1000, 416)
content += text(326, 190, '编辑/保存', 'small')
content += text(520, 235, '实时同步', 'small')
content += text(760, 184, '自动保存', 'small')
content += text(764, 278, '版本快照', 'small')
content += text(750, 407, '物理文件映射', 'small')
content += text(355, 560, '图5-4 EduCollab 文档协同处理流程图', 'caption')
write_svg('fig-5-4-document-collab-flow.svg', 1180, 610, content)

# 图5-5 Git 服务流程
content = []
content += text(40, 40, 'EduCollab Git 服务处理流程图', 'title')
items = [
    (60, 180, 170, 74, ['浏览器 / Git 客户端']),
    (300, 180, 170, 74, ['GitController']),
    (540, 180, 170, 74, ['GitService']),
    (780, 100, 200, 74, ['git_access_tokens', '访问令牌']),
    (780, 260, 200, 74, ['git_repositories', '仓库元数据']),
    (1020, 180, 120, 74, ['裸仓库', '*.git']),
]
for x, y, w, h, t in items:
    content += box(x, y, w, h, t)
content += line(230, 217, 300, 217)
content += line(470, 217, 540, 217)
content += line(710, 217, 1020, 217)
content += line(630, 180, 880, 174)
content += line(630, 254, 880, 297)
content += text(310, 160, 'REST / Smart HTTP', 'small')
content += text(555, 155, '仓库浏览/分支/提交', 'small')
content += text(830, 154, 'Basic Token 校验', 'small')
content += text(820, 352, '图5-5 EduCollab Git 服务处理流程图', 'caption', 'middle')
write_svg('fig-5-5-git-service-flow.svg', 1180, 420, content)

# 图5-6 ER 图
content = []
content += text(40, 40, 'EduCollab 核心数据库 E-R 图', 'title')
entities = [
    (60, 120, 180, 110, ['users', 'id / role / email']),
    (300, 120, 180, 110, ['courses', 'teacher_id']),
    (540, 120, 180, 110, ['teams', 'course_id / leader_id']),
    (780, 120, 180, 110, ['projects', 'team_id / course_id']),
    (1020, 120, 130, 110, ['tasks', 'project_id']),
    (180, 340, 200, 110, ['documents', 'project_id / file_asset_id']),
    (470, 340, 200, 110, ['file_assets', 'owner_type / owner_id']),
    (760, 340, 200, 110, ['git_repositories', 'project_id / slug']),
    (470, 520, 220, 110, ['project_activity_events', 'project_id / course_id / team_id']),
]
for x, y, w, h, t in entities:
    content += box(x, y, w, h, t, 'subbox')
rels = [
    ((240,175),(300,175),'1..n'),
    ((480,175),(540,175),'1..n'),
    ((720,175),(780,175),'1..n'),
    ((960,175),(1020,175),'1..n'),
    ((880,230),(860,340),'1..1'),
    ((860,175),(280,340),'1..n'),
    ((380,395),(470,395),'1..n'),
    ((570,450),(580,520),'1..n'),
]
for (x1,y1),(x2,y2),label in rels:
    content += line(x1,y1,x2,y2)
    content += text((x1+x2)/2, (y1+y2)/2 - 8, label, 'small', 'middle')
content += text(380, 675, '图5-6 EduCollab 核心数据库 E-R 图', 'caption')
write_svg('fig-5-6-er-diagram.svg', 1180, 720, content)

# 图5-7 部署拓扑
content = []
content += text(40, 40, 'EduCollab 网络部署拓扑图', 'title')
content += box(60, 220, 170, 80, ['Browser', '浏览器'])
content += box(300, 120, 190, 80, ['Frontend', 'React + Vite'])
content += box(300, 320, 190, 80, ['Collab Server', 'Hocuspocus'])
content += box(590, 220, 190, 80, ['Backend', 'Spring Boot'])
content += box(900, 80, 180, 76, ['MySQL'])
content += box(900, 190, 180, 76, ['File Storage', 'data/'])
content += box(900, 300, 180, 76, ['Git Bare Repos'])
content += box(900, 410, 180, 76, ['AI API', 'OpenAI-compatible'])
content += line(230, 245, 300, 160)
content += line(230, 275, 300, 360)
content += line(490, 160, 590, 245)
content += line(490, 360, 590, 275)
content += line(780, 245, 900, 118)
content += line(780, 245, 900, 228)
content += line(780, 245, 900, 338)
content += line(780, 275, 900, 448)
content += text(380, 144, '/api/*', 'small')
content += text(373, 347, 'ws://collab', 'small')
content += text(390, 258, '业务聚合', 'small')
content += text(412, 302, '协同持久化', 'small')
content += text(360, 560, '图5-7 EduCollab 网络部署拓扑图', 'caption')
write_svg('fig-5-7-deployment-topology.svg', 1180, 610, content)

# 图5-8 导航图
content = []
content += text(40, 40, 'EduCollab 界面结构导航图', 'title')
content += box(460, 80, 220, 74, ['登录页 / Login'])
content += box(460, 200, 220, 74, ['仪表盘 / Dashboard'])
content += line(570, 154, 570, 200)
navs = [
    (60, 360, ['课程', 'Classes']),
    (270, 360, ['团队', 'Teams']),
    (480, 360, ['项目', 'Projects']),
    (690, 360, ['文档', 'Documents']),
    (900, 360, ['管理员后台', 'Admin']),
]
for x, y, t in navs:
    content += box(x, y, 180, 78, t, 'subbox')
    content += line(570, 274, x+90, y)
subs = [
    (40, 530, ['课程概览/成员/团队/项目/作业/文件']),
    (270, 530, ['团队概览/成员/任务/项目/文件/总结']),
    (500, 530, ['项目概览/任务/讨论/文件/仓库/成员/发布']),
    (730, 530, ['Markdown 文档 / Office 文档 / 聚合文档页']),
]
for x, y, t in subs:
    content += box(x, y, 210, 96, t, 'subbox', 15)
content += line(150, 438, 145, 530)
content += line(360, 438, 375, 530)
content += line(570, 438, 605, 530)
content += line(780, 438, 835, 530)
content += text(360, 690, '图5-8 EduCollab 界面结构导航图', 'caption')
write_svg('fig-5-8-ui-navigation-overview.svg', 1180, 730, content)

# source index
(SRC / 'figures.txt').write_text('\n'.join([
    '实验五图纸源文件说明',
    '1. 本目录下 generate_experiment5_svgs.py 用于生成 docs/images/*.svg',
    '2. 输出图纸采用黑白线框课程作业风格，便于继续转为 Word/PDF。',
    '3. 如需改文字或布局，修改脚本后重新执行: python3 docs/images/source/generate_experiment5_svgs.py',
]), encoding='utf-8')
