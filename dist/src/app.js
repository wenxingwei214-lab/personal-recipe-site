const cards = [...document.querySelectorAll(".recipe-card")];
const count = document.querySelector("#recipe-count");
const controls = {
  category: document.querySelector("#filter-category"),
  tag: document.querySelector("#filter-tag"),
  tool: document.querySelector("#filter-tool"),
  time: document.querySelector("#filter-time")
};

function applyFilters() {
  if (!cards.length) return;
  const active = {
    category: controls.category?.value || "",
    tag: controls.tag?.value || "",
    tool: controls.tool?.value || "",
    time: Number(controls.time?.value || 0)
  };
  let visible = 0;

  for (const card of cards) {
    const time = Number(card.dataset.time || 0);
    const pass =
      (!active.category || card.dataset.category === active.category) &&
      (!active.tag || card.dataset.tags.split(",").includes(active.tag)) &&
      (!active.tool || card.dataset.tools.split(",").includes(active.tool)) &&
      (!active.time || time <= active.time);

    card.hidden = !pass;
    if (pass) visible++;
  }

  if (count) count.textContent = visible;
}

for (const control of Object.values(controls)) {
  control?.addEventListener("change", applyFilters);
}

document.querySelector("#clear-filters")?.addEventListener("click", () => {
  for (const control of Object.values(controls)) {
    if (control) control.value = "";
  }
  applyFilters();
});

const params = new URLSearchParams(location.search);
if (params.has("category") && controls.category) {
  controls.category.value = params.get("category");
  applyFilters();
}
