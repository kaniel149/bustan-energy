"""Render carousel HTML slides to PNG using Playwright.

Usage:
    python render_carousel.py [html_file] [output_dir] [num_slides]

Examples:
    python render_carousel.py templates/carousel-roi.html public/output/carousel-01-roi 6
    python render_carousel.py templates/carousel-base.html public/output/test 4

Each slide is rendered at 1080x1080 with 2x device scale factor (retina quality).
The HTML must support a ?slide=N URL parameter to show individual slides.
"""

import sys
import asyncio
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Error: playwright is not installed.")
    print("Install it with: pip install playwright && playwright install chromium")
    sys.exit(1)


async def render_carousel(html_file: str, output_dir: str, num_slides: int = 6):
    """Open HTML file, screenshot each slide at 1080x1080 (2x for retina)."""
    html_path = Path(html_file).resolve()
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    if not html_path.exists():
        print(f"Error: HTML file not found: {html_path}")
        sys.exit(1)

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(
            viewport={"width": 1080, "height": 1080},
            device_scale_factor=2,
        )

        for i in range(1, num_slides + 1):
            url = f"file://{html_path}?slide={i}"
            await page.goto(url)
            await page.wait_for_timeout(800)  # let fonts + layout settle

            output_file = out_path / f"slide-{i:02d}.png"
            await page.screenshot(
                path=str(output_file),
                type="png",
            )
            print(f"  [{i}/{num_slides}] -> {output_file.name}")

        await browser.close()

    print(f"\nDone! {num_slides} slides saved to {out_path}")


if __name__ == "__main__":
    html = sys.argv[1] if len(sys.argv) > 1 else "templates/carousel-roi.html"
    output = sys.argv[2] if len(sys.argv) > 2 else "public/output/carousel-01-roi"
    slides = int(sys.argv[3]) if len(sys.argv) > 3 else 6

    asyncio.run(render_carousel(html, output, slides))
