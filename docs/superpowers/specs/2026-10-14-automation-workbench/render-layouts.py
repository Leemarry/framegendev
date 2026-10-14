"""Render deterministic layout proposals, not AI-generated product screenshots."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
BG, SIDE, PANEL, BORDER = '#24272c', '#191c1d', '#2b2e34', '#3b4048'
TEXT, MUTED, BLUE = '#e6e9ee', '#a1a8b5', '#5086ee'
COLORS = {'green': '#74c8a3', 'blue': '#83aafa', 'amber': '#e0b779', 'red': '#e78e93'}
FONT = 'C:/Windows/Fonts/msyh.ttc'
BOLD = 'C:/Windows/Fonts/msyhbd.ttc'


def font(size=18, bold=False):
    return ImageFont.truetype(BOLD if bold else FONT, size)


class Screen:
    def __init__(self, selected, title):
        self.image = Image.new('RGB', (1920, 1200), BG)
        self.d = ImageDraw.Draw(self.image)
        self.d.rectangle((0, 0, 325, 1199), fill=SIDE)
        self.d.line((325, 0, 325, 1200), fill=BORDER)
        self.text(26, 26, '‹   雨夜来信', 23, bold=True)
        self.text(26, 73, '项目工作区', 15, MUTED)
        self.rule(25, 105, 300)
        entries = ['制作总览', '剧本', '角色', '场景', '道具', '分镜', '资料',
                   '批量生产', '无限画布', '剪辑工作台']
        for i, label in enumerate(entries):
            y = 129 + i * 51
            if label == selected:
                self.box(16, y - 7, 309, y + 36, fill='#213454', outline=None, radius=8)
            self.d.rectangle((30, y + 7, 43, y + 20), outline=BLUE if label == selected else MUTED, width=2)
            self.text(59, y, label, 19, TEXT if label == selected else MUTED,
                      bold=label == selected)
        self.text(57, 688, '第 01 集', 16, MUTED)
        self.text(57, 720, 'SH001 – SH006', 15, MUTED)
        for i, label in enumerate(['项目素材库', '生成历史', '项目设置']):
            self.text(29, 972 + i * 46, label, 18, MUTED)
        self.rule(25, 1130, 300)
        self.text(28, 1152, '本地用户', 18)
        self.text(355, 20, '雨夜来信  /  ' + title, 18, bold=True)
        self.badge(1585, 17, '本地绘制 · 设计示意', 'amber', 300)
        self.rule(325, 62, 1920)
        self.text(355, 1158, '示例项目与状态，仅说明设计；不代表功能已实现或生成成功。', 16, MUTED)

    def text(self, x, y, value, size=18, color=TEXT, bold=False):
        self.d.text((x, y), value, fill=color, font=font(size, bold))

    def box(self, x, y, x2, y2, fill=PANEL, outline=BORDER, radius=9):
        self.d.rounded_rectangle((x, y, x2, y2), radius=radius, fill=fill, outline=outline, width=1)

    def rule(self, x, y, x2):
        self.d.line((x, y, x2, y), fill=BORDER)

    def button(self, x, y, label, width=150, primary=False):
        self.box(x, y, x + width, y + 44, fill=BLUE if primary else PANEL, radius=7)
        self.text(x + 17, y + 9, label, 17, bold=primary)

    def badge(self, x, y, label, tone='blue', width=None):
        width = width or int(self.d.textlength(label, font=font(15))) + 25
        self.box(x, y, x + width, y + 29, fill='#252d39', outline=None, radius=5)
        self.text(x + 12, y + 4, label, 15, COLORS[tone])

    def placeholder(self, x, y, w, h, label):
        self.box(x, y, x + w, y + h, fill='#20242b', outline='#465066', radius=6)
        self.d.rectangle((x + w / 2 - 17, y + h / 2 - 24,
                          x + w / 2 + 17, y + h / 2 + 3), outline='#63718b', width=2)
        self.text(x + 15, y + h - 30, label, 14, MUTED)

    def tabs(self, x, y, selected):
        for i, label in enumerate(['分镜列表', '无限画布', '时间轴']):
            self.text(x + i * 145, y, label, 18, TEXT if label == selected else MUTED)
            if label == selected:
                self.d.line((x + i * 145, y + 34, x + i * 145 + 95, y + 34), fill=BLUE, width=3)

    def save(self, name):
        target = ROOT / name
        if target.exists():
            raise FileExistsError(target)
        self.image.save(target)
        print(target)


def overview():
    s = Screen('制作总览', '制作总览')
    s.text(365, 91, '从创意到漫剧', 32, bold=True)
    s.text(365, 139, '查看本集产物、任务进展和需要你处理的问题', 18, MUTED)
    s.button(1520, 99, '查看计划', 145)
    s.button(1682, 99, '继续生产', 190, True)
    s.box(365, 190, 1494, 321)
    s.text(389, 211, '制作需求', 15, MUTED)
    s.text(389, 242, '制作一集 60 秒的都市悬疑漫剧', 26, bold=True)
    for x, label in [(389, '16:9'), (471, '日系动画'), (593, '1 集')]:
        s.badge(x, 281, label)
    s.box(1515, 190, 1873, 1125)
    s.text(1539, 213, '生产任务', 23, bold=True)
    s.rule(1539, 257, 1848)
    tasks = [('角色参考图', '已完成', 'green'), ('雨巷场景', '生成中', 'blue'),
             ('镜头 SH004', '待检查', 'amber'), ('镜头 SH005', '失败', 'red')]
    for i, (title, state, tone) in enumerate(tasks):
        y = 282 + i * 114
        s.text(1540, y, title, 18)
        s.badge(1540, y + 37, state, tone)
        s.rule(1540, y + 94, 1848)
    s.text(1540, 772, '服务暂不可用', 17, COLORS['red'])
    s.button(1540, 812, '重试此项', 174)
    s.text(1540, 928, '已确认资产保持锁定', 17, COLORS['green'])
    s.text(1540, 970, '预算上限与运行范围', 17)
    s.text(1540, 1003, '在生产计划中设置', 16, MUTED)
    s.text(365, 351, '本集制作阶段', 21, bold=True)
    stages = [('剧本', '已完成'), ('设定', '已完成'), ('分镜', '已完成'),
              ('图片', '生成中'), ('视频', '待开始'), ('剪辑', '待开始')]
    for i, (label, state) in enumerate(stages):
        x = 365 + i * 189
        s.box(x, 396, x + 171, 487)
        s.text(x + 17, 411, f'{i + 1:02}  {label}', 20, bold=True)
        tone = 'green' if i < 3 else 'blue' if i == 3 else 'amber'
        s.text(x + 17, 448, state, 15, COLORS[tone])
    for i, (label, value, tone) in enumerate([('已准备产物', '8 / 12', 'green'),
                                            ('待检查', '2 项', 'amber'),
                                            ('失败任务', '1 项', 'red')]):
        x = 365 + i * 383
        s.box(x, 515, x + 363, 621)
        s.text(x + 20, 533, label, 16, MUTED)
        s.text(x + 20, 562, value, 28, COLORS[tone], True)
    s.text(365, 652, '本集生产', 21, bold=True)
    for i, (label, state, tone) in enumerate([('角色设定', '已确认', 'green'),
                                             ('场景素材', '生成中', 'blue'),
                                             ('分镜镜头', '待生成', 'amber')]):
        x = 365 + i * 383
        s.box(x, 697, x + 363, 919)
        s.placeholder(x + 15, 712, 333, 133, '素材预览位置')
        s.text(x + 18, 862, label, 19, bold=True)
        s.badge(x + 243, 859, state, tone)
    s.box(365, 949, 1494, 1125)
    s.text(387, 967, '项目文件', 19, bold=True)
    s.text(389, 1004, 'work / 剧本 / EP001.md     work / 角色 / CHAR001.md', 17, MUTED)
    s.text(389, 1041, 'work / 分镜 / EP001.md     library / images / …', 17, MUTED)
    s.text(389, 1082, '打开文件位置                         核对缺失产物', 16, COLORS['blue'])
    s.save('01-production-overview-layout.png')


def batch():
    s = Screen('批量生产', '第 01 集 · 批量生产')
    s.text(365, 92, '第 01 集 · 批量生产', 30, bold=True)
    s.tabs(365, 145, '分镜列表')
    s.button(1170, 101, '生成缺失素材', 202, True)
    s.button(1388, 101, '重试失败项', 178)
    s.button(1582, 101, '暂停队列', 163)
    s.text(365, 204, '已确认资产不重复生成；只运行选中的镜头。', 17, COLORS['green'])
    s.box(365, 244, 1439, 1005)
    headers = [(389, '选择'), (465, '镜头'), (595, '画面'), (835, '目标时长'),
               (961, '角色 / 场景'), (1234, '状态')]
    for x, label in headers:
        s.text(x, 262, label, 16, MUTED)
    states = ['已确认', '已确认', '生成中', '待检查', '失败', '待生成']
    descriptions = ['雨夜城市全景', '人物回头', '走入雨巷', '信封特写', '发现线索', '转场至街口']
    tones = ['green', 'green', 'blue', 'amber', 'red', 'amber']
    for i, (state, desc) in enumerate(zip(states, descriptions)):
        y = 306 + i * 112
        if i == 3:
            s.box(374, y - 4, 1430, y + 103, fill='#233653', outline=BLUE, radius=4)
        s.d.rectangle((396, y + 41, 414, y + 59), outline=BLUE if i == 3 else MUTED, width=2)
        if i == 3:
            s.text(398, y + 32, '✓', 21, COLORS['blue'])
        s.text(465, y + 29, f'SH{i + 1:03}', 20, bold=True)
        s.placeholder(595, y + 10, 214, 83, desc)
        s.text(853, y + 31, f'{[2, 1, 3, 2, 4, 2][i]} 秒', 19)
        s.text(961, y + 19, 'CHAR001', 16)
        s.text(961, y + 52, f'LOC00{1 if i == 0 else 2}', 16, MUTED)
        s.badge(1234, y + 30, state, tones[i])
        if i != 3:
            s.rule(383, y + 106, 1420)
    s.text(389, 1040, '6 个镜头  ·  2 已确认  ·  1 生成中  ·  1 待检查  ·  1 失败  ·  1 待生成', 16, MUTED)
    s.box(1461, 244, 1873, 1125)
    s.text(1483, 263, '镜头 SH004', 23, bold=True)
    s.placeholder(1483, 312, 366, 194, '所选候选画面预览')
    for y, label, value in [(536, '目标时长', '2 秒'), (581, '素材时长', '5 秒'),
                             (626, '取用片段', '00:01 – 00:03')]:
        s.text(1483, y, label, 17, MUTED)
        s.text(1630, y, value, 17)
    s.rule(1483, 675, 1849)
    s.text(1483, 694, '画面描述', 17, MUTED)
    s.box(1483, 732, 1849, 823, fill='#20242b')
    s.text(1498, 747, '雨水落在信封上，', 17)
    s.text(1498, 781, '镜头缓慢靠近。', 17)
    s.badge(1483, 850, '角色 CHAR001', 'green', 168)
    s.badge(1665, 850, '场景 LOC002', 'amber', 178)
    s.text(1483, 904, '当前采用 v2   /   候选 v3 待检查', 16, MUTED)
    s.button(1483, 951, '在画布调整', 366)
    s.button(1483, 1011, '重新生成此镜头', 366, True)
    s.save('02-batch-storyboard-layout.png')


def canvas():
    s = Screen('无限画布', '第 01 集 / 镜头 SH004')
    s.text(365, 90, '第 01 集 / 镜头 SH004', 28, bold=True)
    s.tabs(365, 144, '无限画布')
    s.button(1395, 99, '自动排列', 150)
    s.button(1560, 99, '返回分镜', 150)
    s.d.rectangle((346, 203, 1461, 1125), fill='#1e2228')
    for x in range(360, 1460, 24):
        for y in range(218, 1122, 24):
            s.d.ellipse((x, y, x + 1, y + 1), fill='#3a414c')
    s.text(376, 224, '只查看并调整当前镜头的生产关系', 17, MUTED)
    # Only v2 is adopted; v3 remains a candidate and has no output edge.
    for points, color in [([(622, 421), (650, 421), (650, 520), (684, 520)], COLORS['green']),
                           ([(622, 681), (650, 681), (650, 560), (684, 560)], COLORS['amber']),
                           ([(962, 536), (1007, 536), (1007, 423), (1046, 423)], COLORS['blue']),
                           ([(1185, 520), (1185, 556)], COLORS['blue']),
                           ([(963, 536), (991, 536), (991, 819), (684, 819)], COLORS['amber'])]:
        s.d.line(points, fill=color, width=3)

    def node(x, y, w, h, title, state, tone, selected=False):
        s.box(x, y, x + w, y + h, fill=PANEL, outline=BLUE if selected else BORDER)
        if selected:
            s.d.rounded_rectangle((x, y, x + w, y + h), radius=9, outline=BLUE, width=3)
        s.text(x + 16, y + 16, title, 18, bold=True)
        s.badge(x + 16, y + 49, state, tone)
        for cx, cy in [(x, y + h / 2), (x + w, y + h / 2)]:
            s.d.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), fill=COLORS[tone])

    node(374, 312, 248, 218, '角色 · CHAR001', '已锁定', 'green')
    s.placeholder(390, 402, 216, 110, '角色参考图')
    node(374, 572, 248, 218, '场景 · LOC002', '已确认', 'amber')
    s.placeholder(390, 662, 216, 110, '雨巷场景图')
    node(684, 445, 278, 184, '镜头描述 · SH004', '采用中', 'blue')
    s.text(700, 536, '雨水落在信封上，', 17)
    s.text(700, 571, '缓慢推近。', 17)
    node(1046, 312, 278, 208, '关键帧 · v2', '当前采用', 'green')
    s.placeholder(1062, 402, 246, 98, '已采用的关键帧')
    node(1046, 557, 278, 208, '视频片段', '关联 v2', 'blue')
    s.placeholder(1062, 647, 246, 62, '视频预览位置')
    s.text(1062, 729, '素材 5 秒 / 取用 2 秒', 16, MUTED)
    node(684, 716, 278, 234, '候选画面 · v3', '待检查', 'amber', True)
    s.placeholder(700, 806, 246, 67, '本次调整的新版本')
    s.button(700, 890, '采用此版', 246, True)
    s.button(374, 1048, '−      80%      +', 210)
    s.text(624, 1060, '仅处理 SH004；其他镜头保持锁定', 16, MUTED)
    s.box(1481, 203, 1873, 1125)
    s.text(1504, 227, '候选画面 v3', 24, bold=True)
    s.badge(1504, 275, '待检查', 'amber')
    s.text(1504, 330, '画面描述', 17, MUTED)
    s.box(1504, 371, 1849, 470, fill='#20242b')
    s.text(1518, 386, '信封主体更清晰，', 17)
    s.text(1518, 424, '减少背景霓虹干扰。', 17)
    s.text(1504, 510, '参考角色    CHAR001', 18)
    s.text(1504, 554, '参考场景    LOC002', 18)
    s.rule(1504, 611, 1849)
    s.text(1504, 634, '修改影响', 21, bold=True)
    for y, label, tone in [(685, '镜头 SH004', 'blue'), (730, '关联视频需更新', 'amber'),
                            (775, '其他镜头保持锁定', 'green')]:
        s.text(1504, y, label, 18, COLORS[tone])
    s.text(1504, 845, '采用后回写分镜引用；', 16, MUTED)
    s.text(1504, 877, '下游任务标记待更新。', 16, MUTED)
    s.button(1504, 950, '采用此版', 345, True)
    s.button(1504, 1010, '保留当前版本', 345)
    s.save('03-infinite-canvas-layout.png')


if __name__ == '__main__':
    overview()
    batch()
    canvas()
