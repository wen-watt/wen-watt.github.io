# Wen says · how the cards are made

A repeatable pipeline from a cinematic Wen hero to calm, kind words, in the voice of a quiet teacher.

1. **Prompt the hero.** One wide 16:9 image, 3 equal vertical panels with thin white gaps, the same single Wen in every panel (merged from the reference photos), photorealistic film look, 50 or 85 mm at f/1.2, clean empty sky at the top. Prompts: `protocol/PROMPTS-251126-wen-hero.md`. No trademarked heroes or emblems.
2. **Generate** in the image arena from the owner's reference photos.
3. **Save the triptych** to `wen-media-f/wen-hero-triptych-<name>.jpg`.
4. **Write a batch** `tools/media/wen-says-<date>.json`: one item per panel with `y0` (top of the square), `title` (the wish), `sub` (one light line), `alt`, `note`.
5. **Run** `python3 tools/media/wen_says.py tools/media/wen-says-<date>.json --gallery` → square 1080×1080 cards in `wen-media-f/`, added to Wen Media (media.json, grid, JSON-LD, image sitemap).
6. **Check** every card by eye: face not cut, caption readable.
7. **Share pack**: YouTube Community texts, Pinterest titles/descriptions/alt/keywords and the bulk CSV (example: `protocol/` notes of 25.11.2026).
8. **Video and cutouts**: Veo prompt and white-background cutout prompt from the same file.

## Voice

Calm, short, kind, like a quiet teacher: a wish, then one simple line. No prices, no promises, no "buy". Light internet slang is fine in the small line (fren, gm, no cap).

## Phrase bank (for next batches)

| Wish | Small line |
|---|---|
| Breathe. | The storm passes. You stay. |
| Be patient. | Roots first, then flowers. |
| Be grateful. | Count the small good things. |
| Let go. | Hold the lesson, drop the weight. |
| Stay curious. | Every question opens a door. |
| Speak kindly. | Words land softer than you think. |
| Help someone. | A paw up costs nothing. |
| Keep your word. | Trust is built one promise at a time. |
| Rest well. | Even heroes land. |
| Start again. | Today is a fresh block. gm. |
| Walk your path. | Read, check, then decide. |
| Protect the little ones. | Strong means gentle. |
| Shine quietly. | Light does not need to shout. |
| Forgive. | Lighter paws fly higher. |
| Dream big. | Then take one small step. |
