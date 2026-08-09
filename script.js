// ---- Your Firebase config (already filled in) ----
const firebaseConfig = {
  apiKey: "AIzaSyAKsT82CGJtUFgxc1gV2NHXna8eToeT_UQ",
  authDomain: "isitjustme-db1ae.firebaseapp.com",
  projectId: "isitjustme-db1ae",
  storageBucket: "isitjustme-db1ae.firebasestorage.app",
  messagingSenderId: "651953681246",
  appId: "1:651953681246:web:51805e5b4d7c50330d95cf"
};

// ---- Initialize Firebase ----
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ---- Elements ----
const showReportBtn = document.getElementById("showReportBtn");
const showFeedBtn = document.getElementById("showFeedBtn");
const reportSection = document.getElementById("reportSection");
const feedSection = document.getElementById("feedSection");
const reportForm = document.getElementById("reportForm");
const reportStatus = document.getElementById("reportStatus");
const feedContainer = document.getElementById("feedContainer");
const searchArea = document.getElementById("searchArea");
const statTotal = document.getElementById("statTotal");
const statAreas = document.getElementById("statAreas");
const statConfirms = document.getElementById("statConfirms");
const filterChips = document.querySelectorAll(".chip");

let allReports = []; // cache of reports for filtering
let activeTypeFilter = "All";

// ---- Filter chip elements ----
const chips = document.querySelectorAll(".chip");

// ---- Toggle sections ----
showReportBtn.addEventListener("click", () => {
  reportSection.classList.remove("hidden");
  feedSection.classList.add("hidden");
  reportSection.scrollIntoView({ behavior: "smooth" });
});

showFeedBtn.addEventListener("click", () => {
  feedSection.classList.remove("hidden");
  reportSection.classList.add("hidden");
  feedSection.scrollIntoView({ behavior: "smooth" });
});

// ---- Submit a new report ----
reportForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const type = document.getElementById("type").value;
  const area = document.getElementById("area").value.trim();
  const note = document.getElementById("note").value.trim();

  if (!type || !area) return;

  try {
    await db.collection("reports").add({
      type: type,
      area: area,
      note: note,
      metoo: 0,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    reportStatus.textContent = "✅ Reported! Thank you for helping your community.";
    reportForm.reset();

    setTimeout(() => {
      reportStatus.textContent = "";
    }, 4000);
  } catch (err) {
    reportStatus.textContent = "❌ Something went wrong. Try again.";
    console.error(err);
  }
});

// ---- Live feed listener (real-time updates) ----
db.collection("reports")
  .orderBy("timestamp", "desc")
  .onSnapshot((snapshot) => {
    allReports = [];
    snapshot.forEach((doc) => {
      allReports.push({ id: doc.id, ...doc.data() });
    });
    updateStats(allReports);
    applyFilters();
  });

// ---- Update stats counters ----
function updateStats(reports) {
  const total = reports.length;
  const uniqueAreas = new Set(reports.map((r) => r.area.toLowerCase().trim())).size;
  const totalConfirms = reports.reduce((sum, r) => sum + (r.metoo || 0), 0);

  statTotal.textContent = total;
  statAreas.textContent = uniqueAreas;
  statConfirms.textContent = totalConfirms;
}

// ---- Filter chip clicks ----
chips.forEach((chip) => {
  chip.addEventListener("click", () => {
    chips.forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeTypeFilter = chip.getAttribute("data-filter");
    applyFilters();
  });
});

// ---- Apply both type filter + search filter together ----
function applyFilters() {
  const query = searchArea.value.toLowerCase().trim();
  let filtered = allReports;

  if (activeTypeFilter !== "All") {
    filtered = filtered.filter((r) => r.type === activeTypeFilter);
  }

  if (query) {
    filtered = filtered.filter((r) => r.area.toLowerCase().includes(query));
  }

  renderFeed(filtered);
}

// ---- Render feed cards ----
function renderFeed(reports) {
  feedContainer.innerHTML = "";

  if (reports.length === 0) {
    feedContainer.innerHTML = `<p class="empty-msg">No reports yet. Be the first to report!</p>`;
    return;
  }

  reports.forEach((report) => {
    const card = document.createElement("div");
    card.className = "report-card";

    const icon =
      report.type === "Power" ? "⚡" : report.type === "Water" ? "💧" : "📶";

    const timeAgo = report.timestamp
      ? timeSince(report.timestamp.toDate())
      : "just now";

    const metooCount = report.metoo || 0;
    let severityClass = "severity-low";
    let severityLabel = "🟡 Reported";
    if (metooCount >= 15) {
      severityClass = "severity-high";
      severityLabel = "🔴 Widespread Outage";
    } else if (metooCount >= 5) {
      severityClass = "severity-medium";
      severityLabel = "🟠 Confirmed";
    }

    card.innerHTML = `
      <div class="report-card-top">
        <span class="report-type">${icon} ${report.type} Outage</span>
        <span class="report-time">${timeAgo}</span>
      </div>
      <span class="severity-badge ${severityClass}">${severityLabel}</span>
      <div class="report-area">📍 ${report.area}</div>
      ${report.note ? `<div class="report-note">"${report.note}"</div>` : ""}
      <button class="metoo-btn" data-id="${report.id}" data-count="${report.metoo || 0}">
        🙋 Me too (${report.metoo || 0})
      </button>
    `;

    feedContainer.appendChild(card);
  });

  // attach "me too" click handlers
  document.querySelectorAll(".metoo-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      const currentCount = parseInt(btn.getAttribute("data-count"));
      await db
        .collection("reports")
        .doc(id)
        .update({ metoo: currentCount + 1 });
    });
  });
}

// ---- Search / filter by area ----
searchArea.addEventListener("input", () => {
  applyFilters();
});

// ---- Helper: readable "time ago" ----
function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}