// manager.js
import * as fb from "./manager-firebase.js";
import { auth, db } from "./manager-firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


/* DOM refs */
const navBtns = document.querySelectorAll(".nav-btn");
const panels = document.querySelectorAll(".panel");
const pageTitle = document.getElementById("pageTitle");
const managerName = document.getElementById("managerName");
const toast = document.getElementById("toast");

/* Overview DOM */
const pendingCount = document.getElementById("pendingCount");
const inProgressCount = document.getElementById("inProgressCount");
const completedCount = document.getElementById("completedCount");
const revenueSum = document.getElementById("revenueSum");
const activeStaff = document.getElementById("activeStaff");
const quickJobsList = document.getElementById("quickJobsList");

/* Jobs DOM */
const jobsTableBody = document.querySelector("#jobsTable tbody");
const filterStatus = document.getElementById("filterStatus");
const searchInput = document.getElementById("searchInput");
const refreshJobs = document.getElementById("refreshJobs");

/* Staff DOM */
const staffGrid = document.getElementById("staffGrid");

/* Reports DOM */
const reportsList = document.getElementById("reportsList");

/* Admin DOM */
const usersList = document.getElementById("usersList");

/* Activity DOM */
const activityLog = document.getElementById("activityLog");

/* state */
let jobsCache = [];
let usersCache = [];

/* navigation */
navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    navBtns.forEach(n => n.classList.remove("active"));
    btn.classList.add("active");
    panels.forEach(p => p.classList.remove("active"));
    const area = btn.dataset.area;
    document.getElementById(area).classList.add("active");
    pageTitle.textContent = btn.textContent;
    // load data for area
    if (area === "overview") loadOverview();
    if (area === "jobs") loadJobs();
    if (area === "staff") loadStaff();
    if (area === "reports") loadReports();
    if (area === "admin") loadUsers();
    if (area === "activity") loadActivity();
  });
});

/* initial load */
document.addEventListener("DOMContentLoaded", async () => {
  // Optionally set manager name if you store it in auth; using placeholder for now
  managerName.textContent = "Manager";
  await loadOverview();
});

/* utility */
function showToast(msg, time = 3000) {
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", time);
}

/* --- Overview --- */
async function loadOverview() {
  try {
    const data = await fb.getOverview();
    pendingCount.textContent = data.pending;
    inProgressCount.textContent = data.inProgress;
    completedCount.textContent = data.completed;
    revenueSum.textContent = `Kshs ${Number(data.revenue || 0).toLocaleString()}`;
    // active staff = number of unique assignedTo values among in-progress or pending
    const assigned = new Set(data.quick.filter(j => j.status === "In Progress").map(j => j.assignedTo).filter(Boolean));
    activeStaff.textContent = assigned.size || "0";

    // quick jobs (show top 8)
    quickJobsList.innerHTML = "";
    data.quick.slice(0, 8).forEach(j => {
      const el = document.createElement("div");
      el.className = "quick-item";
      el.innerHTML = `<strong>${j.plate}</strong> — ${j.status} — Ksh ${j.total}<br><small class="muted">${j.jobUUID || j.id}</small>`;
      quickJobsList.appendChild(el);
    });
  } catch (err) {
    console.error("Overview load error", err);
    showToast("Error loading overview");
  }
}

/* --- Jobs --- */
async function loadJobs() {
  try {
    const filter = { status: filterStatus.value, search: searchInput.value };
    const jobs = await fb.getJobs(filter);
    jobsCache = jobs;
    renderJobsTable(jobs);
  } catch (err) {
    console.error(err);
    showToast("Failed to load jobs");
  }
}

refreshJobs?.addEventListener("click", loadJobs);
filterStatus?.addEventListener("change", loadJobs);
searchInput?.addEventListener("input", () => {
  setTimeout(loadJobs, 250);
});

function renderJobsTable(jobs) {
  jobsTableBody.innerHTML = "";
  if (!jobs || !jobs.length) {
    jobsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--muted)">No jobs found</td></tr>`;
    return;
  }

  jobs.forEach(job => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><small>${job.jobUUID || ""}</small></td>
      <td>${job.plate || ""}</td>
      <td>${job.model || ""}</td>
      <td>${job.assignedTo || "—"}</td>
      <td>${job.status || "—"}</td>
      <td>Ksh ${job.total || 0}</td>
      <td>
        <button class="btn small" data-action="assign">Assign</button>
        <button class="btn small" data-action="toggle">${job.status === "Pending" ? "Start" : job.status === "In Progress" ? "Finish" : "Done"}</button>
        <button class="btn small danger" data-action="delete">Delete</button>
      </td>
    `;

    // attach handlers
    tr.querySelector('[data-action="assign"]').addEventListener("click", () => showAssignDialog(job));
    tr.querySelector('[data-action="toggle"]').addEventListener("click", () => toggleJobStatus(job));
    tr.querySelector('[data-action="delete"]').addEventListener("click", () => deleteJob(job));

    jobsTableBody.appendChild(tr);
  });
}

/* assign dialog (simple prompt) */
async function showAssignDialog(job) {
  try {
    // fetch users to offer assignment options
    const users = await fb.getUsers();
    const names = users.map(u => u.name || u.email || u.uid);
    const choice = prompt(`Assign job ${job.jobUUID || job.firestoreId}\nAvailable staff:\n${names.join("\n")}\n\nEnter exact name to assign:`);
    if (!choice) return;
    await fb.updateJobByDocId(job.firestoreId, { assignedTo: choice, updatedAt: new Date().toISOString() });
    showToast("Assigned successfully");
    loadJobs();
  } catch (err) {
    console.error(err);
    showToast("Failed to assign");
  }
}

/* toggle job status (Pending -> In Progress -> Completed) */
async function toggleJobStatus(job) {
  try {
    let next;
    if (job.status === "Pending") next = { status: "In Progress", startedAt: new Date().toISOString() };
    else if (job.status === "In Progress") next = { status: "Completed", completedAt: new Date().toISOString() };
    else { showToast("Job already completed"); return; }

    await fb.updateJobByDocId(job.firestoreId, { ...next, updatedAt: new Date().toISOString() });
    showToast("Job updated");
    loadJobs();
  } catch (err) {
    console.error(err);
    showToast("Failed to update job");
  }
}

/* delete job */
async function deleteJob(job) {
  if (!confirm(`Delete job ${job.jobUUID || job.firestoreId}? This can't be undone.`)) return;
  try {
    await fb.deleteJobByDocId(job.firestoreId);
    showToast("Job deleted");
    loadJobs();
  } catch (err) {
    console.error(err);
    showToast("Failed to delete job");
  }
}

/* --- Staff performance --- */
async function loadStaff() {
  try {
    // aggregate from users and jobs
    const users = await fb.getUsers();
    const jobs = await fb.getJobs({ status: "all", search: "" });

    staffGrid.innerHTML = "";
    users.forEach(u => {
      const completed = jobs.filter(j => j.assignedTo === u.name && j.status === "Completed").length;
      const inProgress = jobs.filter(j => j.assignedTo === u.name && j.status === "In Progress").length;
      const avgTime = computeAvgTimeForUser(jobs, u.name);

      const card = document.createElement("div");
      card.className = "staff-card";
      card.innerHTML = `
        <h4>${u.name || u.email || u.uid}</h4>
        <div class="meta">Completed: ${completed} • In Progress: ${inProgress}</div>
        <div class="meta">Avg time: ${avgTime}</div>
        <div class="progress"><i style="width:${Math.min(100,(completed*10))}%;"></i></div>
      `;
      staffGrid.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    showToast("Failed to load staff");
  }
}

function computeAvgTimeForUser(jobs, name) {
  const done = jobs.filter(j => j.assignedTo === name && j.startedAt && j.completedAt);
  if (!done.length) return "—";
  const totalMs = done.reduce((acc, j) => acc + (new Date(j.completedAt) - new Date(j.startedAt)), 0);
  const avgMs = totalMs / done.length;
  const mins = Math.round(avgMs / 60000);
  return `${mins} min`;
}

/* --- Reports (textual) --- */
async function loadReports() {
  try {
    const jobs = await fb.getJobs({ status: "all", search: "" });
    const totalRevenue = jobs.reduce((s, j) => s + Number(j.total || 0), 0);
    const mostPopular = computePopularServices(jobs);

    reportsList.innerHTML = "";
    const rows = [
      `Total jobs in system: ${jobs.length}`,
      `Total revenue: Ksh ${totalRevenue}`,
      `Most requested services: ${mostPopular.join(", ") || "—"}`
    ];
    rows.forEach(r => {
      const li = document.createElement("li");
      li.textContent = r;
      reportsList.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    showToast("Failed to load reports");
  }
}

/* --- Cash Reports --- */
const cashReportList = document.getElementById("cashReportList");
const cashReportDateFilter = document.getElementById("cashReportDateFilter");
const generateCashReportBtn = document.getElementById("generateCashReport");
const exportCashReportBtn = document.getElementById("exportCashReport");

generateCashReportBtn.addEventListener("click", async () => {
  await loadCashReport(cashReportDateFilter.value);
});

async function loadCashReport(filterValue) {
  loader.classList.remove("hidden");

  try {
    const jobs = await fb.getJobs({ status: "all", search: "" });
    const now = new Date();
    let startDate = null;

    switch (filterValue) {
      case "today": startDate = new Date(now.setHours(0, 0, 0, 0)); break;
      case "week": startDate = new Date(now.setDate(now.getDate() - 7)); break;
      case "month": startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
      case "3months": startDate = new Date(now.setMonth(now.getMonth() - 3)); break;
      case "year": startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
      default: startDate = null; break;
    }

    // Filter jobs by date
    const filteredJobs = startDate ? jobs.filter(j => new Date(j.createdAt) >= startDate) : jobs;

    // Calculate totals
    const paymentTotals = {};
    filteredJobs.forEach(j => {
      const method = j.payment || "Unknown";
      paymentTotals[method] = (paymentTotals[method] || 0) + Number(j.total || 0);
    });

    const totalRevenue = filteredJobs.reduce((sum, j) => sum + Number(j.total || 0), 0);

    // Render list
    cashReportList.innerHTML = "";
    Object.entries(paymentTotals).forEach(([method, amount]) => {
      const li = document.createElement("li");
      li.textContent = `${method}: Ksh ${amount.toLocaleString()}`;
      cashReportList.appendChild(li);
    });

    const liTotal = document.createElement("li");
    liTotal.textContent = `Total Revenue: Ksh ${totalRevenue.toLocaleString()} | Total Jobs: ${filteredJobs.length}`;
    cashReportList.appendChild(liTotal);

  } catch (err) {
    console.error("Cash report error", err);
    showToast("Failed to load cash report");
  } finally {
    loader.classList.add("hidden");
  }
}

/* --- Export Cash Report as CSV --- */
exportCashReportBtn.addEventListener("click", () => {
  if (!cashReportList.children.length) {
    showToast("Generate a report first");
    return;
  }

  const rows = Array.from(cashReportList.children).map(li => li.textContent);
  const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Cash_Report_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("Report exported!");
});



function computePopularServices(jobs) {
  const map = {};
  jobs.forEach(j => {
    (j.services || []).forEach(s => {
      map[s.name] = (map[s.name] || 0) + 1;
    });
  });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);
}

/* --- Admin: users --- */
async function loadUsers() {
  try {
    usersList.innerHTML = "Loading...";
    const users = await fb.getUsers();
    usersCache = users;
    usersList.innerHTML = "";
    if (!users.length) usersList.innerHTML = "<div class='muted'>No staff accounts found</div>";
    users.forEach(u => {
      const row = document.createElement("div");
      row.className = "user-row";
      row.innerHTML = `
        <div>
          <div><strong>${u.name || u.email || u.uid}</strong></div>
          <div class="meta">${u.role || "staff"} • ${u.email || ""}</div>
        </div>
        <div class="actions">
          <button class="btn small" data-uid="${u.uid}" data-action="remove">Remove</button>
        </div>
      `;
      row.querySelector('[data-action="remove"]').addEventListener("click", () => removeStaff(u));
      usersList.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    usersList.innerHTML = "<div class='muted'>Failed to load users</div>";
  }
}

async function removeStaff(user) {
  if (!confirm(`Remove staff ${user.name || user.email || user.uid}?`)) return;
  try {
    // 1) Delete from Firestore users collection
    await fb.deleteUserFromFirestore(user.uid);
    showToast("User removed from Firestore");

    // 2) Request auth deletion via server function
    try {
      const res = await fb.deleteAuthUserViaFunction(user.uid);
      if (res && res.success) {
        showToast("User removed from Auth");
      } else {
        showToast("Auth deletion failed (check server function)");
      }
    } catch (err) {
      console.warn("Auth deletion error (server function required):", err);
      showToast("Auth deletion failed: server function required");
    }

    // refresh list
    loadUsers();
  } catch (err) {
    console.error(err);
    showToast("Failed to remove staff");
  }
}

/* --- Activity Log --- */
async function loadActivity() {
  try {
    const items = await fb.getActivity(50);
    activityLog.innerHTML = "";
    items.forEach(it => {
      const el = document.createElement("div");
      el.className = "activity-item";
      el.innerHTML = `<div><strong>${it.plate}</strong> — ${it.status}</div><div class="meta small">${it.jobUUID || it.id} • ${it.time || ''}</div>`;
      activityLog.appendChild(el);
    });
  } catch (err) {
    console.error(err);
    activityLog.innerHTML = "<div class='muted'>Failed to load activity</div>";
  }
}

const loader = document.getElementById("loader");


// 🔹 FILTER LOGIC
document.getElementById("applyFilterBtn").addEventListener("click", async () => {
  const filterValue = document.getElementById("dateFilter").value;
  await applyFilter(filterValue);
});

async function applyFilter(filterValue) {
  const now = new Date();
  let startDate = null;

  switch (filterValue) {
    case "today":
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case "week":
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case "month":
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case "3months":
      startDate = new Date(now.setMonth(now.getMonth() - 3));
      break;
    case "year":
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = null; // "All time"
      break;
  }

  loader.classList.remove("hidden");

  try {
    const q = query(collection(db, "customer"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const jobs = [];

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const jobDate = new Date(data.createdAt);

      if (startDate) {
        if (jobDate >= startDate) {
          jobs.push({ id: docSnap.id, ...data });
        }
      } else {
        jobs.push({ id: docSnap.id, ...data });
      }
    });

    renderJobs(jobs);
  } catch (error) {
    console.error("❌ Error applying filter:", error);
  } finally {
    loader.classList.add("hidden");
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const welcomeMsg = document.getElementById("welcome-message");

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const firstName = (userData.name || userData.fullName || "Manager").split(" ")[0];
          welcomeMsg.textContent = `Welcome back, ${firstName} 👋`;
        } else {
          welcomeMsg.textContent = "Welcome, Manager 👋";
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        welcomeMsg.textContent = "Welcome, Manager 👋";
      }
    } else {
      window.location.href = "sign.html";
    }
  });
});




/* --- Universal Export Functionality --- */
document.querySelectorAll(".export-btn").forEach(btn => {
  btn.addEventListener("click", async () => {
    const targetId = btn.dataset.exportTarget;
    const container = document.getElementById(targetId);
    if (!container) return showToast("No data found to export");

    // Ask user format
    const format = prompt("Choose export format: csv / doc / pdf", "csv");
    if (!format) return;

    const items = Array.from(container.children).map(li => li.textContent || li.innerText);

    if (!items.length) return showToast("No data to export");

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `${targetId}_${dateStamp}`;

    switch (format.toLowerCase()) {
      case "csv":
        exportToCSV(items, filename);
        break;
      case "doc":
        exportToDOC(items, filename);
        break;
      case "pdf":
        exportToPDF(items, filename);
        break;
      default:
        showToast("Unknown format");
        break;
    }
  });
});

/* --- CSV --- */
function exportToCSV(items, filename) {
  const csvContent = "data:text/csv;charset=utf-8," + items.join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename + ".csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("CSV exported!");
}

/* --- DOC --- */
function exportToDOC(items, filename) {
  let content = items.map(i => i + "<br>").join("");
  const blob = new Blob(["<html><body>" + content + "</body></html>"], { type: "application/msword" });
  saveAs(blob, filename + ".doc");
  showToast("DOC exported!");
}

/* --- PDF --- */
function exportToPDF(items, filename) {
  const docDefinition = {
    content: items.map(i => ({ text: i, margin: [0, 2] })),
    defaultStyle: { fontSize: 12 }
  };
  pdfMake.createPdf(docDefinition).download(filename + ".pdf");
  showToast("PDF exported!");
}
