/*
 * admin.js
 * Handles Admin features: search user, update credits, and view recent lookups.
 */

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const adminEmailSpan = document.getElementById('admin-email');
const logoutBtn = document.getElementById('btn-logout');
const errorMsg = document.getElementById('error-message');
const successMsg = document.getElementById('success-message');

const searchForm = document.getElementById('admin-search-form');
const searchEmailInput = document.getElementById('search-email');
const userDetailsPanel = document.getElementById('user-details-panel');
const foundUidSpan = document.getElementById('found-uid');
const foundEmailSpan = document.getElementById('found-email');
const foundRoleSpan = document.getElementById('found-role');
const foundCreditsSpan = document.getElementById('found-credits');
const addCreditsBtn = document.getElementById('btn-add-credits');
const removeCreditsBtn = document.getElementById('btn-remove-credits');

const refreshLogsBtn = document.getElementById('btn-refresh-logs');
const lookupsList = document.getElementById('lookups-list');

let currentAdminUid = null;
let targetUserUid = null;

function showMsg(element, msg, isError = false) {
  element.innerText = msg;
  element.classList.remove('hidden');
  if (isError) {
    element.classList.add('error-msg', 'glitch');
    element.setAttribute('data-text', msg);
  } else {
    element.classList.add('success-msg');
    element.classList.remove('error-msg', 'glitch');
  }
  setTimeout(() => {
    element.classList.add('hidden');
  }, 5000);
}

// Authentication Check for Admin role
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().role === "admin") {
      currentAdminUid = user.uid;
      adminEmailSpan.innerText = user.email;
      loadRecentLookups();
    } else {
      // Non-admin: show denial then redirect to login
      showMsg(errorMsg, "ACCESS DENIED. INSUFFICIENT CLEARANCE.", true);
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);
    }
  } else {
    // Not logged in at all
    showMsg(errorMsg, "ACCESS DENIED. INSUFFICIENT CLEARANCE.", true);
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  }
});

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });
}

// Search User by Email
if (searchForm) {
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailToSearch = searchEmailInput.value.trim();
    
    try {
      const q = query(collection(db, "users"), where("email", "==", emailToSearch));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        showMsg(errorMsg, "TARGET NOT FOUND IN SYSTEM", true);
        userDetailsPanel.classList.add('hidden');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      targetUserUid = userDoc.id;
      const userData = userDoc.data();

      foundUidSpan.innerText = targetUserUid;
      foundEmailSpan.innerText = userData.email || emailToSearch;
      foundRoleSpan.innerText = userData.role || "user";
      foundCreditsSpan.innerText = userData.credits ?? 0;
      
      userDetailsPanel.classList.remove('hidden');
      
    } catch (error) {
      showMsg(errorMsg, "DATABASE_ERROR_OCCURRED", true);
      console.error(error);
    }
  });
}

// Add Credits
async function modifyCredits(delta) {
  if (!targetUserUid) return;

  const amountStr = prompt(`Enter number of credits to ${delta > 0 ? 'ADD' : 'REMOVE'}:`);
  const amount = parseInt(amountStr, 10);

  if (isNaN(amount) || amount <= 0) {
    showMsg(errorMsg, "INVALID_INPUT_DATA", true);
    return;
  }

  try {
    const userRef = doc(db, "users", targetUserUid);
    const currentCredits = parseInt(foundCreditsSpan.innerText, 10) || 0;
    const newCredits = Math.max(0, currentCredits + (delta * amount));

    await updateDoc(userRef, { credits: newCredits });
    foundCreditsSpan.innerText = newCredits;
    showMsg(successMsg, `CREDITS ${delta > 0 ? 'ADDED' : 'REMOVED'} SUCCESSFULLY`);
  } catch (error) {
    showMsg(errorMsg, "WRITE_OPERATION_FAILED", true);
    console.error(error);
  }
}

if (addCreditsBtn) {
  addCreditsBtn.addEventListener('click', () => modifyCredits(1));
}

if (removeCreditsBtn) {
  removeCreditsBtn.addEventListener('click', () => modifyCredits(-1));
}

// Load Recent Lookups — no orderBy to avoid missing composite index
async function loadRecentLookups() {
  if (!currentAdminUid) return; // safety guard: only run when confirmed admin

  lookupsList.innerHTML = '<span class="blinking-cursor">FETCHING_LOGS...</span>';

  try {
    const querySnapshot = await getDocs(collection(db, "lookups"));

    if (querySnapshot.empty) {
      lookupsList.innerHTML = '<div class="list-item">NO_DATA_LOGGED_IN_SYSTEM...</div>';
      return;
    }

    // Sort client-side by timestamp descending, take latest 10
    const docs = [];
    querySnapshot.forEach((d) => docs.push({ id: d.id, ...d.data() }));
    docs.sort((a, b) => {
      const ta = a.timestamp ? a.timestamp.toMillis() : 0;
      const tb = b.timestamp ? b.timestamp.toMillis() : 0;
      return tb - ta;
    });

    lookupsList.innerHTML = '';
    docs.slice(0, 10).forEach((data) => {
      const div = document.createElement('div');
      div.className = 'list-item';
      const timeStr = data.timestamp ? data.timestamp.toDate().toLocaleString() : 'UNKNOWN_TIME';
      div.innerHTML = `<strong>UID:</strong> ${(data.uid || '?').substring(0, 6)}... | <strong>TARGET:</strong> ${data.mobile || '?'} | <strong>TIME:</strong> ${timeStr}`;
      lookupsList.appendChild(div);
    });

  } catch (error) {
    console.error("loadRecentLookups error:", error);
    lookupsList.innerHTML = '<div class="list-item error-msg">ERROR_FETCHING_LOGS: ' + error.code + '</div>';
  }
}

if (refreshLogsBtn) {
  refreshLogsBtn.addEventListener('click', loadRecentLookups);
}
