import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const contentDir = path.join(root, "content");
const recipesDir = path.join(contentDir, "recipes");
const assetsDir = path.join(root, "assets");
const srcDir = path.join(root, "src");
const outputDir = path.join(root, "docs");

const site = {
  title: "我的小厨房",
  description: "把真正会做、会复做的家常菜收在一起。打开就能按场景、食材和时间找到今天这一顿。"
};

const quickFilters = ["全部", "主食", "减脂", "汤羹", "快手菜", "下饭菜", "高蛋白", "家常菜"];

function resetOutput() {
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });
  copyDir(assetsDir, path.join(outputDir, "assets"));
  copyDir(srcDir, path.join(outputDir, "src"));
  fs.writeFileSync(path.join(outputDir, ".nojekyll"), "");
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
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
  const cleanPath = String(value || "/assets/images/placeholder.svg").replace(/^\//, "");
  const fullPath = path.join(root, cleanPath);
  let version = "";
  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    version = `?v=${stat.size.toString(36)}-${Math.floor(stat.mtimeMs).toString(36)}`;
  }
  return `${prefix}${cleanPath}${version}`;
}

function recipeUrl(recipe, depth) {
  return `${prefixForDepth(depth)}recipes/${recipe.slug}/index.html`;
}

function imgTag(src, alt, className = "", loading = "lazy") {
  const priority = loading === "eager" ? ' fetchpriority="high"' : "";
  const classAttr = className ? ` class="${className}"` : "";
  return `<img${classAttr} src="${src}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async"${priority}>`;
}

function page(title, body, active = "", depth = 0) {
  const prefix = prefixForDepth(depth);
  const nav = [
    ["首页", `${prefix}index.html`],
    ["菜谱", `${prefix}recipes/index.html`],
    ["本周", `${prefix}week/index.html`],
    ["食材", `${prefix}ingredients/index.html`]
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

function recipeCard(recipe, depth = 0, loading = "eager") {
  return `<article class="recipe-card" data-category="${escapeHtml(recipe.category)}" data-tags="${escapeHtml(recipe.tags.join(","))}" data-tools="${escapeHtml(recipe.tools.join(","))}" data-time="${escapeHtml(recipe.time)}" data-title="${escapeHtml(recipe.title)}">
  <a href="${recipeUrl(recipe, depth)}" aria-label="查看 ${escapeHtml(recipe.title)}">
    ${imgTag(assetPath(recipe.cover, depth), recipe.title, "", loading)}
    <div class="card-body">
      <div class="card-kicker">${escapeHtml(recipe.category)}</div>
      <h3>${escapeHtml(recipe.title)}</h3>
      <p>${escapeHtml(recipe.time)} 分钟 · ${escapeHtml(recipe.difficulty)} · ${escapeHtml(recipe.servings)} 人份</p>
      <div class="chips">${recipe.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
  </a>
</article>`;
}

function renderHome(recipes) {
  const heroRecipe = recipes.find((recipe) => recipe.slug === "lotus-root-pork-rib-soup") || recipes[0];
  const recent = recipes.filter((recipe) => recipe.slug !== heroRecipe.slug).slice(0, 4);
  const body = `<section class="home-shell">
  <div class="home-intro">
    <p class="eyebrow">PRIVATE RECIPE BOOK</p>
    <h1>今天吃什么，一眼决定。</h1>
    <p>${site.description}</p>
    <form class="search-card" action="recipes/index.html">
      <input name="search" type="search" placeholder="搜菜名、食材、标签" aria-label="搜索菜谱">
      <button class="button primary" type="submit">搜索</button>
    </form>
  </div>
  <a class="featured-recipe" href="${recipeUrl(heroRecipe, 0)}" aria-label="查看 ${escapeHtml(heroRecipe.title)}">
    ${imgTag(assetPath(heroRecipe.cover, 0), heroRecipe.title, "", "eager")}
    <div class="featured-copy">
      <span>${escapeHtml(heroRecipe.category)} · ${escapeHtml(heroRecipe.time)} 分钟</span>
      <h2>${escapeHtml(heroRecipe.title)}</h2>
      <p>${heroRecipe.tags.slice(0, 3).map((tag) => escapeHtml(tag)).join(" / ")}</p>
    </div>
  </a>
</section>
<section class="section compact-section">
  <div class="section-head">
    <h2>按场景找菜</h2>
    <a href="recipes/index.html">全部 ${recipes.length} 道</a>
  </div>
  <div class="quick-filter-row">${quickFilters.map((filter) => filter === "全部" ? `<a class="filter-pill active" href="recipes/index.html">${filter}</a>` : `<a class="filter-pill" href="recipes/index.html?tag=${encodeURIComponent(filter)}">${escapeHtml(filter)}</a>`).join("")}</div>
</section>
<section class="section compact-section">
  <div class="section-head"><h2>最近入库</h2><a href="recipes/index.html">继续翻</a></div>
  <div class="card-grid feature-grid">${recent.map((recipe) => recipeCard(recipe, 0)).join("")}</div>
</section>`;
  writePage("index.html", page("首页", body, "首页", 0));
}

function renderRecipeList(recipes) {
  const body = `<section class="page-title">
  <p class="eyebrow">RECIPE LIBRARY</p>
  <h1>全部菜谱</h1>
  <p>按场景快速筛一遍，不用在手机上填一堆表单。</p>
</section>
<section class="filters" aria-label="菜谱筛选">
  <div class="search-card list-search">
    <input id="recipe-search" type="search" placeholder="搜菜名、食材、标签" aria-label="搜索菜谱">
    <button class="button" id="clear-filters" type="button">重置</button>
  </div>
  <div class="quick-filter-row" role="list" aria-label="快速分类">
    ${quickFilters.map((filter) => `<button class="filter-pill${filter === "全部" ? " active" : ""}" type="button" data-filter-tag="${escapeHtml(filter === "全部" ? "" : filter)}">${escapeHtml(filter)}</button>`).join("")}
  </div>
  <div class="quick-filter-row secondary-filters" role="list" aria-label="耗时筛选">
    <button class="filter-pill active" type="button" data-filter-time="">全部时长</button>
    <button class="filter-pill" type="button" data-filter-time="15">15 分钟</button>
    <button class="filter-pill" type="button" data-filter-time="30">30 分钟</button>
    <button class="filter-pill" type="button" data-filter-time="60">1 小时内</button>
  </div>
</section>
<p class="result-count"><span id="recipe-count">${recipes.length}</span> 道菜谱</p>
<section class="card-grid recipe-list">${recipes.map((recipe) => recipeCard(recipe, 1)).join("")}</section>`;
  writePage("recipes/index.html", page("全部菜谱", body, "菜谱", 1));
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
        <span>${recipe.calories ? `${escapeHtml(recipe.calories)} kcal` : "家常"}</span>
      </div>
      <div class="chips">${recipe.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    </div>
    ${imgTag(assetPath(recipe.cover, 2), recipe.title, "", "eager")}
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
    writePage(`recipes/${recipe.slug}/index.html`, page(recipe.title, body, "菜谱", 2));
  }
}

function renderWeek() {
  const source = fs.readFileSync(path.join(contentDir, "week-menu.md"), "utf8");
  const { body } = parseFrontmatter(source);
  const bodyHtml = `<section class="page-title"><p class="eyebrow">WEEKLY PLAN</p><h1>本周菜单</h1><p>这个页面先保持手动维护，适合记录一周吃什么、缺什么食材。</p></section><section class="prose wide">${markdownToHtml(body)}</section>`;
  writePage("week/index.html", page("本周菜单", bodyHtml, "本周", 1));
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
  <p>按食材倒查菜谱，适合先看冰箱里有什么。</p>
</section>
<section class="ingredient-list">${[...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "zh-CN"))
    .map(([name, list]) => `<article><h2>${escapeHtml(name)}</h2><p>${list.map((recipe) => `<a href="${recipeUrl(recipe, 1)}">${escapeHtml(recipe.title)}</a>`).join(" / ")}</p></article>`)
    .join("")}</section>`;
  writePage("ingredients/index.html", page("食材索引", body, "食材", 1));
}

function writePage(file, html) {
  const target = path.join(outputDir, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, html);
}

resetOutput();
const recipes = readRecipes();
renderHome(recipes);
renderRecipeList(recipes);
renderRecipeDetails(recipes);
renderWeek();
renderIngredients(recipes);
console.log(`Built ${recipes.length} recipes into docs/`);
