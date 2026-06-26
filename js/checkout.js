/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Checkout Logic
 * =====================================================
 */

import { auth, db } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { formatCurrency, showToast } from './utils.js';

// ⚠️ IMPORTANT: REPLACE THIS WITH YOUR ACTUAL WHATSAPP NUMBER
const SHOP_WHATSAPP_NUMBER = '919876543210'; 

const checkoutForm = document.getElementById('checkoutForm');

if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Get Customer Details
        const customerName = document.getElementById('custName').value.trim();
        const customerMobile = document.getElementById('custMobile').value.trim();
        const customerAddress = document.getElementById('custAddress').value.trim();
        const customerPincode = document.getElementById('custPincode').value.trim();

        // 2. Get Cart Items
        const cart = JSON.parse(localStorage.getItem('spbh_cart')) || [];

        // 3. Validations
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
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
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

            const orderData = {
                userId: auth.currentUser ? auth.currentUser.uid : 'guest',
                customerName: customerName,
                customerMobile: customerMobile,
                customerAddress: customerAddress,
                customerPincode: customerPincode,
                items: itemsArray,
                grandTotal: grandTotal,
                status: 'Pending',
                createdAt: serverTimestamp()
            };

            // Save to Firestore
            const docRef = await addDoc(collection(db, "orders"), orderData);
            console.log("Order saved to Firestore with ID: ", docRef.id);

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
                            `📌 *Order ID: #${docRef.id.substring(0, 8).toUpperCase()}*\n\n` +
                            `Thank you!`;

            // Open WhatsApp
            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://api.whatsapp.com/send?phone=919887385287&text=${encodedMessage}`;
            
            window.open(whatsappUrl, '_blank');

            // Clear Local Cart
            localStorage.removeItem('spbh_cart');
            
            showToast('Order placed successfully! Track it in your profile.', 'success');

            setTimeout(() => {
                window.location.href = '/profile.html';
            }, 2000);

        } catch (error) {
            console.error("Checkout Error:", error);
            showToast('Failed to place order. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
}
