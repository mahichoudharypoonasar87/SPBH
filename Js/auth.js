// DEBUG 1: Yeh alert agar nahi aaya, toh firebase.js ya utils.js missing/half hai.
alert("STEP 1: Auth.js file shuru hui!");

import { auth, db } from './firebase.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider, 
    sendPasswordResetEmail, 
    updateProfile 
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

import { showToast } from './utils.js';

const googleProvider = new GoogleAuthProvider();

const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotEmailModal = document.getElementById('forgotEmailModal');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const resetEmailInput = document.getElementById('resetEmailInput');

const signupForm = document.getElementById('signupForm');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');
const googleSignupBtn = document.getElementById('googleSignupBtn');

const handleSignup = async (e) => {
    e.preventDefault();
    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    const confirmPassword = signupConfirmPassword.value;

    if (!name || !email || !password) return showToast('Please fill in all fields.', 'error');
    if (password.length < 6) return showToast('Password must be at least 6 characters.', 'error');
    if (password !== confirmPassword) return showToast('Passwords do not match.', 'error');

    const submitBtn = signupForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Creating Account...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        await setDoc(doc(db, "users", user.uid), { name, email, photoURL: null, role: 'user', createdAt: serverTimestamp() });
        showToast('Account created successfully!', 'success');
        setTimeout(() => { window.location.href = '/index.html'; }, 1000);
    } catch (error) {
        console.error("Signup Error:", error);
        handleAuthErrors(error.code);
        submitBtn.disabled = false;
        submitBtn.innerText = 'Create Account';
    }
};

const handleLogin = async (e) => {
    e.preventDefault();
    // DEBUG 3: Yeh alert agar nahi aaya, toh form ka ID galat hai.
    alert("STEP 3: Login function chal gayi!");

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    if (!email || !password) return showToast('Please enter email and password.', 'error');

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = 'Logging in...';

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast('Login successful!', 'success');
        setTimeout(() => {
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

const handleGoogleAuth = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", user.uid), { name: user.displayName || 'Google User', email: user.email, photoURL: user.photoURL, role: 'user', createdAt: serverTimestamp() });
            showToast('Account created via Google!', 'success');
        } else {
            showToast('Login successful!', 'success');
        }
        setTimeout(() => { window.location.href = '/index.html'; }, 800);
    } catch (error) {
        console.error("Google Auth Error:", error);
        if (error.code !== 'auth/popup-closed-by-user') handleAuthErrors(error.code);
    }
};

const handleForgotPassword = async () => {
    const email = resetEmailInput.value.trim();
    if (!email) return showToast('Please enter your email address.', 'error');
    resetPasswordBtn.disabled = true;
    resetPasswordBtn.innerText = 'Sending...';
    try {
        await sendPasswordResetEmail(auth, email);
        showToast('Password reset link sent to your email!', 'success');
        forgotEmailModal.style.display = 'none'; 
        resetEmailInput.value = '';
    } catch (error) {
        console.error("Reset Password Error:", error);
        handleAuthErrors(error.code);
    } finally {
        resetPasswordBtn.disabled = false;
        resetPasswordBtn.innerText = 'Send Reset Link';
    }
};

const handleAuthErrors = (errorCode) => {
    switch (errorCode) {
        case 'auth/user-not-found': showToast('No account found with this email.', 'error'); break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential': showToast('Incorrect email or password.', 'error'); break;
        case 'auth/email-already-in-use': showToast('This email is already registered.', 'error'); break;
        case 'auth/weak-password': showToast('Password is too weak.', 'error'); break;
        case 'auth/invalid-email': showToast('Please enter a valid email.', 'error'); break;
        case 'auth/too-many-requests': showToast('Too many attempts. Try later.', 'error'); break;
        case 'auth/network-request-failed': showToast('Network error.', 'error'); break;
        case 'auth/invalid-api-key': showToast('Firebase Keys Missing in firebase.js!', 'error'); break;
        default: showToast(`Error: ${errorCode}`, 'error'); break;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // DEBUG 2: Yeh alert agar nahi aaya, toh HTML mein form ka ID galat hai.
    alert("STEP 2: DOM load ho gaya! Form dhundh rahe hain...");
    
    if (loginForm) {
        alert("STEP 2.5: Login Form mil gaya! Event lagaya.");
        loginForm.addEventListener('submit', handleLogin);
    } else {
        alert("ERROR: Login Form nahi mila! HTML mein id='loginForm' check karein.");
    }

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
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
