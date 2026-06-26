/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Checkout Logic
 * =====================================================
 */

import { auth, db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { formatCurrency, showToast } from './utils.js';

// ⚠️ APNA NUMBER YAHAN DALEIN (Bina + ke)
const SHOP_WHATSAPP_NUMBER = '919876543210'; 

const checkoutForm = document.getElementById('checkoutForm');

if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const customerName = document.getElementById('custName').value.trim();
        const customerMobile = document.getElementById('custMobile').value.trim();
        const customerAddress = document.getElementById('custAddress').value.trim();
        const customerPincode = document.getElementById('custPincode').value.trim();
        const cart = JSON.parse(localStorage.getItem('spbh_cart')) || [];

        // Validations
        if (!customerName || !customerMobile || !customerAddress || !customerPincode) {
            return showToast('Please fill in all details.', 'error');
        }
        if (!/^[0-9]{10}$/.test(customerMobile)) {
            return showToast('Please enter a valid 10-digit mobile number.', 'error');
        }
        if (!/^[0-9]{6}$/.test(customerPincode)) {
            return showToast('Please enter a valid 6-digit PIN code.', 'error');
        }
        if (cart.length === 0) {
            return showToast('Your cart is empty!', 'error');
        }

        const submitBtn = checkoutForm.querySelector('.whatsapp-checkout-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        let grandTotal = 0;
        const itemsArray = cart.map(item => {
            const itemTotal = item.sellingPrice * item.qty;
            grandTotal += itemTotal;
            return {
                id: item.id,
                name: item.name,
                image: item.image,
                size: item.size || 'Free Size',
                mrp: item.mrp,
                sellingPrice: item.sellingPrice,
                qty: item.qty,
                totalPrice: itemTotal
            };
        });

        // Generate Order ID (Either from Firebase or Local)
        let finalOrderId = "GUEST_" + Date.now().toString(36).toUpperCase();

        try {
            // Try to save in Firebase (Only works if user is logged in)
            if (auth.currentUser) {
                const orderData = {
                    userId: auth.currentUser.uid,
                    customerName, customerMobile, customerAddress, customerPincode,
                    items: itemsArray,
                    grandTotal: grandTotal,
                    status: 'Pending',
                    createdAt: serverTimestamp()
                };
                const docRef = await addDoc(collection(db, "orders"), orderData);
                finalOrderId = docRef.id; // Use real Firebase ID
            }
        } catch (error) {
            console.warn("Could not save to Firebase (User might be guest):", error);
            // WE DO NOT STOP HERE! We continue to WhatsApp even if Firebase fails.
        }

        // Format WhatsApp Message
        let itemStr = "";
        itemsArray.forEach((item, index) => {
            itemStr += `\n${index + 1}. *${item.name}* (Size: ${item.size})\n   Qty: ${item.qty} | Price: ${formatCurrency(item.totalPrice)}\n`;
        });

        const message = `🛍️ *New Order from SPB Handloom Website*\n\n` +
                        `👤 *Customer Details:*\n` +
                        `Name: ${customerName}\n` +
                        `Mobile: ${customerMobile}\n` +
                        `Address: ${customerAddress}\n` +
                        `PIN Code: ${customerPincode}\n\n` +
                        `📦 *Order Items:*\n${itemStr}\n` +
                        `💰 *Grand Total: ${formatCurrency(grandTotal)}*\n` +
                        `📌 *Order ID: #${finalOrderId.substring(0, 8).toUpperCase()}*\n\n` +
                        `Thank you!`;

        // --- ANTI-POPUP BLOCK TECHNIQUE ---
        // We create a temporary hidden link and click it. This bypasses popup blockers.
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=919887385287&text=${encodedMessage}`;
        
        const a = document.createElement('a');
        a.href = whatsappUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Clear Cart
        localStorage.removeItem('spbh_cart');
        showToast('Redirecting to WhatsApp...', 'success');

        // Redirect to home after 3 seconds
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 3000);
    });
}
