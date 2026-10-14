"""Local UI proposals with labelled reference crops; no AI generation or app writes."""
from pathlib import Path
import runpy
from PIL import Image, ImageOps
from references import FILES

ROOT = Path(__file__).resolve().parent
HELPERS = runpy.run_path(str(ROOT / 'render-layouts.py'))
Screen, BG, SIDE, MUTED, BLUE = (HELPERS[name] for name in ['Screen', 'BG', 'SIDE', 'MUTED', 'BLUE'])


class Proposal(Screen):
    def __init__(self, selected, title):
        super().__init__(selected, title)
        self.d.rectangle((326, 0, 1500, 61), fill=BG)
        self.text(355, 20, '示例漫剧项目  /  ' + title, 18, bold=True)
        self.d.rectangle((0, 0, 324, 1199), fill=SIDE)
        self.text(25, 24, '‹   示例漫剧项目', 22, bold=True)
        self.text(25, 75, '文档与素材', 15, MUTED)
        for index, name in enumerate(['剧本', '角色', '场景', '道具', '分镜', '资料']):
            y = 134 + index * 95
            self.d.line([(23, y + 9), (29, y + 15), (35, y + 9)], fill=MUTED, width=2)
            self.text(55, y, name, 19, bold=True)
            if name == selected:
                self.box(14, y + 32, 310, y + 70, fill='#213454', outline=None)
            self.text(53, y + 40, '第 01 集' if name in ['剧本', '分镜'] else name + '设定', 17,
                      BLUE if name == selected else MUTED)
        self.rule(24, 924, 300)
        for i, label in enumerate(['项目素材库', '生成历史', '项目设置']):
            self.text(27, 954 + i * 51, label, 18, MUTED)
        self.text(26, 1150, '本地用户', 17)
        self.d.rectangle((325, 1140, 1919, 1199), fill=BG)
        self.text(353, 1155, '本地设计示意 v2 · 图像为用户附件 / toonflowLocal 参考，状态与文案均为示例。', 16, MUTED)

    def photo(self, x, y, w, h, source='girl'):
        if source == 'girl':
            path, crop = ROOT / 'toonflow-live-nodes.png', (535, 325, 794, 470)
        elif source == 'girl-alt':
            path, crop = ROOT / 'toonflow-live-nodes.png', (900, 437, 1160, 581)
        else:
            path, crop = FILES[6], (945, 190, 1285, 640)
        with Image.open(path) as original:
            picture = ImageOps.fit(original.crop(crop).convert('RGB'), (w, h)) if source != 'sheet' else ImageOps.contain(original.crop(crop).convert('RGB'), (w, h))
        self.box(x, y, x + w, y + h, fill='#eef0f4', radius=5)
        self.image.paste(picture, (x + (w - picture.width) // 2, y + (h - picture.height) // 2))
        self.box(x + 7, y + h - 28, x + 133, y + h - 5, fill='#191c1d', outline=None, radius=4)
        self.text(x + 13, y + h - 27, '参考图片示例', 13, '#ffffff')

    def field(self, x, y, w, label, value, h=60):
        self.text(x, y, label, 15, MUTED)
        self.box(x, y + 27, x + w, y + h + 27, fill='#22252b')
        self.text(x + 16, y + 43, value, 18)

    def save(self, name):
        # These fixed task-owned v2 files can be regenerated during visual QA.
        target = ROOT / name
        self.image.save(target)
        print(target)


def linked_character():
    s = Proposal('角色', '角色设定')
    s.text(363, 89, '角色设定', 28, bold=True)
    s.text(363, 139, '写好角色描述，选择制作模板，图片回到同一个角色。', 18, MUTED)
    s.button(1508, 90, '全选', 105)
    s.button(1630, 90, '批量生成', 236, True)
    s.rule(351, 188, 1885)
    s.text(372, 225, '示例角色', 30, bold=True)
    s.badge(562, 232, 'CHAR-001', width=110)
    s.text(373, 282, '短发，白色上衣；神情自然，手持红色气球。', 21)
    s.text(373, 320, '角色描述只写人物设定；角度、排版和约束由模板补充。', 17, MUTED)
    s.rule(373, 370, 1264)
    s.text(373, 403, '制作方式', 21, bold=True)
    for x, label, primary, width in [(373, '标准图', False, 130), (519, '三视图', True, 130),
                                      (665, '六视图', False, 130), (811, '表情', False, 116),
                                      (943, '服装', False, 116)]:
        s.button(x, 449, label, width, primary)
    s.text(373, 517, '三视图：正面 / 侧面 / 背面，同一服装与比例。', 18, MUTED)
    s.box(373, 572, 1265, 700, fill='#252d39')
    s.photo(389, 588, 156, 87)
    s.text(566, 591, '主脸参考', 19, bold=True)
    s.badge(1080, 590, '已确认（示例）', 'green', 165)
    s.text(566, 633, '扩展视角自动引用已确认的主脸与当前服装。', 17, MUTED)
    s.text(373, 744, '服装与约束', 21, bold=True)
    s.field(373, 792, 427, '服装', '白色上衣 · W01')
    s.field(833, 792, 431, '风格', '继承项目风格')
    s.text(373, 926, '查看完整提示词  ›       生成记录  ›', 17, BLUE)
    s.rule(373, 983, 1264)
    s.text(373, 1014, '使用此角色的镜头', 18, bold=True)
    s.badge(373, 1060, 'SH002', width=102)
    s.badge(492, 1060, 'SH004', width=102)
    s.text(629, 1065, '点击查看对应分镜', 16, MUTED)
    s.box(1321, 211, 1884, 1115)
    s.text(1342, 231, '示例角色 · 图片', 21, bold=True)
    s.text(1342, 279, '主图      多视角      表情      服装', 17, MUTED)
    s.d.line((1342, 309, 1398, 309), fill=BLUE, width=3)
    s.photo(1342, 329, 520, 290)
    s.text(1342, 638, '当前采用 · 标准图（示例）', 18)
    s.button(1342, 686, '生成图片', 520, True)
    s.rule(1342, 754, 1861)
    s.text(1342, 781, '三视图与设定展示', 19, bold=True)
    s.photo(1342, 826, 222, 210, 'sheet')
    s.text(1589, 839, '独立角度图', 18)
    s.text(1589, 881, '用于后续镜头引用', 16, MUTED)
    s.text(1589, 936, '排版设定图', 18)
    s.text(1589, 976, '用于查看与分享', 16, MUTED)
    s.text(1342, 1067, '生成结果留作候选，采用后更新引用。', 16, MUTED)
    s.save('04-character-linkage-v2.png')


def storyboard():
    s = Proposal('分镜', '第 01 集 · 分镜列表')
    s.text(361, 90, '第 01 集', 28, bold=True)
    s.tabs(361, 145, '分镜列表')
    s.button(1210, 91, '导入镜头脚本', 204)
    s.button(1431, 91, 'AI 拆分镜头', 188)
    s.button(1635, 91, '生成选中项', 232, True)
    s.text(361, 205, '点击字段即可修改，镜头之间可插入。', 18, MUTED)
    s.text(1492, 205, '6 个镜头 · 11.2 秒（示例）', 17, MUTED)
    s.box(355, 250, 1885, 1091)
    for x, label in [(375, '选择'), (464, '镜头 / 画面'), (708, '画面与动作'), (1195, '时长'), (1330, '制作方式'), (1530, '引用'), (1755, '状态')]:
        s.text(x, 271, label, 16, MUTED)
    rows = [
        ('SH001', '女孩站在花园里', '全景 · 环境交代', '0.5', '图片停留', '场景A', '待生成'),
        ('SH002', '抬手举起红气球', '中景 · 轻轻抬手', '2.5', '图生视频', '角色A / 场景A', '待生成'),
        ('SH003', '视线看向画面右侧', '近景 · 缓慢推近', '3.5', '图片轻运动', '角色A', '待生成'),
        ('SH004', '侧身回头看向镜头', '近景 · 画面保持', '1.7', '图片停留', '角色A / 场景A', '待检查'),
        ('SH005', '气球飘向画面上方', '特写 · 视频取用', '2.0', '视频裁切', '道具A', '待生成'),
        ('SH006', '结尾字幕卡', '字幕画面', '1.0', '图片停留', '—', '待生成'),
    ]
    for i, (shot, action, framing, duration, mode, refs, state) in enumerate(rows):
        y = 329 + i * 119
        if i == 3:
            s.d.rectangle((356, y - 9, 1884, y + 103), fill='#29364b')
        s.box(384, y + 34, 403, y + 53, fill=BLUE if i == 3 else BG, radius=3)
        if i in [1, 3]:
            s.photo(454, y + 8, 138, 78, 'girl-alt' if i == 3 else 'girl')
        else:
            s.placeholder(454, y + 8, 138, 78, '待生成')
        s.text(605, y + 29, shot, 17, bold=True)
        s.text(708, y + 18, action, 20)
        s.text(708, y + 58, framing, 16, MUTED)
        s.box(1194, y + 17, 1282, y + 66, fill='#22252b', radius=5)
        s.text(1208, y + 28, duration + 's', 19)
        s.text(1330, y + 31, mode + '  ›', 17)
        s.text(1530, y + 31, refs, 16, MUTED)
        s.badge(1753, y + 27, state, 'amber', 107)
        if i < 5:
            s.rule(439, y + 104, 1863)
    s.text(361, 1110, '＋ 添加镜头', 18, BLUE)
    s.text(1090, 1110, 'SH004：用一张图片停留 1.7 秒，可在画布调整。', 17, MUTED)
    s.save('05-editable-storyboard-v2.png')


def canvas():
    s = Proposal('分镜', '第 01 集 · 无限画布')
    s.tabs(362, 91, '无限画布')
    s.button(1279, 85, '添加素材', 165)
    s.button(1462, 85, '生成选中项', 199, True)
    s.button(1678, 85, '返回镜头', 190)
    for x in range(346, 1905, 22):
        for y in range(167, 1107, 22):
            s.d.ellipse((x, y, x + 1, y + 1), fill='#454b56')
    s.text(370, 180, 'SH004 · 侧身回头 · 图片停留 1.7s', 22, bold=True)
    s.text(371, 216, '选中图片后展开编辑，未选中的素材保持简洁。', 17, MUTED)
    # A light reference edge; canvas coordinates have no effect on edit duration.
    points = []
    for i in range(101):
        t = i / 100
        points.append(((1-t)**3*710 + 3*(1-t)**2*t*752 + 3*(1-t)*t*t*752 + t**3*789,
                       (1-t)**3*494 + 3*(1-t)**2*t*494 + 3*(1-t)*t*t*476 + t**3*476))
    s.d.line(points, fill='#759ad6', width=2)
    s.box(376, 301, 710, 636)
    s.text(394, 315, '角色A · 主脸参考', 18, bold=True)
    s.photo(393, 355, 300, 169)
    s.text(395, 548, '已确认 · F00（示例）', 16)
    s.text(395, 593, '点击查看角色设定', 16, BLUE)
    s.box(789, 302, 1397, 655, outline=BLUE)
    s.text(808, 315, 'SH004 · 当前采用 v2（示例）', 18, bold=True)
    s.photo(802, 351, 582, 287, 'girl-alt')
    s.box(818, 260, 1368, 296, fill='#303640')
    s.text(831, 267, '放大     局部重绘     多角度     历史     替换图片', 15)
    s.box(789, 673, 1397, 950, outline=BLUE)
    s.badge(806, 688, '角色A · F00', width=153)
    s.badge(973, 688, '场景A', width=110)
    s.text(807, 740, '保留角色与服装，调整回头的角度。', 19)
    s.text(807, 784, '模板：镜头关键帧          完整提示词  ›', 16, MUTED)
    s.rule(808, 826, 1378)
    s.text(807, 851, '图片模型  ›     16:9  ›', 17, MUTED)
    s.button(1124, 843, '生成新候选', 253, True)
    s.text(807, 916, '制作方式：图片停留       镜头时长：1.7s', 17)
    s.box(1443, 390, 1872, 768)
    s.text(1460, 407, '候选对比位置 · v3', 18, bold=True)
    s.photo(1456, 446, 403, 226)
    s.text(1461, 691, '实际有结果时展示，原采用版本保留。', 15, MUTED)
    s.button(1460, 719, '采用这个版本', 392)
    s.box(1438, 936, 1872, 1026, fill='#252d39')
    s.text(1458, 951, '采用后更新 SH004 的图片引用', 18)
    s.text(1458, 986, '下游片段需更新时给出提示', 16, MUTED)
    s.box(372, 1052, 765, 1109)
    s.text(391, 1069, '选择    手工具    连线    适应视图    80%', 17)
    s.text(819, 1072, 'SH001   SH002   SH003   [ SH004 ]   SH005   SH006', 18, MUTED)
    s.save('06-media-canvas-v2.png')


if __name__ == '__main__':
    linked_character()
    storyboard()
    canvas()
