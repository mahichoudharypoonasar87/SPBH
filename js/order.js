/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Order Tracking
 * =====================================================
 */

import { db } from './firebase.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { formatCurrency, showToast } from './utils.js';

const orderTrackerContainer = document.getElementById('orderTrackerContainer');
const orderNotFound = document.getElementById('orderNotFound');

const orderIdEl = document.getElementById('orderId');
const orderDateEl = document.getElementById('orderDate');
const orderAddressEl = document.getElementById('orderAddress');
const orderItemsList = document.getElementById('orderItemsList');
const orderGrandTotal = document.getElementById('orderGrandTotal');
const timelineContainer = document.getElementById('timelineContainer');

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');

    if (!orderId) {
        // FIX: Agar direct track order par click kiya hai bina ID ke, 
        // toh user ko profile page (My Account) par bhej do jahan uski puri history hai.
        window.location.href = '/profile.html';
        return;
    }

    const orderRef = doc(db, "orders", orderId);
    
    onSnapshot(orderRef, (docSnap) => {
        if (docSnap.exists()) {
            orderTrackerContainer.style.display = 'grid';
            orderNotFound.style.display = 'none';
            renderOrderDetails(docSnap.id, docSnap.data());
        } else {
            orderTrackerContainer.style.display = 'none';
            orderNotFound.style.display = 'flex';
        }
    }, (error) => {
        console.error("Realtime listener error:", error);
        orderTrackerContainer.style.display = 'none';
        orderNotFound.style.display = 'flex';
    });
});

const renderOrderDetails = (id, data) => {
    document.title = `Tracking Order #${id.substring(0,8).toUpperCase()} | Shree Panchmukhi Balaji`;
    orderIdEl.innerText = `#${id.substring(0, 8).toUpperCase()}`;
    
    if (data.createdAt) {
        const date = data.createdAt.toDate();
        orderDateEl.innerText = date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    let pinText = `📍 ${data.customerAddress || 'N/A'}`;
    if(data.customerPincode) pinText += ` - ${data.customerPincode}`;

    orderAddressEl.innerHTML = `
        <strong>${data.customerName || 'Customer'}</strong><br>
        <span style="color: var(--text-muted);">📞 ${data.customerMobile || 'N/A'}</span><br>
        ${pinText}
    `;

    if (data.items && data.items.length > 0) {
        orderItemsList.innerHTML = data.items.map(item => `
            <div class="track-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="track-item-info">
                    <h4>${item.name}</h4>
                    <p>Size: ${item.size || 'N/A'} | Qty: ${item.qty}</p>
                </div>
                <div class="track-item-price">${formatCurrency(item.totalPrice || (item.sellingPrice * item.qty))}</div>
            </div>
        `).join('');
    }

    orderGrandTotal.innerText = formatCurrency(data.grandTotal || 0);
    renderTimeline(data.status ? data.status.toLowerCase() : 'pending');
};

const renderTimeline = (currentStatus) => {
    const steps = [
        { key: 'pending', label: 'Order Placed', icon: 'fas fa-check-circle', desc: 'Your order has been placed successfully.' },
        { key: 'confirmed', label: 'Confirmed', icon: 'fas fa-clipboard-check', desc: 'We have received and confirmed your order.' },
        { key: 'packed', label: 'Packed', icon: 'fas fa-box', desc: 'Your items are packed and ready for dispatch.' },
        { key: 'shipped', label: 'Shipped', icon: 'fas fa-truck', desc: 'Your order is on the way to your location.' },
        { key: 'delivered', label: 'Delivered', icon: 'fas fa-home', desc: 'Your order has been delivered successfully!' }
    ];

    let currentStepIndex = steps.findIndex(s => s.key === currentStatus);
    const isCancelled = currentStatus === 'cancelled';
    if (isCancelled) currentStepIndex = -1;

    timelineContainer.innerHTML = steps.map((step, index) => {
        let stateClass = 'upcoming';
        if (isCancelled) {
            stateClass = 'cancelled';
        } else if (index < currentStepIndex) {
            stateClass = 'completed';
        } else if (index === currentStepIndex) {
            stateClass = 'active';
        }

        return `
            <div class="timeline-step ${stateClass}">
                <div class="timeline-icon">
                    <i class="${isCancelled ? 'fas fa-times-circle' : step.icon}"></i>
                </div>
                <div class="timeline-content">
                    <h4>${isCancelled ? 'Order Cancelled' : step.label}</h4>
                    <p>${isCancelled ? 'Unfortunately, your order was cancelled.' : step.desc}</p>
                </div>
            </div>
        `;
    }).join('');
};
