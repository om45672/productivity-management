// content_script.js — shadow DOM protected overlay

window.addEventListener("message", (event) => {
  if (event.data?.type === "SHOW_INLINE_REMINDER") {
    showOverlay(event.data.task);
  }
});

function showOverlay(task) {
  if (document.getElementById("pr-shadow-host")) return;

  // Create shadow-host wrapper
  const host = document.createElement("div");
  host.id = "pr-shadow-host";
  host.style.position = "fixed";
  host.style.bottom = "20px";
  host.style.right = "20px";
  host.style.zIndex = "2147483647";
  host.style.pointerEvents = "none"; // overlay contents re-enable it
  document.body.appendChild(host);

  // Attach Shadow DOM (isolated from page CSS)
  const shadow = host.attachShadow({ mode: "open" });

  // Main container inside shadow DOM
  const container = document.createElement("div");
  container.classList.add("pr-box");
  container.style.pointerEvents = "auto"; // enable interaction
  shadow.appendChild(container);

  // Close button
  const close = document.createElement("button");
  close.textContent = "×";
  close.className = "pr-close";
  close.onclick = () => host.remove();
  container.appendChild(close);

  // Content
  const wrap = document.createElement("div");
  wrap.className = "pr-content";
  wrap.innerHTML = `
    <div class="pr-logo">PR</div>
    <div class="pr-text">
      <div class="pr-title">${escapeHtml(task.title)}</div>
      <div class="pr-sub">Click the extension popup to manage tasks.</div>
    </div>
  `;
  container.appendChild(wrap);

  // Styles 
  const style = document.createElement("style");
  style.textContent = `
    .pr-box {
      width: 260px;
      background: #111;
      border: 1px solid rgba(214,199,182,0.2);
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      color: #d6c7b6;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      animation: prDrop 0.4s ease-out;
      font-family: Inter, system-ui, sans-serif;
    }

    .pr-content {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .pr-logo {
      width: 45px;
      height: 45px;
      background: rgba(214,199,182,0.08);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      color: #d6c7b6;
    }

    .pr-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 3px;
    }

    .pr-sub {
      font-size: 12px;
      color: #9d948c;
    }

    .pr-close {
      position: absolute;
      top: 4px;
      right: 6px;
      background: transparent;
      border: none;
      color: #d6c7b6;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      line-height: 12px;
    }

    @keyframes prDrop {
      0% { transform: translateY(20px); opacity:0; }
      100% { transform: translateY(0); opacity:1; }
    }
  `;
  shadow.appendChild(style);

  // Auto-remove after 20s
  setTimeout(() => { if (host) host.remove(); }, 20000);
}

function escapeHtml(s) {
  return s
    ? s.replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c]))
    : "";
}
