/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Checkout Logic
 * =====================================================
 */

import { auth, db } from './firebase.js';
// addDoc hata kar setDoc aur doc import kiya, taaki hum khud ID de sakein
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { formatCurrency, showToast } from './utils.js';

// ⚠️ APNA NUMBER YAHAN DALEIN
const SHOP_WHATSAPP_NUMBER = '919876543210'; 

const checkoutForm = document.getElementById('checkoutForm');

if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
        // 1. FORM VALIDATION
        e.preventDefault();

        const customerName = document.getElementById('custName').value.trim();
        const customerMobile = document.getElementById('custMobile').value.trim();
        const customerAddress = document.getElementById('custAddress').value.trim();
        const customerPincode = document.getElementById('custPincode').value.trim();
        const cart = JSON.parse(localStorage.getItem('spbh_cart')) || [];

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

        // 2. CALCULATE TOTALS
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

        // 3. GENERATE CUSTOM ORDER ID (Jo WhatsApp aur Firebase DONO mein same rahega)
        const customOrderId = Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();

        // 4. FORMAT WHATSAPP MESSAGE (USI CUSTOM ID KE SAATH)
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

        // 5. OPEN WHATSAPP IMMEDIATELY (Bina kisi delay ke)
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://api.whatsapp.com/send?phone=${SHOP_WHATSAPP_NUMBER}&text=${encodedMessage}`;
        window.location.href = whatsappUrl;

        // 6. BACKGROUND FIREBASE SAVE (USI CUSTOM ID KE NAAM SE)
        // setDoc use karne se Firebase wahi ID use karega jo humne banayi hai
        const saveOrderToFirebase = async () => {
            try {
                if (auth.currentUser) {
                    await setDoc(doc(db, "orders", customOrderId), {
                        userId: auth.currentUser.uid,
                        customerName, customerMobile, customerAddress, customerPincode,
                        items: itemsArray,
                        grandTotal: grandTotal,
                        status: 'Pending',
                        createdAt: serverTimestamp()
                    });
                }
            } catch (error) {
                console.error("Firebase save failed (User might be guest):", error);
            }
            // Cart Clear
            localStorage.removeItem('spbh_cart');
        };

        // Trigger background save
        saveOrderToFirebase();

    });
}
