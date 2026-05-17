/*
 * auth.js
 * Handles User Registration, Login, Logout, and Email Verification.
 */

import { auth, db } from "./firebase-config.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const loginBtn = document.getElementById('btn-login');
const registerBtn = document.getElementById('btn-register');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-message');
const successMsg = document.getElementById('success-message');

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

// Ensure user is not already logged in
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    // If logged in and verified, check role and redirect
    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      // CREATE user document ONLY AFTER email is verified if it doesn't exist
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          email: user.email,
          credits: 0,
          role: "user"
        });
        window.location.href = "dashboard.html";
        return;
      }

      if (docSnap.data().role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }
    } catch (e) {
      console.error(e);
      window.location.href = "dashboard.html";
    }
  }
});

const resendBtn = document.getElementById('btn-resend');

if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
      showMsg(errorMsg, "ERROR: INCOMPLETE_CREDENTIALS", true);
      return;
    }

    // Hide resend button on new login attempt
    if (resendBtn) resendBtn.classList.add('hidden');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        showMsg(errorMsg, "ERROR: UNVERIFIED NODE. RESTRICTED ACCESS", true);
        if (resendBtn) resendBtn.classList.remove('hidden');
        auth.signOut();
        return;
      }

      showMsg(successMsg, "AUTHENTICATION_SUCCESSFUL._ROUTING...");
      
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      // Fallback check: if doc doesn't exist here, create it
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          email: user.email,
          credits: 5,
          role: "user"
        });
        window.location.href = "dashboard.html";
        return;
      }

      if (docSnap.data().role === "admin") {
        window.location.href = "admin.html";
      } else {
        window.location.href = "dashboard.html";
      }

    } catch (error) {
      showMsg(errorMsg, "ERROR: " + error.message, true);
    }
  });
}

if (registerBtn) {
  registerBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (!email || !password) {
      showMsg(errorMsg, "ERROR: INCOMPLETE_CREDENTIALS", true);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send Verification Email
      await sendEmailVerification(user);

      showMsg(successMsg, "VERIFICATION LINK SENT TO YOUR EMAIL. CHECK INBOX.");
      auth.signOut(); // Force logout until verified

    } catch (error) {
      showMsg(errorMsg, "ERROR: " + error.message, true);
    }
  });
}

if (resendBtn) {
  resendBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) return;

    try {
      // Re-authenticate to get user context
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await sendEmailVerification(user);
      
      showMsg(successMsg, "VERIFICATION LINK SENT TO YOUR EMAIL. CHECK INBOX.");
      resendBtn.classList.add('hidden');
      auth.signOut();

    } catch (error) {
      showMsg(errorMsg, "ERROR: " + error.message, true);
    }
  });
}
