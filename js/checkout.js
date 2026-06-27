/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Checkout Logic
 * =====================================================
 */

import { auth, db } from './firebase.js';
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { formatCurrency, showToast } from './utils.js';

// ⚠️ APNA NUMBER YAHAN DALEIN
const SHOP_WHATSAPP_NUMBER = '919876543210';

const checkoutForm = document.getElementById('checkoutForm');

/**
 * Order ko Firebase mein save karta hai aur WhatsApp khol deta hai.
 * Ye function checkout.js aur cart.js (auto-resume ke liye) dono se call hota hai.
 */
export const placeOrder = async ({ customerName, customerMobile, customerAddress, customerPincode, cart }) => {
    let grandTotal = 0;
    const itemsArray = cart.map(item => {
        const itemTotal = item.sellingPrice * item.qty;
        grandTotal += itemTotal;
        return {
            id: item.id, name: item.name, image: item.image,
            size: item.size || 'Free Size', mrp: item.mrp,
            sellingPrice: item.sellingPrice, qty: item.qty, totalPrice: itemTotal
        };
    });

    const customOrderId = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

    // STEP 1: FIREBASE ME SAVE KARO (ab yahan tak sirf logged-in user hi pahunchega)
    try {
        await setDoc(doc(db, "orders", customOrderId), {
            userId: auth.currentUser.uid,
            customerName, customerMobile, customerAddress, customerPincode,
            items: itemsArray,
            grandTotal: grandTotal,
            status: 'Pending',
            createdAt: serverTimestamp()
        });
        console.log("Order saved to Firebase with ID: ", customOrderId);
    } catch (error) {
        console.error("Firebase save error:", error);
        showToast('Order WhatsApp pe ja raha hai, par save nahi ho paya.', 'error');
    }

    // STEP 2: WHATSAPP KHULO
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
                    `📌 *Order ID: #${customOrderId}*\n\n` +
                    `Thank you!`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${SHOP_WHATSAPP_NUMBER}&text=${encodedMessage}`;

    window.location.href = whatsappUrl;

    // STEP 3: CART AUR PENDING DATA CLEAR (Background)
    localStorage.removeItem('spbh_cart');
    localStorage.removeItem('pendingCheckout');
};

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

        const checkoutData = { customerName, customerMobile, customerAddress, customerPincode, cart };

        // ⭐ LOGIN CHECK: Guest hai to login pe bhej do, order place mat karo
        if (!auth.currentUser) {
            // Form + cart data save kar lo, taaki login ke baad wapas aa ke
            // dobara form bharne ki zaroorat na pade
            localStorage.setItem('pendingCheckout', JSON.stringify(checkoutData));
            showToast('Order place karne ke liye pehle login karein.', 'error');
            window.location.href = '/login.html?redirect=/cart.html';
            return;
        }

        // UI Update: Button disable karo
        const submitBtn = checkoutForm.querySelector('.whatsapp-checkout-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving Order...';

        await placeOrder(checkoutData);
    });
}
