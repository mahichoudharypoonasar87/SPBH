/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Profile Logic
 * =====================================================
 */

import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";

import { compressImage, formatCurrency, showToast } from './utils.js';

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

onAuthStateChanged(auth, async (user) => {
    if (user) {
        profileSection.style.display = 'block';
        authSection.style.display = 'none';
        await loadUserProfile(user.uid);
        await loadUserOrders(user.uid);
    } else {
        profileSection.style.display = 'none';
        authSection.style.display = 'flex';
    }
});

const loadUserProfile = async (uid) => {
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            userName.innerText = data.name || 'User';
            userEmail.innerText = data.email;
            editNameInput.value = data.name || '';
            
            if (data.photoURL) {
                userAvatar.src = data.photoURL;
            } else {
                userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=D4AF37&color=000&bold=true`;
            }

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

if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = editNameInput.value.trim();
        if (!newName) return showToast('Name cannot be empty.', 'error');

        saveProfileBtn.disabled = true;
        saveProfileBtn.innerText = 'Saving...';

        try {
            const user = auth.currentUser;
            await updateProfile(user, { displayName: newName });
            await updateDoc(doc(db, "users", user.uid), { name: newName });
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

if (avatarUploadInput) {
    avatarUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        showToast('Compressing image...', 'info');
        try {
            const compressedFile = await compressImage(file, 200);
            const storageRef = ref(storage, `users/${auth.currentUser.uid}/avatar.jpg`);
            const snapshot = await uploadBytes(storageRef, compressedFile);
            const downloadURL = await getDownloadURL(snapshot);
            await updateProfile(auth.currentUser, { photoURL: downloadURL });
            await updateDoc(doc(db, "users", auth.currentUser.uid), { photoURL: downloadURL });
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

const loadUserOrders = async (uid) => {
    ordersListContainer.innerHTML = '<div class="skeleton" style="height: 100px; margin-bottom: 16px; border-radius: 12px;"></div>'.repeat(3);

    try {
        // FIX: 'orderBy' HATA DIYA. Ab Firebase ko Composite Index ki zaroorat nahi padegi.
        const q = query(collection(db, "orders"), where("userId", "==", uid));
        const querySnapshot = await getDocs(q);
        ordersListContainer.innerHTML = '';

        if (querySnapshot.empty) {
            ordersListContainer.innerHTML = `
                <div style="text-align: center; padding: 40px 0; color: var(--text-muted);">
                    <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;"></i>
                    <p>You haven't placed any orders yet.</p>
                    <a href="/index.html" class="btn btn-sm btn-primary" style="margin-top: 16px;">Shop Now</a>
                </div>`;
            return;
        }

        // Data ko JavaScript mein sort kar rahe hain (Newest First)
        let ordersArray = [];
        querySnapshot.forEach((doc) => {
            ordersArray.push({ id: doc.id, ...doc.data() });
        });

        ordersArray.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
            return timeB - timeA; // Descending order
        });

        ordersArray.forEach((order) => {
            ordersListContainer.innerHTML += createOrderCard(order);
        });

    } catch (error) {
        console.error("Error fetching orders:", error);
        ordersListContainer.innerHTML = '<p style="color: #FF3B30; text-align: center; padding: 20px;">Error loading orders. Please make sure you are logged in.</p>';
    }
};

const createOrderCard = (order) => {
    let dateStr = 'N/A';
    if (order.createdAt) {
        const date = order.createdAt.toDate();
        dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    let statusClass = 'status-pending';
    const status = order.status ? order.status.toLowerCase() : 'pending';
    if (status === 'confirmed') statusClass = 'status-confirmed';
    if (status === 'packed') statusClass = 'status-pending';
    if (status === 'shipped') statusClass = 'status-shipped';
    if (status === 'delivered') statusClass = 'status-delivered';
    if (status === 'cancelled') statusClass = 'status-cancelled';

    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
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
                    <h4>Order ID: #${order.id.substring(0, 8).toUpperCase()}</h4>
                    <p class="order-date">${dateStr}</p>
                </div>
                <span class="status-badge ${statusClass}">${order.status || 'Pending'}</span>
            </div>
            <div class="order-card-body">
                ${itemsHtml}
            </div>
            <div class="order-card-footer">
                <span class="order-total-amount">Total: ${formatCurrency(order.grandTotal || 0)}</span>
                <a href="/orders.html?id=${order.id}" class="btn btn-sm btn-secondary">Track Order</a>
            </div>
        </div>
    `;
};

if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            showToast('Logged out successfully!', 'success');
            window.location.href = '/index.html';
        } catch (error) {
            console.error("Logout Error:", error);
            showToast('Failed to logout.', 'error');
        }
    });
}
