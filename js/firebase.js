/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Firebase Configuration
 * =====================================================
 * File: /js/firebase.js
 * Description: Initializes Firebase App, Authentication, 
 * Firestore Database, and Storage. Exports these instances 
 * for use across all ES6 modules in the project.
 * 
 * Firebase SDK Version: 11.x (Modular Web SDK)
 * =====================================================
 */

// Import required Firebase functions from the modular SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";

/**
 * Firebase Configuration Object
 * -------------------------------
 * Replace these placeholder values with your actual Firebase
 * project credentials. You can find these in the Firebase Console
 * under Project Settings > Your apps > Firebase SDK snippet > Config.
 */
const firebaseConfig = {
  apiKey: "AIzaSyBg7r3y21_emGxoLFBPvGj5nc8UQGOfnKs",
  authDomain: "shree-panchmukhi-handloom.firebaseapp.com",
  projectId: "shree-panchmukhi-handloom",
  storageBucket: "shree-panchmukhi-handloom.firebasestorage.app",
  messagingSenderId: "443863528115",
  appId: "1:443863528115:web:1defe3f1de77270a24b6c6"
};
/**
 * Initialize Firebase Application
 * -------------------------------
 * This creates the Firebase app instance using the config above.
 * It acts as the central hub for all other Firebase services.
 */
const app = initializeApp(firebaseConfig);

/**
 * Initialize Firebase Services
 * -------------------------------
 * We pass the initialized 'app' instance to each service to 
 * link them to our specific Firebase project.
 */

// Authentication Service (Handles Login, Signup, Google Auth, etc.)
const auth = getAuth(app);

// Cloud Firestore Service (NoSQL Database for Products, Users, Orders)
const db = getFirestore(app);

// Firebase Storage Service (Handles Image Uploads for Products/Profiles)
const storage = getStorage(app);

/**
 * Export Services
 * -------------------------------
 * Using ES6 'export' allows other JavaScript files (e.g., auth.js, 
// products.js) to import and use these initialized services 
 * without having to re-initialize them.
 */
export { auth, db, storage };

/**
 * Error Handling Note for Development:
 * If you see "Firebase: Error (auth/invalid-api-key)" in the console,
 * it means you have not replaced the placeholder strings above with 
 * your actual Firebase project keys from the console.
 */