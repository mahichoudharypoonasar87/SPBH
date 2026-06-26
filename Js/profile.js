/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Profile Logic
 * =====================================================
 * File: /js/profile.js
 * Description: Manages user profile viewing, editing, 
 * avatar upload (with compression), and fetching order 
 * history with status tracking from Firestore.
 * =====================================================
 */

// Firebase Imports
import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";

// Utility Imports
import { compressImage, formatCurrency, showToast } from './utils.js';

// ------------------------- //
// 1. DOM Elements           //
// ------------------------- //
const profileSection = document.getElementById('profileSection');
const authSection = document.getElementById('authSection');

const userAvatar = document.getElementById('userAvatar');
const avatarUploadInput = document.getElementById('avatarUploadInput');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const userRole = document.getElementById('userRole');
const adminPanelLink = document.getElementById('adminPanelLink');

const profileForm = document.getElementById('profileForm');
const editNameInput = document.getElementById('editNameInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');

const ordersListContainer = document.getElementById('ordersListContainer');
const logoutBtn = document.getElementById('logoutBtn');

// ------------------------- //
// 2. Auth State Listener    //
// ------------------------- //
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // User is logged in, show profile
        profileSection.style.display = 'block';
        authSection.style.display = 'none';
        
        await loadUserProfile(user.uid);
        await loadUserOrders(user.uid);
    } else {
        // User is logged out, show login prompt
        profileSection.style.display = 'none';
        authSection.style.display = 'flex';
    }
});

// ------------------------- //
// 3. Load User Profile Data //
// ------------------------- //
const loadUserProfile = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Update UI
            userName.innerText = data.name || 'User';
            userEmail.innerText = data.email;
            editNameInput.value = data.name || '';
            
            // Set Avatar
            if (data.photoURL) {
                userAvatar.src = data.photoURL;
            } else {
                // Fallback to first letter of name
                userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=D4AF37&color=000&bold=true`;
            }

            // Check Role & Show Admin Link
            if (data.role === 'admin') {
                userRole.innerText = 'Admin';
                adminPanelLink.style.display = 'block';
            } else {
                userRole.innerText = 'Customer';
                adminPanelLink.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        showToast('Failed to load profile data.', 'error');
    }
};

// ------------------------- //
// 4. Update Profile Details //
// ------------------------- //
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = editNameInput.value.trim();
        
        if (!newName) return showToast('Name cannot be empty.', 'error');

        saveProfileBtn.disabled = true;
        saveProfileBtn.innerText = 'Saving...';

        try {
            const user = auth.currentUser;
            
            // 1. Update in Firebase Auth
            await updateProfile(user, { displayName: newName });

            // 2. Update in Firestore
            await updateDoc(doc(db, "users", user.uid), {
                name: newName
            });

            // Update UI locally
            userName.innerText = newName;
            userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(newName)}&background=D4AF37&color=000&bold=true`;
            
            showToast('Profile updated successfully!', 'success');
        } catch (error) {
            console.error("Error updating profile:", error);
            showToast('Failed to update profile.', 'error');
        } finally {
            saveProfileBtn.disabled = false;
            saveProfileBtn.innerText = 'Save Changes';
        }
    });
}

// ------------------------- //
// 5. Avatar Upload & Compress //
// ------------------------- //
if (avatarUploadInput) {
    avatarUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showToast('Compressing image...', 'info');

        try {
            // 1. Compress Image to < 200KB using our utility
            const compressedFile = await compressImage(file, 200);

            // 2. Upload to Firebase Storage
            const storageRef = ref(storage, `users/${auth.currentUser.uid}/avatar.jpg`);
            const snapshot = await uploadBytes(storageRef, compressedFile);
            
            // 3. Get Download URL
            const downloadURL = await getDownloadURL(snapshot);

            // 4. Update Auth Profile
            await updateProfile(auth.currentUser, { photoURL: downloadURL });

            // 5. Update Firestore
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                photoURL: downloadURL
            });

            // 6. Update UI
            userAvatar.src = downloadURL;
            showToast('Profile photo updated!', 'success');

        } catch (error) {
            console.error("Error uploading avatar:", error);
            if (error.message.includes('too large')) {
                showToast(error.message, 'error');
            } else {
                showToast('Failed to upload photo.', 'error');
            }
        }
    });
}

// ------------------------- //
// 6. Fetch User Orders      //
// ------------------------- //
const loadUserOrders = async (uid) => {
    ordersListContainer.innerHTML = '<div class="skeleton" style="height: 100px; margin-bottom: 16px; border-radius: 12px;"></div>'.repeat(3);

    try {
        const q = query(
            collection(db, "orders"), 
            where("userId", "==", uid), 
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(q);
        ordersListContainer.innerHTML = ''; // Clear skeletons

        if (querySnapshot.empty) {
            ordersListContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p>You haven't placed any orders yet.</p>
                    <a href="/index.html" class="btn btn-sm btn-primary" style="margin-top: 16px;">Shop Now</a>
                </div>`;
            return;
        }

        querySnapshot.forEach((doc) => {
            const order = doc.id; // Order ID
            const data = doc.data();
            
            ordersListContainer.innerHTML += createOrderCard(order, data);
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        ordersListContainer.innerHTML = '<p style="color: #FF3B30; text-align: center; padding: 20px;">Error loading orders.</p>';
    }
};

// ------------------------- //
// 7. Create Order Card HTML //
// ------------------------- //
const createOrderCard = (orderId, data) => {
    // Format Date
    let dateStr = 'N/A';
    if (data.createdAt) {
        const date = data.createdAt.toDate();
        dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Status Class mapping
    let statusClass = 'status-pending';
    const status = data.status ? data.status.toLowerCase() : 'pending';
    if (status === 'confirmed') statusClass = 'status-confirmed';
    if (status === 'packed') statusClass = 'status-pending'; // Reusing orange
    if (status === 'shipped') statusClass = 'status-shipped';
    if (status === 'delivered') statusClass = 'status-delivered';
    if (status === 'cancelled') statusClass = 'status-cancelled';

    // Items List (Show first 2 items and count)
    let itemsHtml = '';
    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            itemsHtml += `
                <div class="order-item-preview">
                    <img src="${item.image}" alt="${item.name}">
                    <span>${item.name} (x${item.qty})</span>
                </div>`;
        });
    }

    return `
        <div class="order-card">
            <div class="order-card-header">
                <div>
                    <h4>Order ID: #${orderId.substring(0, 8).toUpperCase()}</h4>
                    <p class="order-date">${dateStr}</p>
                </div>
                <span class="status-badge ${statusClass}">${data.status || 'Pending'}</span>
            </div>
            <div class="order-card-body">
                ${itemsHtml}
            </div>
            <div class="order-card-footer">
                <span class="order-total-amount">Total: ${formatCurrency(data.grandTotal || 0)}</span>
                <a href="/orders.html?id=${orderId}" class="btn btn-sm btn-secondary">Track Order</a>
            </div>
        </div>
    `;
};

// ------------------------- //
// 8. Logout                 //
// ------------------------- //
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showToast('Logged out successfully!', 'success');
            // Redirect happens automatically via onAuthStateChanged
            window.location.href = '/index.html';
        } catch (error) {
            console.error("Logout Error:", error);
            showToast('Failed to logout.', 'error');
        }
    });
}