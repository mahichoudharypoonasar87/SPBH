import { getProductById, getRelatedProducts } from './products.js';
import { calculateDiscount, formatCurrency, showToast } from './utils.js';

// Premium Placeholder Image (Inline SVG so it loads instantly without external links)
const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='800' viewBox='0 0 600 800'%3E%3Crect width='600' height='800' fill='%23f5f5f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Inter, sans-serif' font-size='24' fill='%23999'%3ENo Image%3C/text%3E%3C/svg%3E";

// Helper function to safely get image
const getImg = (images) => (images && images.length > 0) ? images[0] : PLACEHOLDER_IMG;

const createProductCard = (product) => {
    const discount = calculateDiscount(product.mrp, product.sellingPrice);
    const isOutOfStock = product.stock <= 0;
    const mainImg = getImg(product.images); // Safe image fetch
    
    return `
        <div class="product-card tilt-element" data-id="${product.id}">
            <div class="product-img-container">
                <img src="${mainImg}" alt="${product.name}" loading="lazy">
                ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
                <button class="product-wishlist" aria-label="Add to Wishlist"><i class="far fa-heart"></i></button>
                <div class="product-actions-overlay">
                    <a href="/product.html?id=${product.id}" class="btn btn-sm btn-primary">View Details</a>
                </div>
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                <h3 class="product-name">${product.name}</h3>
                <div class="product-rating"><i class="fas fa-star"></i><span>4.5</span></div>
                <div class="price-container">
                    <span class="current-price">${formatCurrency(product.sellingPrice)}</span>
                    ${discount > 0 ? `<span class="original-price">${formatCurrency(product.mrp)}</span>` : ''}
                    <span class="stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}">${isOutOfStock ? 'Out of Stock' : 'In Stock'}</span>
                </div>
            </div>
        </div>
    `;
};

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

    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    if (!productId) { window.location.href = '/index.html'; return; }

    try {
        const product = await getProductById(productId);
        
        if (!product) {
            productContainer.innerHTML = `<div style="text-align:center;padding:100px;"><h2>Product Not Found</h2><a href="/index.html" class="btn btn-primary">Go Home</a></div>`;
            return;
        }
        
        currentProduct = product;
        document.title = `${product.name} | Shree Panchmukhi Balaji`;
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
        } else {
            stockStatus.innerText = `In Stock (${product.stock} left)`;
            stockStatus.className = 'stock-status in-stock';
        }

        if (product.sizes && product.sizes.length > 0) {
            sizeOptionsContainer.style.display = 'flex';
            sizeOptionsContainer.innerHTML = product.sizes.map((size) => `<button class="size-btn" data-size="${size}">${size}</button>`).join('');
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

        // --- SAFE IMAGE LOADING ---
        // Use placeholder if no image exists
        mainImage.src = getImg(product.images);
        mainImage.alt = product.name;
        
        if (product.images && product.images.length > 1) {
            thumbnailContainer.innerHTML = product.images.map((img, index) => `
                <div class="thumbnail ${index === 0 ? 'active' : ''}" data-index="${index}">
                    <img src="${img}" alt="${product.name}" loading="lazy">
                </div>
            `).join('');
            
            document.querySelectorAll('.thumbnail').forEach(thumb => {
                thumb.addEventListener('click', (e) => {
                    const index = parseInt(e.currentTarget.dataset.index);
                    mainImage.style.opacity = '0';
                    setTimeout(() => { mainImage.src = currentProduct.images[index]; mainImage.style.opacity = '1'; }, 200);
                    document.querySelectorAll('.thumbnail').forEach((t, i) => t.classList.toggle('active', i === index));
                });
            });
        } else {
            // Hide thumbnails completely if 0 or 1 image
            thumbnailContainer.style.display = 'none';
        }

        mainImageWrapper.addEventListener('mousemove', (e) => {
            const rect = mainImageWrapper.getBoundingClientRect();
            mainImage.style.transformOrigin = `${(e.clientX - rect.left)/rect.width * 100}% ${(e.clientY - rect.top)/rect.height * 100}%`;
            mainImage.style.transform = 'scale(2)';
        });
        mainImageWrapper.addEventListener('mouseleave', () => {
            mainImage.style.transform = 'scale(1)';
            mainImage.style.transition = 'transform 0.3s ease';
            setTimeout(() => mainImage.style.transition = '', 300);
        });

        qtyMinus.addEventListener('click', () => { if (selectedQty > 1) { selectedQty--; qtyValue.innerText = selectedQty; } });
        qtyPlus.addEventListener('click', () => { if (selectedQty < currentProduct.stock) { selectedQty++; qtyValue.innerText = selectedQty; } });

        addToCartBtn.addEventListener('click', () => {
            if (!currentProduct) return;
            let cart = JSON.parse(localStorage.getItem('spbh_cart')) || [];
            const existingIndex = cart.findIndex(item => item.id === currentProduct.id && item.size === selectedSize);
            
            if (existingIndex !== -1) { 
                cart[existingIndex].qty += selectedQty; 
            } else { 
                cart.push({ 
                    id: currentProduct.id, 
                    name: currentProduct.name, 
                    image: getImg(currentProduct.images), // Safe image for cart
                    mrp: currentProduct.mrp, 
                    sellingPrice: currentProduct.sellingPrice, 
                    category: currentProduct.category, 
                    size: selectedSize || 'Free Size', 
                    qty: selectedQty 
                }); 
            }
            localStorage.setItem('spbh_cart', JSON.stringify(cart));
            showToast('Added to cart!', 'success');
        });

        shareBtn.addEventListener('click', async () => {
            try {
                if (navigator.share) await navigator.share({ title: currentProduct.name, url: window.location.href });
                else { await navigator.clipboard.writeText(window.location.href); showToast('Link copied!', 'success'); }
            } catch (e) {}
        });

        if (relatedGrid) {
            const related = await getRelatedProducts(product.id, product.category, 4);
            if (related.length > 0) {
                relatedGrid.innerHTML = '';
                related.forEach(p => relatedGrid.innerHTML += createProductCard(p));
                document.querySelectorAll('.tilt-element').forEach(el => {
                    el.addEventListener('mousemove', (e) => {
                        const rect = el.getBoundingClientRect();
                        el.style.transform = `perspective(1000px) rotateX(${((e.clientY - rect.top)/rect.height - 0.5) * -10}deg) rotateY(${((e.clientX - rect.left)/rect.width - 0.5) * 10}deg) scale3d(1.02, 1.02, 1.02)`;
                    });
                    el.addEventListener('mouseleave', () => { el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)'; });
                });
            } else { 
                relatedGrid.parentElement.style.display = 'none'; 
            }
        }

    } catch (error) {
        console.error(error);
        showToast('Failed to load product.', 'error');
    }
});
