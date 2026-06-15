const titleInput = document.getElementById("taskTitle");
const dateInput = document.getElementById("taskDate");
const timeInput = document.getElementById("taskTime");

const addBtn = document.getElementById("addBtn");
const list = document.getElementById("taskList");
const empty = document.getElementById("empty");
const streakEl = document.getElementById("streak");

// ------------------ UTIL ------------------

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ------------------ THEME ------------------

async function applyTheme() {
  const { theme = "dark" } = await chrome.storage.local.get("theme");
  document.body.classList.remove("dark", "light");
  document.body.classList.add(theme);
  document.getElementById("themeToggle").textContent =
    theme === "dark" ? "🌙" : "☀️";
}

document.getElementById("themeToggle").onclick = async () => {
  const { theme = "dark" } = await chrome.storage.local.get("theme");
  await chrome.storage.local.set({ theme: theme === "dark" ? "light" : "dark" });
  applyTheme();
};

applyTheme();

// ------------------ FREQUENCY PANEL ------------------

function getSelectedFrequency() {
  const radio = document.querySelector('input[name="freq"]:checked');

  if (!radio) return { type: "once" };   // <-- safest default

  if (radio.value === "custom") {
    const d = parseInt(document.getElementById("customDays")?.value || "2");
    return { type: "custom", days: d };
  }

  return { type: radio.value };
}

document.getElementById("openFrequency").onclick = () => {
  document.getElementById("frequencyPanel")?.classList.toggle("hidden");
};

// ------------------ RENDER TASKS ------------------

async function load() {
  const { state } = await chrome.storage.local.get("state");
  const s = state || { tasks: [], streak: { current: 0 } };

  streakEl.textContent = `🔥 ${s.streak?.current || 0}`;
  render(s.tasks || []);
}

function render(tasks) {
  list.innerHTML = "";
  empty.style.display = tasks.length ? "none" : "block";

  const today = new Date().toISOString().slice(0, 10);

  tasks.forEach(t => {
    const div = document.createElement("div");
    div.className = "task" + (t.completedForDay === today ? " done" : "");

    div.innerHTML = `
      <span class="title">${t.title}</span>
      <div class="actions">
        <button class="doneBtn">✓</button>
        <button class="deleteBtn">✕</button>
      </div>
    `;

    div.querySelector(".doneBtn").onclick = () => toggle(t.id);
    div.querySelector(".deleteBtn").onclick = () => removeTask(t.id);

    list.appendChild(div);
  });
}

// ------------------ TOGGLE TASK ------------------

async function toggle(id) {
  const { state } = await chrome.storage.local.get("state");
  const today = new Date().toISOString().slice(0, 10);

  const task = state.tasks.find(t => t.id === id);
  task.completedForDay = task.completedForDay === today ? null : today;

  if (task.completedForDay) task.lastCompletedOn = new Date().toISOString();

  await chrome.storage.local.set({ state });
  chrome.runtime.sendMessage({ type: "scheduleAll" });
  load();
}

// ------------------ DELETE TASK ------------------

async function removeTask(id) {
  const { state } = await chrome.storage.local.get("state");
  state.tasks = state.tasks.filter(t => t.id !== id);

  await chrome.storage.local.set({ state });
  chrome.runtime.sendMessage({ type: "scheduleAll" });
  load();
}

// ------------------ ADD TASK ------------------

addBtn.onclick = async () => {
  if (!titleInput.value.trim()) return;

  let due = null;

  if (dateInput.value) {
    due = new Date(`${dateInput.value}T${timeInput.value || "09:00"}`).getTime();
  }

  const { state } = await chrome.storage.local.get("state");

  state.tasks.push({
    id: uid(),
    title: titleInput.value,
    dueAt: due,
    completedForDay: null,
    lastCompletedOn: null,
    snoozedUntil: null,
    frequency: getSelectedFrequency()
  });

  await chrome.storage.local.set({ state });
  chrome.runtime.sendMessage({ type: "scheduleAll" });

  titleInput.value = "";
  dateInput.value = "";
  timeInput.value = "";

  load();
};

// ------------------ INIT ------------------

load();
