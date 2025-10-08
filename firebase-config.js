// ==============================
// IMPORTS
// ==============================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";


// ==============================
// FIREBASE CONFIGURATION
// ==============================
const firebaseConfig = {
  apiKey: "AIzaSyCT1Zb6b9qBDxa2nrqNu_6cSJ6jCKfq4yY",
  authDomain: "niapay-carwash.firebaseapp.com",
  projectId: "niapay-carwash",
  storageBucket: "niapay-carwash.appspot.com", // ✅ fixed storage bucket
  messagingSenderId: "994223696529",
  appId: "1:994223696529:web:97e8e7807cc7338878ed30",
  measurementId: "G-NKDCNQZND5"
};

// ==============================
// INITIALIZE FIREBASE
// ==============================
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
getAnalytics(app);


// ==============================
// SIGN UP FUNCTION
// ==============================
async function signUpUser(name, email, password, confirmPassword, role) {
  if (password !== confirmPassword) {
    showPopup("Passwords do not match.", "error");
    return;
  }

  try {
    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store user info in Firestore (under 'users' collection)
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: name,
      email: email,
      role: role,
      createdAt: new Date().toISOString()
    });

    showPopup("Account created successfully!", "success");

    // Redirect based on role
    setTimeout(() => {
      if (role === "manager") {
        window.location.href = "manager.html";
      } else {
        window.location.href = "staff.html";
      }
    }, 1500);

  } catch (error) {
    console.error("SignUp Error:", error);
    showPopup(error.message, "error");
  }
}


// ==============================
// LOGIN FUNCTION
// ==============================
async function signInUser(name, email, password, role) {
  try {
    // Sign in the user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Fetch Firestore user data
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();

      // Verify role match
      if (userData.role !== role) {
        showPopup("Role mismatch! Check your login role.", "error");
        return;
      }

      showPopup(`Welcome back, ${userData.name}!`, "success");

      setTimeout(() => {
        if (userData.role === "manager") {
          window.location.href = "manager.html";
        } else {
          window.location.href = "staff.html";
        }
      }, 1500);

    } else {
      showPopup("User data not found in database.", "error");
    }
  } catch (error) {
    console.error("Login Error:", error);
    showPopup(error.message, "error");
  }
}


// ==============================
// POPUP FUNCTION
// ==============================
function showPopup(message, type) {
  const popup = document.createElement("div");
  popup.className = `popup ${type}`;
  popup.textContent = message;
  document.body.appendChild(popup);

  setTimeout(() => popup.remove(), 3000);
}


// ==============================
// EVENT LISTENERS
// ==============================
document.getElementById("signupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();
  const confirm = document.getElementById("signupConfirm").value.trim();
  const role = document.getElementById("signupRole").value;
  signUpUser(name, email, password, confirm, role);
});

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("loginName").value.trim();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();
  const role = document.getElementById("loginRole").value;
  signInUser(name, email, password, role);
});

export { auth, db };
