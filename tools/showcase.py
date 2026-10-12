from PIL import Image, ImageDraw, ImageFilter, ImageFont
import sys, os

SRC = sys.argv[1]
OUT = sys.argv[2]
TITLE = sys.argv[3] if len(sys.argv) > 3 else "Life Tracker"
SUB = sys.argv[4] if len(sys.argv) > 4 else "Работа · Привычки · Здоровье · Финансы"
CROP_TOP = int(sys.argv[5]) if len(sys.argv) > 5 else 0

shot = Image.open(SRC).convert("RGB")
if CROP_TOP:
    shot = shot.crop((0, CROP_TOP, shot.width, shot.height))

# --- canvas with gradient
W, H = 1600, 2400
bg = Image.new("RGB", (W, H))
d = ImageDraw.Draw(bg)
c1, c2 = (14, 22, 40), (34, 58, 110)
for y in range(H):
    t = y / H
    d.line([(0, y), (W, y)], fill=tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)))
# glow
glow = Image.new("RGB", (W, H), (0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse((W*0.2, H*0.35, W*0.8, H*0.95), fill=(40, 90, 200))
glow = glow.filter(ImageFilter.GaussianBlur(220))
bg = Image.blend(bg, Image.eval(glow, lambda v: v), 0.35)

# --- phone
ph_w = 900
scale = ph_w / shot.width
ph_h = int(shot.height * scale)
shot_r = shot.resize((ph_w, ph_h), Image.LANCZOS)
radius = 70
border = 18
frame = Image.new("RGBA", (ph_w + border*2, ph_h + border*2), (0, 0, 0, 0))
fd = ImageDraw.Draw(frame)
fd.rounded_rectangle((0, 0, frame.width-1, frame.height-1), radius + border, fill=(18, 18, 22, 255))
mask = Image.new("L", shot_r.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, ph_w-1, ph_h-1), radius, fill=255)
frame.paste(shot_r, (border, border), mask)

# shadow
sh = Image.new("RGBA", (frame.width + 300, frame.height + 300), (0, 0, 0, 0))
ImageDraw.Draw(sh).rounded_rectangle((150, 190, 150 + frame.width, 190 + frame.height), radius + border, fill=(0, 0, 0, 170))
sh = sh.filter(ImageFilter.GaussianBlur(60))

# text
def font(sz, bold=True):
    for p in [r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
              r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

bg = bg.convert("RGBA")
d = ImageDraw.Draw(bg)
f1, f2 = font(96), font(44, False)
tw = d.textlength(TITLE, font=f1)
d.text(((W - tw)/2, 150), TITLE, font=f1, fill=(255, 255, 255))
sw = d.textlength(SUB, font=f2)
d.text(((W - sw)/2, 280), SUB, font=f2, fill=(170, 190, 230))

px = (W - frame.width)//2
py = 400
bg.alpha_composite(sh, (px - 150, py - 150))
bg.alpha_composite(frame, (px, py))
bg = bg.crop((0, 0, W, min(H, py + frame.height + 120)))
bg.convert("RGB").save(OUT, quality=95)
print(OUT, bg.size)
