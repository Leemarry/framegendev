"""Read-only local attachment inventory; render a labelled contact sheet."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
WECHAT = Path('E:/Amireux/xwechat_files/wxid_igwqg8vhz4xy22_1cfc/temp/RWTemp/2026-10/9e20f478899dc29eb19741386f9343c8')
FILES = [
    WECHAT / '9886988ad7cf191ca692ecac793e6c0b.jpg',
    WECHAT / '9d8d8758facbddae54eb7dfab7668ef6.jpg',
    WECHAT / '2484b2f1caa0c3be7207b61b5559c1e5.jpg',
    Path('E:/Amireux/Documents/Tencent Files/2806699104/nt_qq/nt_data/Pic/2026-10/Ori/4d129eaa7666f2c6dae7182fb7db71aa.png'),
    Path('C:/Users/Amireux/AppData/Local/Temp/codex-clipboard-c42b9be7-0627-4cc8-9452-c9c06649a1cf.png'),
    WECHAT / '096fb697b03211d10d224e88f5f019fe.jpg',
    WECHAT / '25e3f3990adf88920659b79868938420.jpg',
    WECHAT / '816522de92273aff93075c36471cf673.jpg',
]

if __name__ == '__main__':
    sheet = Image.new('RGB', (2400, 1700), '#191c1d')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 23)
    rows = []
    for index, path in enumerate(FILES):
        with Image.open(path) as source:
            source.load()
            rows.append({'index': index + 1, 'path': path.as_posix(), 'size': list(source.size)})
            thumb = ImageOps.contain(source.convert('RGB'), (570, 730))
        x, y = (index % 4) * 600, (index // 4) * 850
        draw.text((x + 15, y + 15), f'附件 {index + 1} · 用户提供的参考', fill='#ffffff', font=font)
        sheet.paste(thumb, (x + (600 - thumb.width) // 2, y + 65 + (730 - thumb.height) // 2))
    sheet.save(ROOT / 'reference-contact-sheet.jpg')
    (ROOT / 'reference-manifest.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(rows, ensure_ascii=False))
