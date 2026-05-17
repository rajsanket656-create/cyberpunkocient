/*
 * dashboard.js
 * Handles OSINT Dashboard Lookups.
 * Authenticates user, displays credits, deductions, and makes the API call.
 */

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp, increment } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const userEmailSpan = document.getElementById('user-email');
const creditCountSpan = document.getElementById('credit-count');
const logoutBtn = document.getElementById('btn-logout');
const lookupForm = document.getElementById('lookup-form');
const mobileInput = document.getElementById('mobile-number');
const resultOutput = document.getElementById('result-output');
const errorMsg = document.getElementById('error-message');

let currentUserUid = null;
let currentCredits = 0;

function showMsg(element, msg, isError = false) {
  element.innerText = msg;
  element.classList.remove('hidden');
  if (isError) {
    element.classList.add('error-msg', 'glitch');
    element.setAttribute('data-text', msg);
  } else {
    element.classList.remove('error-msg', 'glitch');
  }
  setTimeout(() => {
    element.classList.add('hidden');
  }, 5000);
}

function typeResult(text) {
  resultOutput.innerHTML = '';
  // Convert API JSON to a cool string block
  const lines = text.split('\n');
  let i = 0;

  const interval = setInterval(() => {
    if (i < lines.length) {
      const p = document.createElement('div');
      p.innerText = lines[i];
      resultOutput.appendChild(p);
      resultOutput.scrollTop = resultOutput.scrollHeight;
      i++;
    } else {
      clearInterval(interval);
      const cursor = document.createElement('span');
      cursor.className = 'blinking-cursor';
      cursor.innerText = "WAITING_FOR_INPUT";
      resultOutput.appendChild(cursor);
    }
  }, 50); // Typing speed
}

// Authentication Check
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    currentUserUid = user.uid;
    userEmailSpan.innerText = user.email;

    // Fetch Credits
    const userDocRef = doc(db, "users", currentUserUid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      currentCredits = userSnap.data().credits;
      creditCountSpan.innerText = currentCredits;
    } else {
      // Fallback creation if doc somehow missing
      await setDoc(userDocRef, {
        email: user.email,
        credits: 0,
        role: "user"
      });
      currentCredits = 0;
      creditCountSpan.innerText = currentCredits;
    }
  } else {
    // Redirect if not logged in or not verified
    window.location.href = "index.html";
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

// OSINT Lookup
if (lookupForm) {
  lookupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mobileNumber = mobileInput.value.trim();

    if (currentCredits <= 0) {
      showMsg(errorMsg, "INSUFFICIENT CREDITS", true);
      return;
    }

    // Temporary Loading
    resultOutput.innerHTML = '<span class="blinking-cursor">EXECUTING_QUERY...</span>';
    const copyBtn = document.getElementById('btn-copy');
    if(copyBtn) copyBtn.classList.add('hidden');

    try {
      // Auto-detect: use local proxy in dev, Cloud Function in production
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const lookupUrl = isLocal
        ? `http://localhost:3001/lookup?mobile=${encodeURIComponent(mobileNumber)}`
        : `/api/lookup/${encodeURIComponent(mobileNumber)}`;

      const response = await fetch(lookupUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Check for API-level failure
      if (!data || data.success === false) {
        throw new Error("API returned failure: " + JSON.stringify(data));
      }

      // Check if actual data exists (data.result.data can be {} when no results)
      const resultData = data?.result?.data;
      const isDataArray = Array.isArray(resultData) && resultData.length > 0;
      if (!isDataArray) {
        // No records found — don't deduct credit
        resultOutput.innerHTML = '';
        const noData = document.createElement('div');
        noData.innerText = 'NO DATA FOUND FOR THIS NUMBER.';
        resultOutput.appendChild(noData);
        const cursor = document.createElement('span');
        cursor.className = 'blinking-cursor';
        cursor.innerText = 'WAITING_FOR_INPUT';
        resultOutput.appendChild(cursor);
        return;
      }

      // Deduct Credit
      const userDocRef = doc(db, "users", currentUserUid);
      await updateDoc(userDocRef, {
        credits: increment(-1)
      });
      currentCredits -= 1;
      creditCountSpan.innerText = currentCredits;

      // Log in lookups collection
      await addDoc(collection(db, "lookups"), {
        uid: currentUserUid,
        mobile: mobileNumber,
        result: data,
        timestamp: serverTimestamp()
      });

      // Show Result — clean formatted output (resultData & isDataArray already checked above)
      const firstResult = resultData[0];
      const summary = {
        success: data?.success,
        owner: "@Blackhat09090",
        result: {
          count: data?.result?.total_records
        }
      };
      const formatted =
        `TARGET FOUND.\n` +
        JSON.stringify(summary, null, 2) +
        `\n\n` +
        JSON.stringify(firstResult, null, 2);
      typeResult(formatted);
      
      // Reveal the exact moment results are typed
      const copyBtn = document.getElementById('btn-copy');
      if(copyBtn) {
        copyBtn.classList.remove('hidden');
        copyBtn.onclick = async () => {
          try {
            await navigator.clipboard.writeText(formatted);
            const originalHTML = copyBtn.innerHTML;
            copyBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
            copyBtn.style.color = '#00ff41';
            copyBtn.style.borderColor = '#00ff41';
            setTimeout(() => {
              copyBtn.innerHTML = originalHTML;
              copyBtn.style.color = '';
              copyBtn.style.borderColor = '';
            }, 2000);
          } catch(err) {
            console.error('Failed to copy', err);
          }
        }
      }

    } catch (error) {
      resultOutput.innerHTML = '<span class="blinking-cursor">WAITING_FOR_INPUT</span>';
      showMsg(errorMsg, "ERROR: FAILED_TO_CONNECT_TO_API_NODE", true);
      console.error("Lookup failed:", error);
      
      const copyBtn = document.getElementById('btn-copy');
      if(copyBtn) copyBtn.classList.add('hidden');
    }
  });
}
