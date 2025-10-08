// manager-firebase.js
// This module exports functions used by manager.js to interact with Firestore.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth,
  // NOTE: client cannot delete other auth users securely; we will call a server function for that.
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  deleteDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

// ---------- CONFIG ----------
const firebaseConfig = {
  apiKey: "AIzaSyCT1Zb6b9qBDxa2nrqNu_6cSJ6jCKfq4yY",
  authDomain: "niapay-carwash.firebaseapp.com",
  projectId: "niapay-carwash",
  storageBucket: "niapay-carwash.firebasestorage.app",
  messagingSenderId: "994223696529",
  appId: "1:994223696529:web:97e8e7807cc7338878ed30",
  measurementId: "G-NKDCNQZND5"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- Exported Firestore helpers ----------

/**
 * Get overview stats from customer collection
 */
export async function getOverview() {
  const q = query(collection(db, "customer"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  let pending = 0, inProgress = 0, completed = 0, revenue = 0;
  const quick = [];

  snapshot.forEach((d) => {
    const data = d.data();
    if (data.status === "Pending") pending++;
    if (data.status === "In Progress") inProgress++;
    if (data.status === "Completed") completed++;
    if (data.total) revenue += Number(data.total || 0);

    // collect brief list
    quick.push({
      id: d.id,
      plate: data.plate,
      status: data.status,
      total: data.total || 0,
      jobUUID: data.jobUUID || ""
    });
  });

  return { pending, inProgress, completed, revenue, quick };
}

/**
 * Get jobs (optionally filtered)
 */
export async function getJobs(filter = { status: "all", search: "" }) {
  // simple approach: get all (sorted), filter client-side
  const q = query(collection(db, "customer"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const jobs = [];

  snapshot.forEach((d) => {
    jobs.push({ firestoreId: d.id, ...d.data() });
  });

  // client-side filter
  let filtered = jobs;
  if (filter.status && filter.status !== "all") {
    filtered = filtered.filter(j => j.status === filter.status);
  }
  if (filter.search && filter.search.trim()) {
    const s = filter.search.trim().toLowerCase();
    filtered = filtered.filter(j =>
      (j.plate && j.plate.toLowerCase().includes(s)) ||
      (j.jobUUID && j.jobUUID.toLowerCase().includes(s)) ||
      (j.firestoreId && j.firestoreId.toLowerCase().includes(s))
    );
  }

  return filtered;
}

/**
 * Update job fields by document id
 */
export async function updateJobByDocId(docId, updates) {
  const ref = doc(db, "customer", docId);
  return updateDoc(ref, updates);
}

/**
 * Delete job doc
 */
export async function deleteJobByDocId(docId) {
  const ref = doc(db, "customer", docId);
  return deleteDoc(ref);
}

/**
 * Get users list (from users collection)
 */
export async function getUsers() {
  const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const users = [];
  snapshot.forEach(d => users.push({ uid: d.id, ...d.data() }));
  return users;
}

/**
 * Delete user from Firestore (users collection)
 * For Auth deletion, call server endpoint below (deleteAuthUser).
 */
export async function deleteUserFromFirestore(uid) {
  const ref = doc(db, "users", uid);
  return deleteDoc(ref);
}

/**
 * Find job doc by jobUUID
 */
export async function findJobDocByUUID(jobUUID) {
  const q = query(collection(db, "customer"), where("jobUUID", "==", jobUUID));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, data: docSnap.data() };
}

/**
 * Get recent activity (most recent jobs by createdAt/updatedAt)
 */
export async function getActivity(limit = 30) {
  const q = query(collection(db, "customer"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  const items = [];
  snapshot.forEach(d => {
    const dt = d.data();
    items.push({
      id: d.id,
      plate: dt.plate,
      status: dt.status,
      jobUUID: dt.jobUUID || '',
      time: dt.updatedAt || dt.createdAt || ''
    });
  });
  return items.slice(0, limit);
}

/**
 * Call server function endpoint to delete auth user (server must implement)
 * Expects endpoint: POST /deleteUser with JSON { uid: "USER_UID" }
 * Returns JSON { success:true } or { success:false, error:"..." }
 */
export async function deleteAuthUserViaFunction(uid) {
  try {
    // Replace URL with your deployed Cloud Function endpoint
    const endpoint = "/deleteUser"; // placeholder; change to your function URL
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Function error: ${txt}`);
    }
    const json = await res.json();
    return json;
  } catch (err) {
    throw err;
  }
}




export { db, auth };
