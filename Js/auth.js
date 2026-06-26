/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Authentication
 * =====================================================
 * File: /js/auth.js
 * Description: Handles Email/Password Auth, Google Auth, 
 * and Password Reset. Also syncs user data to Firestore
 * on new registrations.
 * =====================================================
 */
alert("Auth.js file shuru hui!");
// Firebase Auth Imports
import { auth, db } from './firebase.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    sendPasswordResetEmail, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// Firestore Imports
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Utility Imports
import { showToast } from './utils.js';

// Google Auth Provider Instance
const googleProvider = new GoogleAuthProvider();

// ------------------------- //
// 1. DOM Elements           //
// ------------------------- //
// Login Page Elements
const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotEmailModal = document.getElementById('forgotEmailModal');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const resetEmailInput = document.getElementById('resetEmailInput');

// Signup Page Elements
const signupForm = document.getElementById('signupForm');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');
const googleSignupBtn = document.getElementById('googleSignupBtn');


// ------------------------- //
// 2. Signup with Email      //
// ------------------------- //
const handleSignup = async (e) => {
    e.preventDefault();

    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    const confirmPassword = signupConfirmPassword.value;

    // Validations
    if (!name || !email || !password) {
        return showToast('Please fill in all fields.', 'error');
    }
    if (password.length < 6) {
        return showToast('Password must be at least 6 characters.', 'error');
    }
    if (password !== confirmPassword) {
        return showToast('Passwords do not match.', 'error');
    }

    // Disable button to prevent double clicks
    const submitBtn = signupForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Account...';

    try {
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Update Display Name in Firebase Auth
        await updateProfile(user, { displayName: name });

        // 3. Save User Data to Firestore
        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            photoURL: null,
            role: 'user', // Default role is user. Admin needs to be set manually in DB.
            createdAt: serverTimestamp()
        });

        showToast('Account created successfully!', 'success');
        
        // Redirect to Home or Profile
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 1000);

    } catch (error) {
        console.error("Signup Error:", error);
        handleAuthErrors(error.code);
        submitBtn.disabled = false;
        submitBtn.innerText = 'Create Account';
    }
};


// ------------------------- //
// 3. Login with Email       //
// ------------------------- //
const handleLogin = async (e) => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) {
        return showToast('Please enter email and password.', 'error');
    }

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Logging in...';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Login successful!', 'success');
        
        setTimeout(() => {
            // Redirect to the page they came from, or home
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || '/index.html';
            window.location.href = redirectUrl;
        }, 800);

    } catch (error) {
        console.error("Login Error:", error);
        handleAuthErrors(error.code);
        submitBtn.disabled = false;
        submitBtn.innerText = 'Login';
    }
};


// ------------------------- //
// 4. Google Authentication  //
// ------------------------- //
const handleGoogleAuth = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Check if user document already exists in Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (!userDoc.exists()) {
            // If new user via Google, create Firestore document
            await setDoc(doc(db, "users", user.uid), {
                name: user.displayName || 'Google User',
                email: user.email,
                photoURL: user.photoURL,
                role: 'user',
                createdAt: serverTimestamp()
            });
            showToast('Account created via Google!', 'success');
        } else {
            showToast('Login successful!', 'success');
        }

        setTimeout(() => {
            window.location.href = '/index.html';
        }, 800);

    } catch (error) {
        console.error("Google Auth Error:", error);
        if (error.code !== 'auth/popup-closed-by-user') {
            handleAuthErrors(error.code);
        }
    }
};


// ------------------------- //
// 5. Forgot Password        //
// ------------------------- //
const handleForgotPassword = async () => {
    const email = resetEmailInput.value.trim();
    if (!email) {
        return showToast('Please enter your email address.', 'error');
    }

    resetPasswordBtn.disabled = true;
    resetPasswordBtn.innerText = 'Sending...';

    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset link sent to your email!', 'success');
        forgotEmailModal.style.display = 'none'; // Hide modal
        resetEmailInput.value = '';
    } catch (error) {
        console.error("Reset Password Error:", error);
        handleAuthErrors(error.code);
    } finally {
        resetPasswordBtn.disabled = false;
        resetPasswordBtn.innerText = 'Send Reset Link';
    }
};


// ------------------------- //
// 6. Error Handler Utility  //
// ------------------------- //
const handleAuthErrors = (errorCode) => {
    switch (errorCode) {
        case 'auth/user-not-found':
            showToast('No account found with this email.', 'error');
            break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            showToast('Incorrect email or password.', 'error');
            break;
        case 'auth/email-already-in-use':
            showToast('This email is already registered. Please login.', 'error');
            break;
        case 'auth/weak-password':
            showToast('Password is too weak. Use at least 6 characters.', 'error');
            break;
        case 'auth/invalid-email':
            showToast('Please enter a valid email address.', 'error');
            break;
        case 'auth/too-many-requests':
            showToast('Access blocked due to too many failed attempts. Try again later.', 'error');
            break;
        case 'auth/network-request-failed':
            showToast('Network error. Please check your internet connection.', 'error');
            break;
        default:
            showToast('An unexpected error occurred. Please try again.', 'error');
    }
};


// ------------------------- //
// 7. Event Listeners        //
// ------------------------- //
document.addEventListener('DOMContentLoaded', () => {
    // Attach events only if elements exist on the current page
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (googleLoginBtn) googleLoginBtn.addEventListener('click', handleGoogleAuth);
    if (googleSignupBtn) googleSignupBtn.addEventListener('click', handleGoogleAuth);
    
    if (forgotPasswordLink && forgotEmailModal) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            forgotEmailModal.style.display = 'flex';
        });
    }

    if (resetPasswordBtn) resetPasswordBtn.addEventListener('click', handleForgotPassword);
});
