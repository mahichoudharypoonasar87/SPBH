/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Cart Page Logic
 * =====================================================
 * File: /js/cart.js
 * Description: Manages the dedicated cart page view. 
 * Handles rendering cart items, updating quantities, 
 * removing items, and calculating grand totals.
 * =====================================================
 */

// Utility Imports
import { formatCurrency, calculateDiscount, showToast } from './utils.js';

// ------------------------- //
// 1. DOM Elements           //
// ------------------------- //
const cartPageContainer = document.getElementById('cartPageContainer');
const cartItemsGrid = document.getElementById('cartItemsGrid');
const cartSummaryCard = document.getElementById('cartSummaryCard');
const subtotalEl = document.getElementById('subtotal');
const totalMrpEl = document.getElementById('totalMrp');
const totalDiscountEl = document.getElementById('totalDiscount');
const grandTotalEl = document.getElementById('grandTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const emptyCartPage = document.getElementById('emptyCartPage');

// ------------------------- //
// 2. Cart State Management  //
// ------------------------- //
const getCart = () => {
    return JSON.parse(localStorage.getItem('spbh_cart')) || [];
};

const saveCart = (cart) => {
    localStorage.setItem('spbh_cart', JSON.stringify(cart));
};

// ------------------------- //
// 3. Render Cart Page       //
// ------------------------- //
const renderCart = () => {
    const cart = getCart();

    if (cart.length === 0) {
        cartPageContainer.style.display = 'none';
        emptyCartPage.style.display = 'flex'; // Flex to center the empty state
        return;
    }

    cartPageContainer.style.display = 'grid';
    emptyCartPage.style.display = 'none';

    let subtotal = 0;
    let totalMrp = 0;

    // Render Items
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
                    <p class="full-cart-category">${item.category || 'General'}</p>
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

    // Calculate Summary
    const totalDiscount = totalMrp - subtotal;
    
    totalMrpEl.innerText = formatCurrency(totalMrp);
    totalDiscountEl.innerText = `- ${formatCurrency(totalDiscount)}`;
    subtotalEl.innerText = formatCurrency(subtotal);
    grandTotalEl.innerText = formatCurrency(subtotal); // In this case, Subtotal is the Grand Total
};

// ------------------------- //
// 4. Action Handlers        //
// ------------------------- //

// Expose to global window object for inline onclick handlers
window.updateCartPageQty = (id, change) => {
    let cart = getCart();
    const index = cart.findIndex(item => item.id === id);
    
    if (index !== -1) {
        cart[index].qty += change;
        
        // Optional: Check against stock limit here if you have stock data in cart
        if (cart[index].qty <= 0) {
            cart.splice(index, 1);
            showToast('Item removed from cart', 'error');
        }
        
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

// ------------------------- //
// 5. Proceed to Checkout    //
// ------------------------- //
if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const cart = getCart();
        if (cart.length === 0) {
            return showToast('Your cart is empty!', 'error');
        }
        // Redirect to checkout (we will use cart.html itself for checkout details, or a separate page. Let's assume we collect details on cart page or redirect)
        window.location.href = '/cart.html#checkout';
    });
}

// ------------------------- //
// 6. Initialize Cart Page   //
// ------------------------- //
document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    
    // If URL has #checkout, scroll to summary or trigger checkout UI
    if (window.location.hash === '#checkout') {
        cartSummaryCard.scrollIntoView({ behavior: 'smooth' });
    }
});