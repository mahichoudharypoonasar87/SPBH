/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Main App Logic
 * =====================================================
 * File: /js/app.js
 * Description: Controller for index.html. Handles UI 
 * interactions, theme, navigation, renders products using 
 * utility functions, and initializes 3D effects.
 * =====================================================
 */

// Firebase Imports
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { collection, getDocs, query, where, limit, orderBy } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Utility Imports
import { calculateDiscount, formatCurrency, generateSkeletons, debounce, showToast } from './utils.js';

// ------------------------- //
// 1. DOM Elements           //
// ------------------------- //
const header = document.getElementById('header');
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
const themeToggle = document.getElementById('themeToggle');
const searchToggle = document.getElementById('searchToggle');
const searchOverlay = document.getElementById('searchOverlay');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const closeSearch = document.getElementById('closeSearch');

const cartToggle = document.getElementById('cartToggle');
const cartOverlay = document.getElementById('cartOverlay');
const cartSidebar = document.getElementById('cartSidebar');
const cartClose = document.getElementById('cartClose');
const cartItemsContainer = document.getElementById('cartItemsContainer');
const cartCountEl = document.getElementById('cartCount');
const cartItemCountEl = document.getElementById('cartItemCount');
const grandTotalEl = document.getElementById('grandTotal');
const cartFooter = document.getElementById('cartFooter');

const latestGrid = document.getElementById('latestProductsGrid');
const featuredGrid = document.getElementById('featuredProductsGrid');
const trendingWrapper = document.getElementById('trendingProductsWrapper');

// ------------------------- //
// 2. Theme Management       //
// ------------------------- //
const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
};

const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
};

const updateThemeIcon = (theme) => {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
};

themeToggle.addEventListener('click', toggleTheme);

// ------------------------- //
// 3. Mobile Navigation      //
// ------------------------- //
menuToggle.addEventListener('click', () => {
    menuToggle.classList.toggle('active');
    navLinks.classList.toggle('active');
});

// Close mobile menu when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
    });
});

// ------------------------- //
// 4. Sticky Header          //
// ------------------------- *
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
});

// ------------------------- //
// 5. Search Functionality   //
// ------------------------- //
searchToggle.addEventListener('click', () => {
    searchOverlay.classList.add('active');
    setTimeout(() => searchInput.focus(), 300);
});

closeSearch.addEventListener('click', () => {
    searchOverlay.classList.remove('active');
    searchInput.value = '';
    searchResults.innerHTML = '';
});

// Debounced search to prevent too many Firestore reads
const handleSearch = debounce(async (e) => {
    const searchTerm = e.target.value.trim().toLowerCase();
    searchResults.innerHTML = '';

    if (searchTerm.length < 2) return;

    try {
        // Simple client side search if we have all products, OR Firestore query
        // For performance, searching by name prefix
        const q = query(collection(db, 'products'), where('name', '>=', searchTerm), where('name', '<=', searchTerm + '\uf8ff'), limit(5));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            searchResults.innerHTML = '<p style="padding: 20px; color: var(--text-muted);">No products found.</p>';
            return;
        }

        snapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            const discount = calculateDiscount(product.mrp, product.sellingPrice);
            searchResults.innerHTML += `
                <a href="/product.html?id=${product.id}" class="search-result-item">
                    <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
                    <div>
                        <h4>${product.name}</h4>
                        <span>${formatCurrency(product.sellingPrice)} ${discount > 0 ? `<strike style="color:var(--text-muted);font-size:0.8rem">${formatCurrency(product.mrp)}</strike>` : ''}</span>
                    </div>
                </a>
            `;
        });
    } catch (error) {
        console.error("Search Error:", error);
    }
}, 300);

searchInput.addEventListener('input', handleSearch);

// ------------------------- //
// 6. Product Card Generator //
// ------------------------- //
export const createProductCard = (product) => {
    const discount = calculateDiscount(product.mrp, product.sellingPrice);
    const isOutOfStock = product.stock <= 0;

    return `
        <div class="product-card tilt-element" data-id="${product.id}">
            <div class="product-img-container">
                <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
                
                ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
                
                <button class="product-wishlist" aria-label="Add to Wishlist" onclick="event.stopPropagation();">
                    <i class="far fa-heart"></i>
                </button>

                <div class="product-actions-overlay">
                    <a href="/product.html?id=${product.id}" class="btn btn-sm btn-primary">View Details</a>
                </div>
            </div>
            
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">${product.name}</h3>
                
                <div class="product-rating">
                    <i class="fas fa-star"></i>
                    <span>4.5 (${Math.floor(Math.random() * 100) + 10})</span>
                </div>
                
                <div class="price-container">
                    <span class="current-price">${formatCurrency(product.sellingPrice)}</span>
                    ${discount > 0 ? `<span class="original-price">${formatCurrency(product.mrp)}</span>` : ''}
                    <span class="stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}">
                        ${isOutOfStock ? 'Out of Stock' : 'In Stock'}
                    </span>
                </div>
            </div>
        </div>
    `;
};

// ------------------------- //
// 7. Fetch & Render Products//
// ------------------------- //
const fetchAndRenderProducts = async (gridEl, queryConstraints) => {
    // Show Skeletons initially
    gridEl.innerHTML = generateSkeletons(4);

    try {
        const q = query(collection(db, 'products'), ...queryConstraints);
        const querySnapshot = await getDocs(q);
        
        gridEl.innerHTML = ''; // Clear skeletons

        if (querySnapshot.empty) {
            gridEl.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:var(--text-muted); padding:40px 0;">No products found in this section.</p>';
            return;
        }

        querySnapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() };
            gridEl.innerHTML += createProductCard(product);
        });

        // Initialize 3D Tilt for new cards
        init3DTilt();
        
    } catch (error) {
        console.error("Error fetching products:", error);
        gridEl.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color:#FF3B30;">Error loading products. Please try again later.</p>';
    }
};

// Load Home Page Sections
const loadHomePage = () => {
    // Latest Collection (Last 8 added)
    fetchAndRenderProducts(latestGrid, [orderBy('createdAt', 'desc'), limit(8)]);
    
    // Featured Products (Where featured == true)
    fetchAndRenderProducts(featuredGrid, [where('featured', '==', true), limit(8)]);
    
    // Trending (Random 10 or based on a specific tag)
    fetchAndRenderProducts(trendingWrapper, [limit(10)]);
};

// ------------------------- //
// 8. 3D Tilt Effect Logic   //
// ------------------------- //
const init3DTilt = () => {
    const tiltElements = document.querySelectorAll('.tilt-element');
    
    tiltElements.forEach(el => {
        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = ((y - centerY) / centerY) * -5; // Max 5deg rotation
            const rotateY = ((x - centerX) / centerX) * 5;
            
            el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        el.addEventListener('mouseleave', () => {
            el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        });
    });
};

// ------------------------- //
// 9. Mini Cart Sidebar      //
// ------------------------- //
const openCart = () => {
    cartOverlay.classList.add('active');
    cartSidebar.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
    renderMiniCart();
};

const closeCart = () => {
    cartOverlay.classList.remove('active');
    cartSidebar.classList.remove('active');
    document.body.style.overflow = ''; // Restore scroll
};

cartToggle.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

const getLocalCart = () => {
    return JSON.parse(localStorage.getItem('spbh_cart')) || [];
};

const renderMiniCart = () => {
    const cart = getLocalCart();
    const totalCount = cart.reduce((acc, item) => acc + item.qty, 0);
    const totalPrice = cart.reduce((acc, item) => acc + (item.sellingPrice * item.qty), 0);

    // Update Header Badge
    cartCountEl.innerText = totalCount;
    cartItemCountEl.innerText = totalCount;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-cart" style="text-align: center; padding-top: 40px; color: var(--text-muted);">
                <i class="fas fa-shopping-bag" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.3;"></i>
                <p>Your cart is empty</p>
            </div>`;
        cartFooter.style.display = 'none';
        return;
    }

    cartFooter.style.display = 'block';
    grandTotalEl.innerText = formatCurrency(totalPrice);

    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-img">
                <img src="${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h4 class="cart-item-name">${item.name}</h4>
                <p class="cart-item-price">${formatCurrency(item.sellingPrice)}</p>
                <div class="cart-item-qty">
                    <button class="qty-btn" onclick="updateMiniCartQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateMiniCartQty('${item.id}', 1)">+</button>
                </div>
            </div>
            <button class="cart-item-remove" onclick="removeFromMiniCart('${item.id}')">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('');
};

// Global functions for inline onclick in mini cart
window.updateMiniCartQty = (id, change) => {
    let cart = getLocalCart();
    const index = cart.findIndex(item => item.id === id);
    if (index !== -1) {
        cart[index].qty += change;
        if (cart[index].qty <= 0) cart.splice(index, 1);
        localStorage.setItem('spbh_cart', JSON.stringify(cart));
        renderMiniCart();
    }
};

window.removeFromMiniCart = (id) => {
    let cart = getLocalCart().filter(item => item.id !== id);
    localStorage.setItem('spbh_cart', JSON.stringify(cart));
    renderMiniCart();
    showToast('Item removed from cart', 'error');
};

// ------------------------- //
// 10. Auth State Listener   //
// ------------------------- //
onAuthStateChanged(auth, (user) => {
    const userBtn = document.querySelector('.user-menu-btn');
    if (user) {
        // User is signed in
        userBtn.href = '/profile.html';
        userBtn.innerHTML = `<i class="fas fa-user-check"></i>`;
    } else {
        // User is signed out
        userBtn.href = '/login.html';
        userBtn.innerHTML = `<i class="far fa-user"></i>`;
    }
});

// ------------------------- //
// 11. Initialize App        //
// ------------------------- //
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadHomePage();
    renderMiniCart(); // Sync cart count on page load
});