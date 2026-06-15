// optional helpers 

export function sameDay(a, b){
  if(!a || !b) return false;
  return a.toDateString() === b.toDateString();
}

export function addDays(date, n){
  const d = new Date(date);
  d.setDate(d.getDate()+n);
  return d;
}

export function weekOfYear(d){
  const start = new Date(d.getFullYear(),0,1);
  return Math.ceil((((d-start)/86400000)+start.getDay()+1)/7);
}


function shouldRemind(task){
  const now = new Date();

  // snoozed?
  if (task.snoozedUntil && now < new Date(task.snoozedUntil)) return false;

  // no frequency = default daily
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
