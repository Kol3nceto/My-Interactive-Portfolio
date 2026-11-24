(() => {
  "use strict";

  /* ======================================================================
     Constants
     ====================================================================== */

  const GOALS_KEY = "portfolio.goals.v1";
  const THEME_KEY = "portfolio.theme.v1";

  const DEFAULT_GOALS = [
    "Уча JavaScript",
    "Уча Git и GitHub",
    "Уча адаптивен дизайн с CSS",
  ];

  const EMPTY_MESSAGES = {
    all: "Все още нямаш учебни цели. Добави първата си цел по-горе.",
    active: "Няма активни цели – браво или добави нова!",
    completed: "Все още няма завършени цели.",
  };

  /* ======================================================================
     DOM references
     ====================================================================== */

  const $ = (id) => document.getElementById(id);

  const form = $("goal-form");
  const input = $("goal-input");
  const formMessage = $("form-message");
  const list = $("goal-list");
  const emptyMessage = $("empty-message");
  const statTotal = $("stat-total");
  const statDone = $("stat-done");
  const statPercent = $("stat-percent");
  const progress = $("progress");
  const progressFill = $("progress-fill");
  const filterButtons = document.querySelectorAll("[data-filter]");
  const themeToggle = $("theme-toggle");
  const dialog = $("confirm-dialog");
  const confirmText = $("confirm-text");
  const confirmYes = $("confirm-yes");
  const confirmNo = $("confirm-no");

  /* ======================================================================
     Storage helpers (localStorage can be blocked, so always guard it)
     ====================================================================== */

  const readStorage = (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const writeStorage = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore: the app keeps working, it just won't persist.
    }
  };

  /* ======================================================================
     Text helpers
     ====================================================================== */

  /** Trim and collapse repeated whitespace: "  a   b " -> "a b". */
  const normalize = (text) => text.trim().replace(/\s+/g, " ");

  /** Comparison key, so "Уча JavaScript" and " уча javascript " match. */
  const toKey = (text) => normalize(text).toLocaleLowerCase("bg");

  const createId = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  const createDefaultGoals = () =>
    DEFAULT_GOALS.map((text) => ({ id: createId(), text, done: false }));

  /* ======================================================================
     State
     ====================================================================== */

  let goals = [];
  let currentFilter = "all";
  let goalToDelete = null;

  const loadGoals = () => {
    const raw = readStorage(GOALS_KEY);

    // First visit: nothing saved yet, so start with the default goals.
    if (raw === null) return createDefaultGoals();

    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error("Invalid data");

      return data
        .filter((g) => g && typeof g.text === "string" && g.text.trim())
        .map((g) => ({
          id: String(g.id || createId()),
          text: normalize(g.text),
          done: g.done === true,
        }));
    } catch {
      return createDefaultGoals();
    }
  };

  const saveGoals = () => writeStorage(GOALS_KEY, JSON.stringify(goals));

  /* ======================================================================
     Rendering
     ====================================================================== */

  const filterGoals = () =>
    goals.filter((goal) => {
      if (currentFilter === "active") return !goal.done;
      if (currentFilter === "completed") return goal.done;
      return true;
    });

  const renderStats = () => {
    const total = goals.length;
    const done = goals.filter((goal) => goal.done).length;
    // Always based on ALL goals, regardless of the selected filter.
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    statTotal.textContent = total;
    statDone.textContent = done;
    statPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    progress.setAttribute("aria-valuenow", percent);
  };

  const createGoalItem = (goal) => {
    const item = document.createElement("li");
    item.className = goal.done ? "goal is-done" : "goal";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `goal-${goal.id}`;
    checkbox.checked = goal.done;
    checkbox.addEventListener("change", () => toggleGoal(goal.id));

    // textContent (never innerHTML) keeps user text from running as HTML.
    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = goal.text;

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-danger";
    deleteButton.textContent = "Изтрий";
    deleteButton.setAttribute("aria-label", `Изтрий целта: ${goal.text}`);
    deleteButton.addEventListener("click", () => askToDelete(goal));

    item.append(checkbox, label, deleteButton);
    return item;
  };

  const renderList = () => {
    const visible = filterGoals();

    list.replaceChildren(...visible.map(createGoalItem));

    emptyMessage.hidden = visible.length > 0;
    if (visible.length === 0) {
      emptyMessage.textContent =
        goals.length === 0 ? EMPTY_MESSAGES.all : EMPTY_MESSAGES[currentFilter];
    }

    filterButtons.forEach((button) => {
      const isActive = button.dataset.filter === currentFilter;
      button.setAttribute("aria-pressed", String(isActive));
    });
  };

  const render = () => {
    renderStats();
    renderList();
  };

  /* ======================================================================
     Actions
     ====================================================================== */

  const showMessage = (text = "") => {
    formMessage.textContent = text;
  };

  const addGoal = (rawText) => {
    const text = normalize(rawText);

    if (!text) {
      showMessage(
        "Моля, въведи цел – празно поле или само интервали не се приема."
      );
      return false;
    }

    const isDuplicate = goals.some((goal) => toKey(goal.text) === toKey(text));
    if (isDuplicate) {
      showMessage("Тази цел вече съществува в списъка.");
      return false;
    }

    goals.push({ id: createId(), text, done: false });
    saveGoals();
    showMessage();
    render();
    return true;
  };

  const toggleGoal = (id) => {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    goal.done = !goal.done;
    saveGoals();
    render();
  };

  const deleteGoal = (id) => {
    goals = goals.filter((goal) => goal.id !== id);
    saveGoals();
    render();
  };

  const askToDelete = (goal) => {
    goalToDelete = goal;
    confirmText.textContent = `Сигурен ли си, че искаш да изтриеш целта „${goal.text}“?`;

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else if (window.confirm(confirmText.textContent)) {
      confirmDelete();
    }
  };

  const confirmDelete = () => {
    if (goalToDelete) deleteGoal(goalToDelete.id);
    goalToDelete = null;
  };

  /* ======================================================================
     Theme
     ====================================================================== */

  const getTheme = () => {
    const explicit = document.documentElement.dataset.theme;
    if (explicit) return explicit;

    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  };

  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    themeToggle.textContent =
      theme === "dark" ? "☀️ Светла тема" : "🌙 Тъмна тема";
  };

  const toggleTheme = () => {
    const next = getTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    writeStorage(THEME_KEY, next);
  };

  /* ======================================================================
     Event listeners
     ====================================================================== */

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (addGoal(input.value)) input.value = "";
  });

  input.addEventListener("input", () => showMessage());

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      renderList();
    });
  });

  confirmYes.addEventListener("click", () => {
    dialog.close();
    confirmDelete();
  });

  confirmNo.addEventListener("click", () => {
    dialog.close();
    goalToDelete = null;
  });

  dialog.addEventListener("cancel", () => {
    goalToDelete = null;
  });

  themeToggle.addEventListener("click", toggleTheme);

  /* ======================================================================
     Init
     ====================================================================== */

  applyTheme(getTheme());
  goals = loadGoals();
  saveGoals();
  render();
})();
