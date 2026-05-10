from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ICON_DIR = ROOT / "extension" / "icons"
STORE_DIR = ROOT / "docs" / "store-assets"
SCREENSHOT_DIR = STORE_DIR / "screenshots"


def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Helvetica.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


FONT_TITLE = font(58, True)
FONT_SUBTITLE = font(31)
FONT_BODY = font(25)
FONT_BODY_BOLD = font(25, True)
FONT_SMALL = font(19)
FONT_SMALL_BOLD = font(19, True)


def draw_icon(path, size):
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    scale = size / 128

    def s(value):
        return int(round(value * scale))

    draw.rounded_rectangle(
        [s(16), s(16), s(112), s(112)],
        radius=s(28),
        fill=(8, 17, 31, 255),
    )
    draw.rounded_rectangle(
        [s(24), s(24), s(104), s(104)],
        radius=s(22),
        outline=(56, 189, 248, 255),
        width=max(1, s(5)),
    )
    shield = [
        (s(64), s(35)),
        (s(91), s(46)),
        (s(86), s(78)),
        (s(64), s(95)),
        (s(42), s(78)),
        (s(37), s(46)),
    ]
    draw.polygon(shield, fill=(255, 255, 255, 255))
    draw.line(
        [(s(49), s(64)), (s(60), s(76)), (s(82), s(52))],
        fill=(14, 165, 233, 255),
        width=max(2, s(9)),
        joint="curve",
    )
    image.save(path)


def text(draw, xy, value, fill, font_obj, anchor=None):
    draw.text(xy, value, fill=fill, font=font_obj, anchor=anchor)


def card(draw, xy, radius=22, fill=(255, 255, 255), outline=None):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline)


def screenshot_base(title, subtitle):
    image = Image.new("RGB", (1280, 800), (244, 248, 251))
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, 1280, 800], fill=(244, 248, 251))
    draw.rectangle([0, 0, 1280, 118], fill=(8, 17, 31))
    text(draw, (72, 38), title, (255, 255, 255), FONT_TITLE)
    text(draw, (74, 96), subtitle, (186, 230, 253), FONT_SMALL)
    return image, draw


def draw_thread_mock(draw, origin=(78, 170)):
    x, y = origin
    card(draw, [x, y, x + 700, y + 520], radius=26, fill=(255, 255, 255), outline=(216, 226, 235))
    text(draw, (x + 36, y + 36), "Status replies", (15, 23, 42), FONT_BODY_BOLD)
    replies = [
        ("Thoughtful reply stays visible", "Clean text, no structural bait", False),
        ("Hidden suspected spam reply", "Emoji-broken words + bait profile", True),
        ("Another useful reply remains", "Ordinary language with trailing emoji", False),
        ("Hidden suspected spam reply", "Short code + emoji pattern", True),
    ]
    row_y = y + 92
    for title, meta, hidden in replies:
        fill = (248, 250, 252) if not hidden else (241, 245, 249)
        card(draw, [x + 32, row_y, x + 668, row_y + 82], radius=16, fill=fill, outline=(226, 232, 240))
        if hidden:
            draw.ellipse([x + 54, row_y + 25, x + 86, row_y + 57], fill=(14, 165, 233))
            text(draw, (x + 70, row_y + 31), "✓", (255, 255, 255), FONT_SMALL_BOLD, anchor="mm")
            text(draw, (x + 104, row_y + 20), title, (15, 23, 42), FONT_SMALL_BOLD)
            text(draw, (x + 104, row_y + 48), meta, (71, 85, 105), FONT_SMALL)
        else:
            draw.ellipse([x + 54, row_y + 25, x + 86, row_y + 57], fill=(203, 213, 225))
            text(draw, (x + 104, row_y + 20), title, (15, 23, 42), FONT_SMALL_BOLD)
            text(draw, (x + 104, row_y + 48), meta, (71, 85, 105), FONT_SMALL)
        row_y += 104
    draw.rounded_rectangle([x + 612, y + 444, x + 676, y + 508], radius=20, fill=(8, 17, 31))
    text(draw, (x + 644, y + 477), "2", (255, 255, 255), font(32, True), anchor="mm")


def make_screenshot_one():
    image, draw = screenshot_base(
        "Hide spam replies on X",
        "Local structural scoring for high-confidence reply filtering",
    )
    draw_thread_mock(draw)
    card(draw, [840, 215, 1188, 560], radius=26, fill=(255, 255, 255), outline=(216, 226, 235))
    text(draw, (886, 268), "What it does", (15, 23, 42), FONT_BODY_BOLD)
    bullets = [
        "Filters replies below the main post",
        "Keeps normal replies visible",
        "Uses local score combinations",
        "Shows a small hidden count",
    ]
    y = 322
    for bullet in bullets:
        draw.ellipse([886, y + 7, 898, y + 19], fill=(14, 165, 233))
        text(draw, (914, y), bullet, (51, 65, 85), FONT_SMALL)
        y += 45
    image.save(SCREENSHOT_DIR / "01-hide-spam-replies.png")


def make_screenshot_two():
    image, draw = screenshot_base(
        "Built for fewer false positives",
        "Weak signals must combine; normal English with emoji stays visible",
    )
    card(draw, [82, 178, 1198, 632], radius=28, fill=(255, 255, 255), outline=(216, 226, 235))
    columns = [
        ("High-confidence signals", [
            "Emoji inserted inside Latin words",
            "Compact digit / emoji short codes",
            "Non-Latin decorative wrappers",
            "Adult or grey-market profile bait",
        ], (14, 165, 233)),
        ("Conservative boundaries", [
            "No rotating account deny lists",
            "No broad keyword-only blocking",
            "Main post is not filtered",
            "Regression cases protect policy edges",
        ], (16, 185, 129)),
    ]
    x = 132
    for heading, bullets, color in columns:
        text(draw, (x, 234), heading, (15, 23, 42), FONT_BODY_BOLD)
        y = 300
        for bullet in bullets:
            draw.rounded_rectangle([x, y, x + 440, y + 56], radius=16, fill=(248, 250, 252), outline=(226, 232, 240))
            draw.ellipse([x + 22, y + 20, x + 38, y + 36], fill=color)
            text(draw, (x + 56, y + 15), bullet, (51, 65, 85), FONT_SMALL)
            y += 76
        x += 560
    image.save(SCREENSHOT_DIR / "02-fewer-false-positives.png")


def make_screenshot_three():
    image, draw = screenshot_base(
        "Private by default",
        "Runs in your browser and does not upload reply content",
    )
    card(draw, [90, 180, 1190, 620], radius=32, fill=(255, 255, 255), outline=(216, 226, 235))
    steps = [
        ("1", "Read visible reply text", "Includes X emoji image alt text when it affects patterns"),
        ("2", "Normalize obfuscation", "Unicode cleanup plus common bait spelling variants"),
        ("3", "Score locally", "A reply is hidden only when the local threshold is reached"),
    ]
    y = 258
    for number, heading, body in steps:
        draw.ellipse([150, y - 10, 210, y + 50], fill=(8, 17, 31))
        text(draw, (180, y + 20), number, (255, 255, 255), font(28, True), anchor="mm")
        text(draw, (246, y - 4), heading, (15, 23, 42), FONT_BODY_BOLD)
        text(draw, (246, y + 32), body, (71, 85, 105), FONT_SMALL)
        y += 112
    draw.rounded_rectangle([850, 275, 1115, 505], radius=28, fill=(239, 246, 255), outline=(125, 211, 252))
    text(draw, (982, 340), "No server", (15, 23, 42), FONT_BODY_BOLD, anchor="mm")
    text(draw, (982, 386), "No tracking", (15, 23, 42), FONT_BODY_BOLD, anchor="mm")
    text(draw, (982, 432), "No reply upload", (15, 23, 42), FONT_BODY_BOLD, anchor="mm")
    image.save(SCREENSHOT_DIR / "03-private-local-filtering.png")


def make_promo():
    image = Image.new("RGB", (440, 280), (8, 17, 31))
    draw = ImageDraw.Draw(image)
    draw_icon(STORE_DIR / "store-icon-128.png", 128)
    icon = Image.open(STORE_DIR / "store-icon-128.png").convert("RGBA")
    image.paste(icon, (42, 76), icon)
    text(draw, (200, 82), "X Strict", (255, 255, 255), font(36, True))
    text(draw, (200, 123), "Reply Filter", (255, 255, 255), font(36, True))
    text(draw, (202, 180), "Local spam reply filtering", (186, 230, 253), FONT_SMALL)
    image.save(STORE_DIR / "small-promo-440x280.png")


def main():
    ICON_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    STORE_DIR.mkdir(parents=True, exist_ok=True)

    for size in (16, 32, 48, 128):
        draw_icon(ICON_DIR / f"icon-{size}.png", size)

    draw_icon(STORE_DIR / "store-icon-128.png", 128)
    make_screenshot_one()
    make_screenshot_two()
    make_screenshot_three()
    make_promo()


if __name__ == "__main__":
    main()
