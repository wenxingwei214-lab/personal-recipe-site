import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "content");
const recipesDir = path.join(contentDir, "recipes");
const assetsDir = path.join(root, "assets");
const srcDir = path.join(root, "src");
const distDir = path.join(root, "dist");

const site = {
  title: "我的小厨房",
  description: "把 Obsidian 里的家常菜、常做菜和下次想优化的小细节，整理成一个轻量、好看的个人菜谱网页。"
};

function resetDist() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  copyDir(assetsDir, path.join(distDir, "assets"));
  copyDir(srcDir, path.join(distDir, "src"));
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(source, target);
    else fs.copyFileSync(source, target);
  }
}

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: source };
  return { data: parseYaml(match[1]), body: match[2].trim() };
}

function parseYaml(yaml) {
  const lines = yaml.split(/\r?\n/);
  const data = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) {
      i++;
      continue;
    }

    const key = pair[1];
    const value = pair[2];
    if (value !== "") {
      data[key] = parseScalar(value);
      i++;
      continue;
    }

    const block = [];
    i++;
    while (i < lines.length && /^\s+/.test(lines[i])) {
      block.push(lines[i]);
      i++;
    }
    data[key] = parseBlock(block);
  }

  return data;
}

function parseBlock(lines) {
  const items = [];
  let current = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      const rest = line.slice(2);
      if (rest.includes(": ")) {
        current = {};
        const [key, ...value] = rest.split(": ");
        current[key] = parseScalar(value.join(": "));
        items.push(current);
      } else {
        current = parseScalar(rest);
        items.push(current);
      }
      continue;
    }

    if (current && typeof current === "object" && line.includes(": ")) {
      const [key, ...value] = line.split(": ");
      current[key] = parseScalar(value.join(": "));
    }
  }

  return items;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  return trimmed.replace(/^["']|["']$/g, "");
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let list = null;

  const closeList = () => {
    if (list) {
      html.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }

    if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3>${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2>${inline(line.slice(3))}</h2>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (list !== "ol") {
        closeList();
        html.push("<ol>");
        list = "ol";
      }
      html.push(`<li>${inline(line.replace(/^\d+\.\s+/, ""))}</li>`);
    } else if (/^[-*]\s+/.test(line)) {
      if (list !== "ul") {
        closeList();
        html.push("<ul>");
        list = "ul";
      }
      html.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }

  closeList();
  return html.join("\n");
}

function inline(value) {
  return escapeHtml(value)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.*?)`/g, "<code>$1</code>");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugFromFile(file) {
  return path.basename(file, ".md").toLowerCase().replace(/\s+/g, "-");
}

function readRecipes() {
  return fs
    .readdirSync(recipesDir)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => {
      const fullPath = path.join(recipesDir, file);
      const { data, body } = parseFrontmatter(fs.readFileSync(fullPath, "utf8"));
      if (data.draft === true) return null;
      const slug = slugFromFile(file);
      return {
        slug,
        title: data.title || slug,
        category: data.category || "未分类",
        tags: data.tags || [],
        tools: data.tools || [],
        ingredients: data.ingredients || [],
        cover: data.cover || "/assets/images/placeholder.svg",
        time: data.time || "",
        difficulty: data.difficulty || "未标注",
        servings: data.servings || "",
        calories: data.calories || "",
        favorite: Boolean(data.favorite),
        last_cooked: data.last_cooked || "",
        updatedAt: fs.statSync(fullPath).mtime.toISOString().slice(0, 10),
        bodyHtml: markdownToHtml(body)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function prefixForDepth(depth) {
  return "../".repeat(depth);
}

function assetPath(value, depth) {
  const prefix = prefixForDepth(depth);
  return `${prefix}${String(value || "/assets/images/placeholder.svg").replace(/^\//, "")}`;
}

function recipeUrl(recipe, depth) {
  return `${prefixForDepth(depth)}recipes/${recipe.slug}/index.html`;
}

function page(title, body, active = "", depth = 0) {
  const prefix = prefixForDepth(depth);
  const nav = [
    ["首页", `${prefix}index.html`],
    ["全部菜谱", `${prefix}recipes/index.html`],
    ["本周菜单", `${prefix}week/index.html`],
    ["食材索引", `${prefix}ingredients/index.html`]
  ]
    .map(([label, href]) => `<a class="${active === label ? "active" : ""}" href="${href}">${label}</a>`)
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} · ${escapeHtml(site.title)}</title>
  <meta name="description" content="${escapeHtml(site.description)}">
  <link rel="stylesheet" href="${prefix}src/styles.css">
  <script src="${prefix}src/app.js" defer></script>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="${prefix}index.html">${site.title}</a>
    <nav>${nav}</nav>
  </header>
  <main>${body}</main>
  <footer>由 Obsidian Markdown 生成 · 只保留给自己真正会用的功能</footer>
</body>
</html>`;
}

function recipeCard(recipe, depth = 0) {
  return `<article class="recipe-card" data-category="${escapeHtml(recipe.category)}" data-tags="${escapeHtml(recipe.tags.join(","))}" data-tools="${escapeHtml(recipe.tools.join(","))}" data-time="${escapeHtml(recipe.time)}">
  <a href="${recipeUrl(recipe, depth)}" aria-label="查看 ${escapeHtml(recipe.title)}">
    <img src="${assetPath(recipe.cover, depth)}" alt="${escapeHtml(recipe.title)}">
    <div class="card-body">
      <div class="card-kicker">${escapeHtml(recipe.category)}${recipe.favorite ? " · 常做" : ""}</div>
      <h3>${escapeHtml(recipe.title)}</h3>
      <p>${escapeHtml(recipe.time)} 分钟 · ${escapeHtml(recipe.difficulty)} · ${escapeHtml(recipe.servings)} 人份</p>
      <div class="chips">${recipe.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
  </a>
</article>`;
}

function renderHome(recipes) {
  const categories = [...new Set(recipes.map((recipe) => recipe.category))];
  const favorites = recipes.filter((recipe) => recipe.favorite).slice(0, 4);
  const recent = recipes.slice(0, 4);
  const body = `<section class="hero">
  <div class="hero-copy">
    <p class="eyebrow">Obsidian 驱动的个人菜谱</p>
    <h1>${site.title}</h1>
    <p>${site.description}</p>
    <div class="hero-actions">
      <a class="button primary" href="recipes/index.html">查看全部菜谱</a>
      <a class="button" href="week/index.html">安排本周菜单</a>
    </div>
  </div>
  <img src="assets/images/cover-kitchen.svg" alt="温暖厨房里的菜谱和食材">
</section>
<section class="section">
  <div class="section-head">
    <h2>分类入口</h2>
    <a href="recipes/index.html">全部 ${recipes.length} 道</a>
  </div>
  <div class="category-grid">${categories.map((category) => `<a href="recipes/index.html?category=${encodeURIComponent(category)}">${escapeHtml(category)}</a>`).join("")}</div>
</section>
<section class="section">
  <div class="section-head"><h2>常做菜</h2></div>
  <div class="card-grid">${favorites.map((recipe) => recipeCard(recipe, 0)).join("")}</div>
</section>
<section class="section">
  <div class="section-head"><h2>最近更新</h2></div>
  <div class="card-grid">${recent.map((recipe) => recipeCard(recipe, 0)).join("")}</div>
</section>`;
  writePage("index.html", page("首页", body, "首页", 0));
}

function renderRecipeList(recipes) {
  const categories = [...new Set(recipes.map((recipe) => recipe.category))];
  const tags = [...new Set(recipes.flatMap((recipe) => recipe.tags))];
  const tools = [...new Set(recipes.flatMap((recipe) => recipe.tools))];
  const body = `<section class="page-title">
  <p class="eyebrow">Recipe Library</p>
  <h1>全部菜谱</h1>
  <p>按分类、标签、工具和耗时筛一筛，找到今天最顺手的一道。</p>
</section>
<section class="filters" aria-label="菜谱筛选">
  ${select("category", "分类", categories)}
  ${select("tag", "标签", tags)}
  ${select("tool", "工具", tools)}
  <label>时长
    <select id="filter-time">
      <option value="">全部</option>
      <option value="15">15 分钟内</option>
      <option value="30">30 分钟内</option>
      <option value="60">60 分钟内</option>
    </select>
  </label>
  <button class="button" id="clear-filters" type="button">清空筛选</button>
</section>
<p class="result-count"><span id="recipe-count">${recipes.length}</span> 道菜谱</p>
<section class="card-grid recipe-list">${recipes.map((recipe) => recipeCard(recipe, 1)).join("")}</section>`;
  writePage("recipes/index.html", page("全部菜谱", body, "全部菜谱", 1));
}

function select(id, label, values) {
  return `<label>${label}
    <select id="filter-${id}">
      <option value="">全部</option>
      ${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}
    </select>
  </label>`;
}

function renderRecipeDetails(recipes) {
  for (const recipe of recipes) {
    const body = `<article class="recipe-detail">
  <header class="recipe-hero">
    <div>
      <p class="eyebrow">${escapeHtml(recipe.category)}</p>
      <h1>${escapeHtml(recipe.title)}</h1>
      <div class="meta-grid">
        <span>${escapeHtml(recipe.time)} 分钟</span>
        <span>${escapeHtml(recipe.difficulty)}</span>
        <span>${escapeHtml(recipe.servings)} 人份</span>
        <span>${escapeHtml(recipe.calories)} kcal</span>
      </div>
      <div class="chips">${recipe.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
    <img src="${assetPath(recipe.cover, 2)}" alt="${escapeHtml(recipe.title)}">
  </header>
  <div class="detail-layout">
    <aside class="detail-panel">
      <h2>原料</h2>
      <ul>${recipe.ingredients.map((item) => `<li><span>${escapeHtml(item.name || item)}</span><strong>${escapeHtml(item.amount || "")}</strong></li>`).join("")}</ul>
      <h2>工具</h2>
      <div class="chips">${recipe.tools.map((tool) => `<span>${escapeHtml(tool)}</span>`).join("")}</div>
      <p class="quiet">上次做：${escapeHtml(recipe.last_cooked || "还没记录")}</p>
    </aside>
    <section class="prose">${recipe.bodyHtml}</section>
  </div>
</article>`;
    writePage(`recipes/${recipe.slug}/index.html`, page(recipe.title, body, "全部菜谱", 2));
  }
}

function renderWeek() {
  const source = fs.readFileSync(path.join(contentDir, "week-menu.md"), "utf8");
  const { body } = parseFrontmatter(source);
  const bodyHtml = `<section class="page-title"><p class="eyebrow">Weekly Plan</p><h1>本周菜单</h1><p>这个页面先保持手动维护，适合记录一周吃什么、缺什么食材。</p></section><section class="prose wide">${markdownToHtml(body)}</section>`;
  writePage("week/index.html", page("本周菜单", bodyHtml, "本周菜单", 1));
}

function renderIngredients(recipes) {
  const map = new Map();
  for (const recipe of recipes) {
    for (const item of recipe.ingredients) {
      const name = item.name || item;
      if (!map.has(name)) map.set(name, []);
      map.get(name).push(recipe);
    }
  }

  const body = `<section class="page-title">
  <p class="eyebrow">Ingredient Index</p>
  <h1>食材索引</h1>
  <p>先按示例菜谱自动聚合，后续新增菜谱后会一起更新。</p>
</section>
<section class="ingredient-list">${[...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "zh-CN"))
    .map(([name, list]) => `<article><h2>${escapeHtml(name)}</h2><p>${list.map((recipe) => `<a href="${recipeUrl(recipe, 1)}">${escapeHtml(recipe.title)}</a>`).join(" / ")}</p></article>`)
    .join("")}</section>`;
  writePage("ingredients/index.html", page("食材索引", body, "食材索引", 1));
}

function writePage(file, html) {
  const target = path.join(distDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}

resetDist();
const recipes = readRecipes();
renderHome(recipes);
renderRecipeList(recipes);
renderRecipeDetails(recipes);
renderWeek();
renderIngredients(recipes);
console.log(`Built ${recipes.length} recipes into dist/`);
