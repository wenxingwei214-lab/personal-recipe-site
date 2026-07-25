const cards = [...document.querySelectorAll(".recipe-card")];
const count = document.querySelector("#recipe-count");
const searchInput = document.querySelector("#recipe-search");
const tagButtons = [...document.querySelectorAll("[data-filter-tag]")];
const timeButtons = [...document.querySelectorAll("[data-filter-time]")];

const state = {
  tag: "",
  values: [],
  time: 0,
  search: ""
};

function includesText(value, term) {
  return String(value || "").toLowerCase().includes(term);
}

function setActive(buttons, attr, value) {
  for (const button of buttons) {
    button.classList.toggle("active", button.dataset[attr] === value);
  }
}

function applyFilters() {
  if (!cards.length) return;
  const term = state.search.trim().toLowerCase();
  let visible = 0;

  for (const card of cards) {
    const tags = card.dataset.tags.split(",").filter(Boolean);
    const filterValues = state.values.length ? state.values : [state.tag].filter(Boolean);
    const text = [card.dataset.title, card.dataset.category, card.dataset.tags, card.dataset.tools].join(" ");
    const time = Number(card.dataset.time || 0);
    const passTag =
      !filterValues.length ||
      filterValues.some((value) => card.dataset.category === value || tags.includes(value));
    const passTime = !state.time || time <= state.time;
    const passSearch = !term || includesText(text, term);
    const pass = passTag && passTime && passSearch;

    card.hidden = !pass;
    if (pass) visible++;
  }

  if (count) count.textContent = visible;
}

for (const button of tagButtons) {
  button.addEventListener("click", () => {
    state.tag = button.dataset.filterTag || "";
    state.values = (button.dataset.filterValues || "").split(",").filter(Boolean);
    setActive(tagButtons, "filterTag", state.tag);
    applyFilters();
  });
}

for (const button of timeButtons) {
  button.addEventListener("click", () => {
    state.time = Number(button.dataset.filterTime || 0);
    setActive(timeButtons, "filterTime", String(button.dataset.filterTime || ""));
    applyFilters();
  });
}

searchInput?.addEventListener("input", () => {
  state.search = searchInput.value;
  applyFilters();
});

document.querySelector("#clear-filters")?.addEventListener("click", () => {
  state.tag = "";
  state.values = [];
  state.time = 0;
  state.search = "";
  if (searchInput) searchInput.value = "";
  setActive(tagButtons, "filterTag", "");
  setActive(timeButtons, "filterTime", "");
  applyFilters();
});

document.querySelector(".search-card")?.addEventListener("submit", (event) => {
  if (!searchInput) return;
  event.preventDefault();
  state.search = searchInput.value;
  applyFilters();
  document.querySelector("#recipes")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

const params = new URLSearchParams(location.search);
if (params.has("tag")) state.tag = params.get("tag") || "";
if (params.has("category")) state.tag = params.get("category") || "";
if (params.has("search")) {
  state.search = params.get("search") || "";
  if (searchInput) searchInput.value = state.search;
}

setActive(tagButtons, "filterTag", state.tag);
const activeTagButton = tagButtons.find((button) => button.dataset.filterTag === state.tag);
state.values = (activeTagButton?.dataset.filterValues || state.tag).split(",").filter(Boolean);
setActive(timeButtons, "filterTime", "");
applyFilters();
