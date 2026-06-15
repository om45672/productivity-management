// background.js (service worker)
const TASK_ALARM_PREFIX = 'task-';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Productivity Reminder installed');
  chrome.storage.local.get(['state'], res => {
    if (!res.state) {
      chrome.storage.local.set({ state: { tasks: [], streak: { current:0, lastAllCompleteDate: null }, prefs: {} }});
    }
  });
  // schedule alarms on install
  scheduleAllAlarms();
});

async function scheduleAllAlarms() {
  const res = await chrome.storage.local.get('state');
  const state = res.state || { tasks: [] };
  chrome.alarms.clearAll(() => {
    (state.tasks || []).forEach(task => {
      scheduleTaskAlarm(task);
    });
    // daily midnight check
    const midnight = computeNextMidnight();
    chrome.alarms.create('daily-midnight', { when: midnight, periodInMinutes: 24*60 });
  });
}

function computeNextMidnight() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0,0,5); // 5 sec after midnight
  return tomorrow.getTime();
}

function scheduleTaskAlarm(task) {
  if (!task || !task.dueAt) return;
  const when = (task.snoozedUntil && task.snoozedUntil > Date.now()) ? task.snoozedUntil : task.dueAt;
  const time = Number(when) || 0;
  if (time <= Date.now()) {
    chrome.alarms.create(`${TASK_ALARM_PREFIX}${task.id}`, { when: Date.now() + 1000 });
  } else {
    chrome.alarms.create(`${TASK_ALARM_PREFIX}${task.id}`, { when: time });
  }
}

chrome.alarms.onAlarm.addListener(async alarm => {
  if (!alarm || !alarm.name) return;
  if (alarm.name === 'daily-midnight') {
    // could compute missed tasks or reset daily flags if needed
    // For now, just logs and reschedule alarms.
    console.log('daily-midnight alarm fired');
    const res = await chrome.storage.local.get('state');
    if (res.state) {
      scheduleAllAlarms();
    }
    return;
  }
  if (alarm.name.startsWith(TASK_ALARM_PREFIX)) {
    const id = alarm.name.slice(TASK_ALARM_PREFIX.length);
    const res = await chrome.storage.local.get('state');
    const state = res.state || { tasks: [] };
    const task = (state.tasks || []).find(t => t.id === id);
    if (!task) return;
    const today = new Date().toISOString().slice(0,10);
    if (shouldRemind(task)) {
  chrome.notifications.create(`task-${id}-${Date.now()}`, {
    type: 'basic',
    title: 'Reminder: ' + task.title,
    message: 'Tap to view or mark complete',
    iconUrl: 'icons/icon128.png',
    priority: 2,
    buttons: [
      { title: 'Complete' },
      { title: 'Snooze 10m' }
    ]
  });

  broadcastShowInlineReminder(task);
}
  }
});

chrome.notifications.onButtonClicked.addListener(async (notifId, btnIndex) => {
  const m = notifId.match(/^task-(.+?)-\d+/);
  if (!m) return;
  const taskId = m[1];
  const res = await chrome.storage.local.get('state');
  const state = res.state || { tasks: [], streak: { current:0 } };
  const task = (state.tasks || []).find(t => t.id === taskId);
  if (!task) return;
  if (btnIndex === 0) {
    await markTaskComplete(taskId);
    chrome.notifications.clear(notifId);
  } else if (btnIndex === 1) {
    const snoozeMins = 10;
    task.snoozedUntil = Date.now() + snoozeMins * 60 * 1000;
    await chrome.storage.local.set({ state });
    chrome.alarms.create(`${TASK_ALARM_PREFIX}${taskId}`, { when: task.snoozedUntil });
    chrome.notifications.clear(notifId);
  }
});

chrome.notifications.onClicked.addListener(() => {
  try { chrome.action.openPopup(); } catch(e) { console.warn(e); }
});

async function markTaskComplete(taskId) {
  const res = await chrome.storage.local.get('state');
  const state = res.state;
  if (!state) return;
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  const today = new Date().toISOString().slice(0,10);
  task.completedForDay = today;
  task.snoozedUntil = null;
  await chrome.storage.local.set({ state });
  await checkAllTasksCompletedForTodayAndUpdateStreak(state);
}

async function checkAllTasksCompletedForTodayAndUpdateStreak(state) {
  const today = new Date().toISOString().slice(0,10);
  const allCompleted = (state.tasks || []).length > 0 && (state.tasks || []).every(t => t.completedForDay === today);
  if (allCompleted) {
    const last = state.streak?.lastAllCompleteDate;
    let curr = state.streak?.current || 0;
    const yesterday = new Date(Date.now() - 24*60*60*1000).toISOString().slice(0,10);
    if (last === today) {
      // already counted
    } else if (last === yesterday) {
      curr += 1;
    } else {
      curr = 1;
    }
    state.streak = { current: curr, lastAllCompleteDate: today };
    await chrome.storage.local.set({ state });
    chrome.notifications.create('', {
      type: 'basic',
      title: `All done — streak: ${curr} 🔥`,
      message: `Nice — you've completed all tasks for ${today}`,
      iconUrl: 'icons/icon128.png'
    });
  }
}

function broadcastShowInlineReminder(task) {
  chrome.tabs.query({}, tabs => {
    for (const t of tabs) {
      try {
        chrome.scripting.executeScript({
          target: { tabId: t.id },
          func: (task) => { window.postMessage({ type: 'SHOW_INLINE_REMINDER', task }, '*'); },
          args: [task]
        });
      } catch(e) {}
    }
  });
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.state) {
    scheduleAllAlarms();
  }
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (msg?.type === 'scheduleAll') {
    scheduleAllAlarms().then(() => reply({ ok: true }));
    return true;
  }
});


function sameDay(a, b){
  if(!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function addDays(date, n){
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function weekOfYear(d){
  d = new Date(d);
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - start) / 86400000) + start.getDay() + 1) / 7);
}


function shouldRemind(task){
  const now = new Date();

  // snoozed?
  if (task.snoozedUntil && now < new Date(task.snoozedUntil)) return false;

  // default if not set
  if (!task.frequency) return true;

  switch(task.frequency.type){

    case "once":
      return sameDay(now, task.dueAt) && !task.completedForDay;

    case "daily":
      return !sameDay(now, task.lastCompletedOn);

    case "weekly":
      return weekOfYear(now) !== weekOfYear(task.lastCompletedOn);

    case "monthly":
      return now.getMonth() !== new Date(task.lastCompletedOn).getMonth();

    case "custom":
      return now >= addDays(task.lastCompletedOn || task.dueAt, task.frequency.days);

    default:
      return true;
  }
}


