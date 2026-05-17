/*
 * firebase-config.js
 * Initialize Firebase app and services.
 * IMPORTANT: REPLACE the config object with your actual Firebase project settings.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXcKzuifNVPBPGbEBLmwORyybEA2Nl1DA",
  authDomain: "cyberpunkocient.firebaseapp.com",
  projectId: "cyberpunkocient",
  storageBucket: "cyberpunkocient.firebasestorage.app",
  messagingSenderId: "1012316372600",
  appId: "1:1012316372600:web:2b0bd9d38a2ed89fb9778d",
  measurementId: "G-QWGMNLEM3E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
