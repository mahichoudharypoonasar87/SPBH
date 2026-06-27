/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Cart Page Logic
 * =====================================================
 */

import { formatCurrency, calculateDiscount, showToast } from './utils.js';

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

// NOTE: The checkout button's click handling was intentionally removed from here.
// The button is type="submit" inside #checkoutForm, and checkout.js already
// listens for the form's "submit" event to validate fields, build the WhatsApp
// message, and redirect. Having a second click listener here that called
// e.preventDefault() was blocking that submit event from ever firing — that
// was the bug causing the WhatsApp button to do nothing.

document.addEventListener('DOMContentLoaded', renderCart);
