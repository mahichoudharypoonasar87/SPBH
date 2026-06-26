/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Product Page Logic
 * =====================================================
 * File: /js/product.js
 * Description: Isolated product logic. Does not rely on app.js
 * =====================================================
 */

// Imports (app.js import HATA DIYA HAI)
import { getProductById, getRelatedProducts } from './products.js';
import { calculateDiscount, formatCurrency, showToast } from './utils.js';

// ------------------------- //
// Local Card Generator      //
// ------------------------- //
// (Copied from app.js to prevent cross-page crashing)
const createProductCard = (product) => {
    const discount = calculateDiscount(product.mrp, product.sellingPrice);
    const isOutOfStock = product.stock <= 0;

    return `
        <div class="product-card tilt-element" data-id="${product.id}">
            <div class="product-img-container">
                <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
                ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
                <button class="product-wishlist" aria-label="Add to Wishlist">
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
// Initialize Safely         //
// ------------------------- //
document.addEventListener('DOMContentLoaded', async () => {
    
    const productContainer = document.getElementById('productContainer');
    const mainImageWrapper = document.getElementById('mainImageWrapper');
    const mainImage = document.getElementById('mainImage');
    const thumbnailContainer = document.getElementById('thumbnailContainer');
    const productName = document.getElementById('productName');
    const productCategory = document.getElementById('productCategory');
    const productDesc = document.getElementById('productDesc');
    const productMrp = document.getElementById('productMrp');
    const productPrice = document.getElementById('productPrice');
    const productDiscount = document.getElementById('productDiscount');
    const stockStatus = document.getElementById('stockStatus');
    const sizeOptionsContainer = document.getElementById('sizeOptionsContainer');
    const qtyValue = document.getElementById('qtyValue');
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    const addToCartBtn = document.getElementById('addToCartBtn');
    const shareBtn = document.getElementById('shareBtn');
    const relatedGrid = document.getElementById('relatedProductsGrid');

    let currentProduct = null;
    let selectedSize = null;
    let selectedQty = 1;
    let currentImageIndex = 0;

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        window.location.href = '/index.html';
        return;
    }

    try {
        const product = await getProductById(productId);
        
        if (!product) {
            productContainer.innerHTML = `
                <div style="text-align: center; padding: 100px 20px;">
                    <h2>Product Not Found</h2>
                    <p>The product you are looking for does not exist.</p>
                    <a href="/index.html" class="btn btn-primary" style="margin-top: 20px;">Go Home</a>
                </div>`;
            return;
        }

        currentProduct = product;
        renderProductDetails(product);
        setupImageZoom();
        fetchAndRenderRelated(product);

    } catch (error) {
        console.error("Error loading product:", error);
        showToast('Failed to load product details.', 'error');
    }

    const renderProductDetails = (product) => {
        document.title = `${product.name} | Shree Panchmukhi Balaji Handloom`;
        const discount = calculateDiscount(product.mrp, product.sellingPrice);
        const isOutOfStock = product.stock <= 0;

        productName.innerText = product.name;
        productCategory.innerText = product.category;
        productDesc.innerHTML = product.description || 'No description available.';
        
        productMrp.innerText = formatCurrency(product.mrp);
        productPrice.innerText = formatCurrency(product.sellingPrice);
        
        if (discount > 0) {
            productDiscount.innerText = `${discount}% OFF`;
            productDiscount.style.display = 'inline-block';
            productMrp.style.display = 'inline';
        } else {
            productDiscount.style.display = 'none';
            productMrp.style.display = 'none';
        }

        if (isOutOfStock) {
            stockStatus.innerText = 'Out of Stock';
            stockStatus.className = 'stock-status out-of-stock';
            addToCartBtn.disabled = true;
            addToCartBtn.innerText = 'Out of Stock';
            addToCartBtn.style.opacity = '0.5';
            addToCartBtn.style.cursor = 'not-allowed';
        } else {
            stockStatus.innerText = `In Stock (${product.stock} left)`;
            stockStatus.className = 'stock-status in-stock';
        }

        if (product.sizes && product.sizes.length > 0) {
            sizeOptionsContainer.style.display = 'flex';
            sizeOptionsContainer.innerHTML = product.sizes.map((size) => `
                <button class="size-btn" data-size="${size}">${size}</button>
            `).join('');

            document.querySelectorAll('.size-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                    selectedSize = e.target.dataset.size;
                });
            });
            
            document.querySelector('.size-btn').classList.add('active');
            selectedSize = product.sizes[0];
        } else {
            sizeOptionsContainer.style.display = 'none';
        }

        if (product.images && product.images.length > 0) {
            mainImage.src = product.images[0];
            mainImage.alt = product.name;
            
            if (product.images.length > 1) {
                thumbnailContainer.innerHTML = product.images.map((img, index) => `
                    <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                        <img src="${img}" alt="${product.name} view ${index + 1}" loading="lazy">
                    </div>
                `).join('');

                document.querySelectorAll('.thumbnail').forEach(thumb => {
                    thumb.addEventListener('click', (e) => {
                        const index = parseInt(e.currentTarget.dataset.index);
                        changeMainImage(index);
                    });
                });
            } else {
                thumbnailContainer.style.display = 'none';
            }
        }
    };

    const changeMainImage = (index) => {
        currentImageIndex = index;
        mainImage.style.opacity = '0';
        mainImage.style.transform = 'scale(1.1)';
        setTimeout(() => {
            mainImage.src = currentProduct.images[index];
            mainImage.style.opacity = '1';
            mainImage.style.transform = 'scale(1)';
        }, 200);
        document.querySelectorAll('.thumbnail').forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });
    };

    const setupImageZoom = () => {
        mainImageWrapper.addEventListener('mousemove', (e) => {
            const rect = mainImageWrapper.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const width = rect.width;
            const height = rect.height;
            const xPercent = (x / width) * 100;
            const yPercent = (y / height) * 100;
            mainImage.style.transformOrigin = `${xPercent}% ${yPercent}%`;
            mainImage.style.transform = 'scale(2)';
        });
        mainImageWrapper.addEventListener('mouseleave', () => {
            mainImage.style.transformOrigin = 'center center';
            mainImage.style.transform = 'scale(1)';
            mainImage.style.transition = 'transform 0.3s ease';
            setTimeout(() => { mainImage.style.transition = ''; }, 300);
        });
    };

    qtyMinus.addEventListener('click', () => {
        if (selectedQty > 1) { selectedQty--; qtyValue.innerText = selectedQty; }
    });

    qtyPlus.addEventListener('click', () => {
        if (currentProduct && selectedQty < currentProduct.stock) {
            selectedQty++; qtyValue.innerText = selectedQty;
        } else {
            showToast('Cannot exceed available stock limit.', 'error');
        }
    });

    addToCartBtn.addEventListener('click', () => {
        if (!currentProduct) return;
        if (currentProduct.sizes && currentProduct.sizes.length > 0 && !selectedSize) {
            return showToast('Please select a size.', 'error');
        }
        let cart = JSON.parse(localStorage.getItem('spbh_cart')) || [];
        const existingIndex = cart.findIndex(item => item.id === currentProduct.id && item.size === selectedSize);

        if (existingIndex !== -1) {
            cart[existingIndex].qty += selectedQty;
        } else {
            cart.push({
                id: currentProduct.id, name: currentProduct.name, image: currentProduct.images[0],
                mrp: currentProduct.mrp, sellingPrice: currentProduct.sellingPrice, category: currentProduct.category,
                size: selectedSize || 'Free Size', qty: selectedQty
            });
        }
        localStorage.setItem('spbh_cart', JSON.stringify(cart));
        showToast(`${currentProduct.name} added to cart!`, 'success');
        addToCartBtn.innerText = 'Added!';
        setTimeout(() => { addToCartBtn.innerText = 'Add to Cart'; }, 1500);
    });

    shareBtn.addEventListener('click', async () => {
        const shareData = { title: currentProduct.name, text: `Check out ${currentProduct.name} at Shree Panchmukhi Balaji Handloom!`, url: window.location.href };
        try {
            if (navigator.share) { await navigator.share(shareData); }
            else { await navigator.clipboard.writeText(window.location.href); showToast('Link copied!', 'success'); }
        } catch (error) { showToast('Could not share.', 'error'); }
    });

    const fetchAndRenderRelated = async (product) => {
        if (!relatedGrid) return;
        relatedGrid.innerHTML = '<div class="skeleton skeleton-img" style="grid-column: 1/-1; height: 300px;"></div>';
        const related = await getRelatedProducts(product.id, product.category, 4);
        if (related.length === 0) { relatedGrid.parentElement.style.display = 'none'; return; }
        relatedGrid.innerHTML = '';
        related.forEach(p => { relatedGrid.innerHTML += createProductCard(p); });

        document.querySelectorAll('.tilt-element').forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left; const y = e.clientY - rect.top;
                const centerX = rect.width / 2; const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -5;
                const rotateY = ((x - centerX) / centerX) * 5;
                el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
            });
        });
    };
});
