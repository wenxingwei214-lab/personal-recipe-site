---
name: recipe-capture
description: Capture, normalize, review, and approve recipes collected from Xiaohongshu, Douyin, web pages, screenshots, pasted notes, or Obsidian life-summary notes into the user's personal static recipe site. Use when the user wants to turn external cooking content into structured recipe Markdown, maintain an approval step before adding it to content/recipes, connect approved recipes back to 4-生活汇总/02-美食探店/菜谱做法, or update the Obsidian-driven personal recipe website.
---

# Recipe Capture

## Purpose

Turn messy food content from social platforms, webpages, screenshots, transcripts, or notes into a safe, reviewed recipe pipeline:

1. Preserve the original source in Obsidian.
2. Extract a structured candidate recipe.
3. Ask the user to approve or revise the candidate.
4. Only after approval, write the recipe into the personal recipe website.
5. Rebuild the static site and link the recipe back to the source note when possible.

Never add an unapproved recipe directly to `content/recipes/`.

## Project Paths

Assume the workspace root is the Obsidian vault unless the user says otherwise.

- Recipe website: `5-个人网站/个人菜谱`
- Approved recipes: `5-个人网站/个人菜谱/content/recipes`
- Recipe images: `5-个人网站/个人菜谱/assets/images`
- Static build output: `5-个人网站/个人菜谱/dist`
- AI inbox note: `5-个人网站/个人菜谱/AI菜谱收集箱.md`
- Food collection notes: `4-生活汇总/02-美食探店`
- Recipe-method collection notes: `4-生活汇总/02-美食探店/菜谱做法`
- Candidate review notes: prefer `4-生活汇总/02-美食探店/菜谱做法/待审批`

If these folders do not exist, create only the missing folders required by the current task.

## Workflow

### 0. Obsidian AI inbox mode

When the user says `处理菜谱收集箱`, read `5-个人网站/个人菜谱/AI菜谱收集箱.md` and process the latest content under `## 新素材粘贴区`.

This mode is intentionally conversational:

- Accept incomplete notes, casual dialogue, copied social text, URLs, or screenshot OCR.
- Produce one candidate recipe draft and a short confirmation checklist.
- Do not require the user to fill every field.
- Infer reasonable defaults, but show uncertain inferences before ingestion.
- Ask at most 3 grouped confirmation questions unless safety or ambiguity requires more.
- Do not write to `content/recipes/` until the user confirms.

Confirmation checklist format:

```markdown
## 待确认

1. 菜名/分类/时长是否这样定？
2. 食材和用量有没有明显不对？
3. 图片用哪种：你提供 / 帮你找图 / 生成示意图 / 先用占位图？
```

After the user confirms, create the candidate note, approve it if confirmation is explicit, run the ingestion script, rebuild the site, and report the preview path.

### 1. Collect source

When the user provides a URL, copied text, screenshot transcription, video notes, or a social-platform recipe:

- Record `source_platform` as `小红书`, `抖音`, `B站`, `公众号`, `网页`, `口述`, or `未知`.
- Preserve the original URL when provided as `source_url`.
- If the source is already an Obsidian note, keep its path as `source_note`.
- If the source is only pasted text, create or update a collection note under `4-生活汇总/02-美食探店/菜谱做法/待审批`.
- Do not download media unless the user asks, provides files, or approves a searched/generated image plan. Use a placeholder cover until confirmed.

### Image handling

Support four image paths:

1. **User provides image**: copy it into `assets/images` using the recipe slug as the filename, then set `cover`.
2. **Search image**: if the user asks to find a photo, use web/image search, show candidate source/thumbnail choices, and only save/use one after confirmation.
3. **Generate image**: if the user wants a simple illustrative cover, generate or request a generated bitmap, save it under `assets/images`, and confirm before final use.
4. **Placeholder**: use `/assets/images/placeholder.svg` when no image decision is made.

Prefer user-provided real photos for personal recipes. Do not silently use external images without approval and attribution when needed.
Default image policy for this user's personal recipes:

- Before writing or updating a website recipe, explicitly confirm the image status with the user. Ask whether they have a finished-dish photo.
- If the user provides a finished-dish photo, use it directly: copy it into `assets/images` with the recipe slug as the filename, set `cover` to that asset path, and rebuild the site. Do not generate a replacement.
- If the user says they do not have a finished-dish photo, default to generating a temporary illustrative cover with image2/image generation. Save it into `assets/images`, set `cover` to that generated asset path, mark it as temporary in the recipe note or source note, and rebuild the site.
- Do not silently leave a recipe on `/assets/images/placeholder.svg` unless the user explicitly chooses to skip both uploading and generating an image.
- Use searched external images only as visual references/candidates, not silently as the website cover.
- When the user later provides a real finished-dish photo, replace the generated temporary cover with the real photo.


### 2. Normalize into candidate Markdown

Create a candidate recipe Markdown note, not an approved recipe file. Use the exact field schema in `references/recipe-schema.md`.

Candidate frontmatter must include:

- `approved: false`
- `source_platform`
- `source_url` when known
- `source_note` when known
- all standard recipe fields: `title`, `category`, `tags`, `cover`, `time`, `difficulty`, `servings`, `calories`, `tools`, `ingredients`, `favorite`, `last_cooked`

Use conservative defaults when the source is incomplete:

- `cover: /assets/images/placeholder.svg`
- `calories: 0`
- `favorite: false`
- `last_cooked: ""`
- `difficulty`: infer only as `简单`, `中等`, or `进阶`
- `time`: numeric minutes when possible
- `servings`: default to `2` if unknown
- missing amounts: use practical estimates and list them under `## 来源摘记` as inferred

The body should use these sections in order:

```markdown
## 步骤

1. ...

## 注意事项

- ...

## 下次优化

- ...

## 来源摘记

- ...
```

Clearly mark uncertain inferred details in `## 来源摘记`, not in the structured fields.

### 3. Ask for approval

Show the candidate summary before writing to the website:

- dish name, category, time, difficulty, servings
- tools
- ingredients
- inferred or uncertain parts
- image plan: user image, searched image, generated image, or placeholder
- source link or source note

Ask the user to approve, revise, or reject. Proceed to ingestion only when the user clearly approves.

Approval signals include direct phrases such as `通过`, `批准`, `可以入库`, `收录`, `加入菜谱`, `就这样`.

### 4. Ingest approved recipe

After approval, set `approved: true` in the candidate file or pass `--force` only if the user explicitly approved in the current conversation.

Run:

```bash
python3 skills/recipe-capture/scripts/approve_recipe.py \
  --candidate "4-生活汇总/02-美食探店/菜谱做法/待审批/<candidate>.md" \
  --site-root "5-个人网站/个人菜谱" \
  --source-note "4-生活汇总/02-美食探店/菜谱做法/待审批/<candidate>.md" \
  --build
```

If the generated slug would be unclear for a Chinese title, pass a readable slug:

```bash
python3 skills/recipe-capture/scripts/approve_recipe.py \
  --candidate "<candidate>.md" \
  --site-root "5-个人网站/个人菜谱" \
  --slug "tomato-beef-noodles" \
  --build
```

The script writes the recipe into `content/recipes/`, preserves source metadata, appends an approved-recipe link to the source note when provided, and optionally runs `npm run build`.

### 5. Verify

After ingestion:

- Run `npm run build` from the recipe website if the script was not run with `--build`.
- Check that the new recipe file exists in `content/recipes`.
- Check that `dist/recipes/index.html` contains the recipe title.
- Tell the user which files changed and where to open the preview.

## Extraction Rules

- Keep personal usability ahead of perfect archival fidelity.
- Convert platform-style tips into `注意事项` or `下次优化`.
- Split ingredients into `{ name, amount }` objects.
- Keep tools short and practical, e.g. `炒锅`, `空气炸锅`, `电饭煲`, `烤箱`.
- Prefer categories already used by the site: `家常快手`, `一人食`, `汤羹`, or add a short new category when needed.
- Tags should describe retrieval needs: `快手菜`, `下饭菜`, `早餐`, `高蛋白`, `便当`, `素食`, `空气炸锅`.
- Do not copy long platform text verbatim into the approved recipe. Summarize and rewrite into personal cooking instructions.
- Keep source attribution in metadata and `来源摘记`.

## References

- Read `references/recipe-schema.md` when creating or validating candidate frontmatter.
- Read `references/intake-template.md` when making a new Obsidian candidate note.
