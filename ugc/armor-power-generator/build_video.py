#!/usr/bin/env python3
"""
Build UGC video for Armor Power AP13000ET generator.
Storm/outage story format, 9:16 vertical, ~50 seconds.
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
from moviepy import (
    ImageClip, AudioFileClip, concatenate_videoclips,
    CompositeVideoClip, TextClip, ColorClip
)
import numpy as np
import os
import tempfile

OUT_DIR = "/home/user/RepReach/ugc/armor-power-generator"
PRODUCT_IMG = None  # will search
W, H = 1080, 1920  # 9:16

# ── Find product image ──────────────────────────────────────────────────────
import glob
candidates = glob.glob("/home/user/**/*.jpg", recursive=True) + glob.glob("/home/user/**/*.png", recursive=True)
PRODUCT_IMG = f"{OUT_DIR}/product.png"
if not os.path.exists(PRODUCT_IMG):
    for c in candidates:
        if "generator" in c.lower() or "armor" in c.lower() or "AP13000" in c.lower():
            PRODUCT_IMG = c
            break

print(f"Product image: {PRODUCT_IMG}")

# ── Helpers ─────────────────────────────────────────────────────────────────

def make_frame(bg_color, text_lines, sub_text=None, product_img=None, overlay_alpha=160):
    img = Image.new("RGB", (W, H), bg_color)
    draw = ImageDraw.Draw(img)

    # gradient overlay
    grad = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(grad)
    for y in range(H):
        alpha = int(overlay_alpha * (y / H))
        grad_draw.line([(0, y), (W, y)], fill=(0, 0, 0, alpha))
    img.paste(Image.new("RGB", (W, H), (0, 0, 0)), mask=grad.split()[3])

    # product image if provided
    if product_img and os.path.exists(product_img):
        prod = Image.open(product_img).convert("RGBA")
        prod.thumbnail((900, 900))
        pw, ph = prod.size
        px = (W - pw) // 2
        py = (H - ph) // 2 - 100
        img.paste(prod, (px, py), prod.split()[3] if prod.mode == "RGBA" else None)

    draw = ImageDraw.Draw(img)

    # main text lines
    try:
        font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        font_med = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 55)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 42)
    except Exception:
        font_large = font_med = font_small = ImageFont.load_default()

    y_start = H // 2 + 200
    for i, line in enumerate(text_lines):
        font = font_large if i == 0 else font_med
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        x = (W - tw) // 2
        # shadow
        draw.text((x + 3, y_start + 3), line, font=font, fill=(0, 0, 0, 200))
        draw.text((x, y_start), line, font=font, fill=(255, 255, 255))
        y_start += (bbox[3] - bbox[1]) + 20

    if sub_text:
        bbox = draw.textbbox((0, 0), sub_text, font=font_small)
        tw = bbox[2] - bbox[0]
        x = (W - tw) // 2
        draw.text((x + 2, y_start + 22), sub_text, font=font_small, fill=(0, 0, 0, 180))
        draw.text((x, y_start + 20), sub_text, font=font_small, fill=(255, 220, 50))

    return np.array(img)


def tts(text, path):
    wav_path = path.replace(".mp3", ".wav")
    os.system(f'espeak-ng -v en-us+f3 -s 150 -a 180 "{text}" --stdout > "{wav_path}" 2>/dev/null')
    # convert wav to mp3-compatible format moviepy can read
    os.rename(wav_path, path.replace(".mp3", ".wav"))
    return path.replace(".mp3", ".wav")


# ── Scene definitions ────────────────────────────────────────────────────────
scenes = [
    {
        "bg": (5, 5, 15),
        "lines": ["⚡ 2AM.", "Storm hits."],
        "sub": "Power out for 6 days",
        "vo": "The storm hit at 2am. We lost power for 6 days.",
        "duration": 4,
        "product": False,
    },
    {
        "bg": (15, 10, 5),
        "lines": ["No fridge.", "No AC.", "No power."],
        "sub": "Neighbor's generator? Dead in 24hrs.",
        "vo": "No fridge. No AC. No way to charge anything. My neighbor had a generator — but it ran out of gas in 24 hours.",
        "duration": 6,
        "product": False,
    },
    {
        "bg": (10, 20, 10),
        "lines": ["Then I found", "ARMOR POWER"],
        "sub": "AP13000ET — TRI-FUEL",
        "vo": "That's when I found this — the Armor Power AP13000ET. Tri-fuel. It runs on gasoline, propane, OR natural gas.",
        "duration": 6,
        "product": True,
    },
    {
        "bg": (5, 15, 5),
        "lines": ["Gas. Propane.", "Natural Gas."],
        "sub": "Switch fuels anytime ⚡",
        "vo": "If gas runs out — just switch to propane. Game changer.",
        "duration": 5,
        "product": True,
    },
    {
        "bg": (0, 20, 0),
        "lines": ["Electric Start.", "2 Minutes."],
        "sub": "Whole house running.",
        "vo": "Electric start. 13,000 watts. My whole house was running in under 2 minutes.",
        "duration": 5,
        "product": True,
    },
    {
        "bg": (0, 10, 30),
        "lines": ["Every outlet.", "Every appliance.", "Even the AC."],
        "sub": "13,000 Watts of power",
        "vo": "Every outlet. Every appliance. Even the AC.",
        "duration": 4,
        "product": False,
    },
    {
        "bg": (20, 10, 0),
        "lines": ["Best generator", "I've ever owned."],
        "sub": "\"The tri-fuel thing is a game changer\"",
        "vo": "I've had three generators over the years. This is the only one I'd trust in a real emergency.",
        "duration": 6,
        "product": True,
    },
    {
        "bg": (0, 0, 0),
        "lines": ["ARMOR POWER", "AP13000ET"],
        "sub": "Link in bio 👇",
        "vo": "Armor Power AP13000ET. Link in bio.",
        "duration": 5,
        "product": True,
    },
]

# ── Build clips ──────────────────────────────────────────────────────────────
clips = []
os.makedirs(f"{OUT_DIR}/tmp", exist_ok=True)

for i, scene in enumerate(scenes):
    print(f"Building scene {i+1}/{len(scenes)}: {scene['lines'][0]}")

    # frame
    frame = make_frame(
        scene["bg"],
        scene["lines"],
        scene.get("sub"),
        PRODUCT_IMG if scene["product"] else None,
    )

    # voiceover
    vo_path = tts(scene["vo"], f"{OUT_DIR}/tmp/vo_{i}.mp3")
    audio = AudioFileClip(vo_path)
    duration = max(scene["duration"], audio.duration + 0.5)

    # image clip
    img_clip = ImageClip(frame, duration=duration)
    img_clip = img_clip.with_audio(audio)
    clips.append(img_clip)

# ── Concatenate & export ─────────────────────────────────────────────────────
print("Stitching video...")
final = concatenate_videoclips(clips, method="compose")
out_path = f"{OUT_DIR}/armor_power_ugc.mp4"
final.write_videofile(out_path, fps=24, codec="libx264", audio_codec="aac", logger="bar")
print(f"\n✅ Video saved: {out_path}")
