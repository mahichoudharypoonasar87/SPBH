/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Cart Page Logic
 * =====================================================
 */

import { auth } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { formatCurrency, calculateDiscount, showToast } from './utils.js';
import { placeOrder } from './checkout.js';

const cartPageContainer = document.getElementById('cartPageContainer');
const cartItemsGrid = document.getElementById('cartItemsGrid');
const totalMrpEl = document.getElementById('totalMrp');
const totalDiscountEl = document.getElementById('totalDiscount');
const grandTotalEl = document.getElementById('grandTotal');
const emptyCartPage = document.getElementById('emptyCartPage');

const getCart = () => JSON.parse(localStorage.getItem('spbh_cart')) || [];
const saveCart = (cart) => localStorage.setItem('spbh_cart', JSON.stringify(cart));

const renderCart = () => {
    const cart = getCart();

    if (cart.length === 0) {
        cartPageContainer.style.display = 'none';
        emptyCartPage.style.display = 'flex';
        return;
    }

    cartPageContainer.style.display = 'grid';
    emptyCartPage.style.display = 'none';

    let subtotal = 0;
    let totalMrp = 0;

    cartItemsGrid.innerHTML = cart.map(item => {
        const itemMrpTotal = item.mrp * item.qty;
        const itemSellingTotal = item.sellingPrice * item.qty;
        
        subtotal += itemSellingTotal;
        totalMrp += itemMrpTotal;

        return `
            <div class="full-cart-item" data-id="${item.id}">
                <div class="full-cart-img">
                    <a href="/product.html?id=${item.id}">
                        <img src="${item.image}" alt="${item.name}" loading="lazy">
                    </a>
                </div>
                <div class="full-cart-details">
                    <a href="/product.html?id=${item.id}" class="full-cart-name">${item.name}</a>
                    <p class="full-cart-category">${item.category || 'General'} ${item.size ? '| Size: '+item.size : ''}</p>
                    <div class="full-cart-price-box">
                        <span class="current-price">${formatCurrency(item.sellingPrice)}</span>
                        ${item.mrp > item.sellingPrice ? `<span class="original-price">${formatCurrency(item.mrp)}</span>` : ''}
                    </div>
                    <div class="full-cart-actions">
                        <div class="qty-control">
                            <button class="qty-btn" onclick="updateCartPageQty('${item.id}', -1)" aria-label="Decrease quantity">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="qty-value">${item.qty}</span>
                            <button class="qty-btn" onclick="updateCartPageQty('${item.id}', 1)" aria-label="Increase quantity">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="remove-item-btn" onclick="removeCartItem('${item.id}')">
                            <i class="fas fa-trash-alt"></i> Remove
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    const totalDiscount = totalMrp - subtotal;
    
    totalMrpEl.innerText = formatCurrency(totalMrp);
    totalDiscountEl.innerText = `- ${formatCurrency(totalDiscount)}`;
    grandTotalEl.innerText = formatCurrency(subtotal); // Subtotal is the final amount user pays
};

window.updateCartPageQty = (id, change) => {
    let cart = getCart();
    const index = cart.findIndex(item => item.id === id);
    if (index !== -1) {
        cart[index].qty += change;
        if (cart[index].qty <= 0) cart.splice(index, 1);
        saveCart(cart);
        renderCart();
    }
};

window.removeCartItem = (id) => {
    let cart = getCart().filter(item => item.id !== id);
    saveCart(cart);
    renderCart();
    showToast('Item removed successfully', 'error');
};

// NOTE: checkoutBtn ka click listener yahan se intentionally hata diya gaya hai.
// Button type="submit" hai #checkoutForm ke andar, aur checkout.js form ka
// "submit" event already sunta hai. Yahan dobara click listener lagane se
// e.preventDefault() ki wajah se submit event kabhi fire nahi hota tha —
// yahi original WhatsApp-button-not-working wala bug tha.

document.addEventListener('DOMContentLoaded', renderCart);

// -----------------------------------------------------
// AUTO-RESUME CHECKOUT: Login ke baad wapas cart.html pe
// aane par, agar pending order data mile aur user ab
// logged in hai, to automatically order place kar do —
// user ko form dobara bharne ki zaroorat nahi padegi.
// -----------------------------------------------------
onAuthStateChanged(auth, (user) => {
    if (!user) return;

    const pendingRaw = localStorage.getItem('pendingCheckout');
    if (!pendingRaw) return;

    let pendingData;
    try {
        pendingData = JSON.parse(pendingRaw);
    } catch (err) {
        localStorage.removeItem('pendingCheckout');
        return;
    }

    if (!pendingData || !pendingData.cart || pendingData.cart.length === 0) {
        localStorage.removeItem('pendingCheckout');
        return;
    }

    showToast('Login successful! Order place kiya ja raha hai...', 'success');

    // Order place karo aur fir pendingCheckout clear ho jaayega (placeOrder ke andar)
    placeOrder(pendingData);
});
