const views = {
  subscribe: document.getElementById("view-subscribe"),
  confirm: document.getElementById("view-confirm"),
  dashboard: document.getElementById("view-dashboard"),
  unsubscribe: document.getElementById("view-unsubscribe"),
};

const toast = document.getElementById("toast");
const state = { pendingEmail: "" };

const showToast = (message, isError = false) => {
  toast.textContent = message;
  toast.className = `toast ${isError ? "error" : "success"}`;
  toast.removeAttribute("hidden");
  setTimeout(() => toast.setAttribute("hidden", "true"), 5000);
};

const apiCall = async (url, options = {}) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "An error occurred");
    }
    const contentType = response.headers.get("content-type");
    return contentType?.includes("application/json") ? response.json() : null;
  } catch (error) {
    showToast(error.message, true);
    throw error;
  }
};

const showView = (viewName) => {
  Object.values(views).forEach((v) => {
    v.setAttribute("hidden", "true");
  });
  views[viewName].removeAttribute("hidden");
};

const loadDashboard = async () => {
  const email = localStorage.getItem("userEmail");
  document.getElementById("dash-email-display").textContent = email;
  const tbody = document.getElementById("table-body");
  tbody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';

  try {
    const data = await apiCall(
      `/api/subscriptions?email=${encodeURIComponent(email)}`,
    );
    tbody.innerHTML = "";
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No subscriptions found.</td></tr>';
      return;
    }
    data.forEach((sub) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
                <td><code>${sub.repo}</code></td>
                <td>${sub.confirmed ? "Active" : "Pending"}</td>
                <td>${sub.last_seen_tag || "-"}</td>
            `;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML =
      '<tr><td colspan="3">Failed to load subscriptions.</td></tr>';
  }
};

const init = () => {
  if (localStorage.getItem("userEmail")) {
    showView("dashboard");
    loadDashboard();
  } else {
    showView("subscribe");
  }
};

document
  .getElementById("form-subscribe")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("sub-email").value.trim();
    const repo = document.getElementById("sub-repo").value.trim();
    const btn = e.target.querySelector("button");

    btn.setAttribute("aria-busy", "true");
    try {
      await apiCall("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, repo }),
      });
      state.pendingEmail = email;
      showToast("Token sent to email");
      showView("confirm");
      e.target.reset();
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });

document
  .getElementById("form-confirm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const token = document.getElementById("confirm-token").value.trim();
    const btn = e.target.querySelector("button");

    btn.setAttribute("aria-busy", "true");
    try {
      await apiCall(`/api/confirm/${encodeURIComponent(token)}`);
      showToast("Subscription confirmed");
      localStorage.setItem("userEmail", state.pendingEmail);
      showView("dashboard");
      loadDashboard();
      e.target.reset();
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });

document
  .getElementById("form-add-repo")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = localStorage.getItem("userEmail");
    const repo = document.getElementById("add-repo-name").value.trim();
    const btn = e.target.querySelector("button");

    btn.setAttribute("aria-busy", "true");
    try {
      await apiCall("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, repo }),
      });
      showToast("Token sent to email. Please confirm.");
      state.pendingEmail = email;
      showView("confirm");
      e.target.reset();
    } finally {
      btn.removeAttribute("aria-busy");
    }
  });

const handleUnsubscribe = async (e, inputId) => {
  e.preventDefault();
  const token = document.getElementById(inputId).value.trim();
  const btn = e.target.querySelector("button");

  btn.setAttribute("aria-busy", "true");
  try {
    await apiCall(`/api/unsubscribe/${encodeURIComponent(token)}`);
    showToast("Unsubscribed successfully");
    e.target.reset();
    if (localStorage.getItem("userEmail")) {
      loadDashboard();
    }
  } finally {
    btn.removeAttribute("aria-busy");
  }
};

document
  .getElementById("form-dashboard-unsub")
  .addEventListener("submit", (e) => handleUnsubscribe(e, "dash-unsub-token"));
document
  .getElementById("form-unsub-only")
  .addEventListener("submit", (e) => handleUnsubscribe(e, "unsub-only-token"));

document.getElementById("link-logout").addEventListener("click", (e) => {
  e.preventDefault();
  localStorage.removeItem("userEmail");
  state.pendingEmail = "";
  showView("subscribe");
});

document.getElementById("link-to-unsub").addEventListener("click", (e) => {
  e.preventDefault();
  showView("unsubscribe");
});

document.getElementById("link-to-sub").addEventListener("click", (e) => {
  e.preventDefault();
  showView("subscribe");
});

init();
