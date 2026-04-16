"""
Selector Extractor Icon Generator
Design Philosophy: Precision Signal
"""
from PIL import Image, ImageDraw, ImageFont
import math
import os

FONT_DIR = r"C:\Users\ymseo\.claude\plugins\cache\anthropic-agent-skills\example-skills\b0cbd3df1533\skills\canvas-design\canvas-fonts"
ICON_DIR = os.path.dirname(os.path.abspath(__file__))


def create_icon(size):
    """Create a single icon at the given size."""
    # High-res canvas for antialiasing (4x then downscale, 홀수로 만들어 정중앙 확보)
    scale = 4
    s = size * scale + 1  # 홀수로 만들어 정확한 중앙 픽셀
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    cx, cy = s // 2, s // 2

    # === Background: Deep rounded rectangle ===
    radius = s // 4
    bg_color = (15, 20, 30, 255)  # Deep blue-black
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=bg_color)

    # === Subtle grid pattern (precision/structure) ===
    grid_color = (30, 40, 55, 80)
    grid_spacing = s // 8
    for i in range(1, 8):
        x = i * grid_spacing
        draw.line([(x, radius // 2), (x, s - radius // 2)], fill=grid_color, width=max(1, scale // 2))
        draw.line([(radius // 2, x), (s - radius // 2, x)], fill=grid_color, width=max(1, scale // 2))

    # === Central crosshair / targeting element ===
    # Outer ring - subtle
    ring_radius = int(s * 0.28)
    ring_color = (0, 100, 255, 60)
    ring_width = max(2, int(scale * 1.5))
    draw.ellipse(
        [cx - ring_radius, cy - ring_radius, cx + ring_radius, cy + ring_radius],
        outline=ring_color, width=ring_width
    )

    # Inner ring - accent gradient (blue to green)
    inner_radius = int(s * 0.18)
    accent_blue = (0, 100, 255, 200)
    draw.ellipse(
        [cx - inner_radius, cy - inner_radius, cx + inner_radius, cy + inner_radius],
        outline=accent_blue, width=max(2, int(scale * 2))
    )

    # === Crosshair lines ===
    line_color = (0, 180, 120, 180)  # Blue-green accent
    gap = int(s * 0.08)
    line_len = int(s * 0.15)
    line_w = max(2, int(scale * 1.2))

    # Top
    draw.line([(cx, cy - inner_radius - line_len), (cx, cy - inner_radius - gap)], fill=line_color, width=line_w)
    # Bottom
    draw.line([(cx, cy + inner_radius + gap), (cx, cy + inner_radius + line_len)], fill=line_color, width=line_w)
    # Left
    draw.line([(cx - inner_radius - line_len, cy), (cx - inner_radius - gap, cy)], fill=line_color, width=line_w)
    # Right
    draw.line([(cx + inner_radius + gap, cy), (cx + inner_radius + line_len, cy)], fill=line_color, width=line_w)

    # === Center dot - the point of selection ===
    dot_radius = max(3, int(s * 0.03))
    center_color = (0, 200, 100, 255)  # Bright green - the "selected" signal
    draw.ellipse(
        [cx - dot_radius, cy - dot_radius, cx + dot_radius, cy + dot_radius],
        fill=center_color
    )

    # === Glow around center dot (pixel-painted for perfect symmetry) ===
    glow_max_r = dot_radius + int(s * 0.06)
    for py in range(cy - glow_max_r, cy + glow_max_r + 1):
        for px in range(cx - glow_max_r, cx + glow_max_r + 1):
            dist = math.sqrt((px - cx) ** 2 + (py - cy) ** 2)
            if dot_radius < dist < glow_max_r:
                alpha = int(60 * (1 - (dist - dot_radius) / (glow_max_r - dot_radius)))
                if alpha > 0 and 0 <= px < s and 0 <= py < s:
                    existing = img.getpixel((px, py))
                    blended_a = min(255, existing[3] + alpha)
                    blended = (
                        min(255, existing[0] + int(0 * alpha / 255)),
                        min(255, existing[1] + int(200 * alpha / 255)),
                        min(255, existing[2] + int(100 * alpha / 255)),
                        blended_a
                    )
                    img.putpixel((px, py), blended)

    # === Corner brackets (selection indicator) ===
    bracket_len = int(s * 0.12)
    bracket_offset = int(s * 0.32)
    bracket_color = (0, 100, 255, 160)
    bracket_w = max(2, int(scale * 1.5))

    corners = [
        # top-left
        (cx - bracket_offset, cy - bracket_offset, 0, 1, 1, 0),
        # top-right
        (cx + bracket_offset, cy - bracket_offset, 0, 1, -1, 0),
        # bottom-left
        (cx - bracket_offset, cy + bracket_offset, 0, -1, 1, 0),
        # bottom-right
        (cx + bracket_offset, cy + bracket_offset, 0, -1, -1, 0),
    ]

    for (bx, by, _, vy, hx, _) in corners:
        # Vertical stroke
        draw.line([(bx, by), (bx, by + vy * bracket_len)], fill=bracket_color, width=bracket_w)
        # Horizontal stroke
        draw.line([(bx, by), (bx + hx * bracket_len, by)], fill=bracket_color, width=bracket_w)

    # === Tiny measurement ticks on crosshair lines ===
    tick_color = (100, 140, 180, 100)
    tick_w = max(1, scale // 2)
    tick_size = max(2, int(s * 0.015))

    for offset_pct in [0.22, 0.25, 0.35, 0.38]:
        offset = int(s * offset_pct)
        # Horizontal ticks
        draw.line([(cx + offset, cy - tick_size), (cx + offset, cy + tick_size)], fill=tick_color, width=tick_w)
        draw.line([(cx - offset, cy - tick_size), (cx - offset, cy + tick_size)], fill=tick_color, width=tick_w)
        # Vertical ticks
        draw.line([(cx - tick_size, cy + offset), (cx + tick_size, cy + offset)], fill=tick_color, width=tick_w)
        draw.line([(cx - tick_size, cy - offset), (cx + tick_size, cy - offset)], fill=tick_color, width=tick_w)

    # === Downscale with high-quality antialiasing ===
    img = img.resize((size, size), Image.LANCZOS)

    return img


def main():
    sizes = [16, 48, 128]

    for size in sizes:
        icon = create_icon(size)
        path = os.path.join(ICON_DIR, f"icon{size}.png")
        icon.save(path, "PNG")
        print(f"Created icon{size}.png ({size}x{size})")

    # Also create a 512x512 for Chrome Web Store
    store_icon = create_icon(512)
    store_path = os.path.join(ICON_DIR, "icon512.png")
    store_icon.save(store_path, "PNG")
    print(f"Created icon512.png (512x512) - for Chrome Web Store")


if __name__ == "__main__":
    main()
