/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Admin Panel Logic
 * =====================================================
 * File: /js/admin.js
 * Description: Complete admin dashboard logic. Handles 
 * security checks, product management (CRUD, image upload), 
 * order management, and dashboard statistics.
 * =====================================================
 */

// Firebase Imports
import { auth, db, storage } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { 
    collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, 
    query, orderBy, serverTimestamp, runTransaction
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js";

// Utility Imports
import { compressImage, formatCurrency, calculateDiscount, showToast } from './utils.js';

// ------------------------- //
// 1. State Variables        //
// ------------------------- //
let currentEditProductId = null;
let selectedImageFiles = []; // Stores actual File objects for upload
let existingImageUrls = [];   // Stores URLs when editing a product

// ------------------------- //
// 2. DOM Elements           //
// ------------------------- //
// Sidebar & Nav
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const adminSidebar = document.getElementById('adminSidebar');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

// Dashboard
const totalProductsEl = document.getElementById('totalProducts');
const totalOrdersEl = document.getElementById('totalOrders');
const totalUsersEl = document.getElementById('totalUsers');
const totalRevenueEl = document.getElementById('totalRevenue');

// Sections (Tabs)
const sections = document.querySelectorAll('.admin-section');
const menuLinks = document.querySelectorAll('.admin-menu a');

// Product Management
const productForm = document.getElementById('productForm');
const productFormTitle = document.getElementById('productFormTitle');
const productNameInput = document.getElementById('productNameInput');
const productDescInput = document.getElementById('productDescInput');
const productCategoryInput = document.getElementById('productCategoryInput');
const productCollectionInput = document.getElementById('productCollectionInput');
const productMrpInput = document.getElementById('productMrpInput');
const productSellingPriceInput = document.getElementById('productSellingPriceInput');
const productStockInput = document.getElementById('productStockInput');
const productFeaturedToggle = document.getElementById('productFeaturedToggle');
const imageDropzone = document.getElementById('imageDropzone');
const imageFileInput = document.getElementById('imageFileInput');
const imagePreviews = document.getElementById('imagePreviews');
const submitProductBtn = document.getElementById('submitProductBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const productsTableBody = document.getElementById('productsTableBody');

// Order Management
const ordersTableBody = document.getElementById('ordersTableBody');
const orderSearchInput = document.getElementById('orderSearchInput');

// ------------------------- //
// 3. Security: Admin Guard  //
// ------------------------- //
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                initAdminPanel();
            } else {
                showToast('Access Denied: You are not an admin.', 'error');
                window.location.href = '/index.html';
            }
        } catch (error) {
            console.error("Admin check failed:", error);
            window.location.href = '/login.html';
        }
    } else {
        window.location.href = '/login.html';
    }
});

// ------------------------- //
// 4. Initialize Admin       //
// ------------------------- *
const initAdminPanel = () => {
    loadDashboardStats();
    loadAllProducts();
    loadAllOrders();
    setupEventListeners();
};

// ------------------------- //
// 5. Navigation & UI       //
// ------------------------- //
const setupEventListeners = () => {
    // Mobile Sidebar Toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            adminSidebar.classList.toggle('active');
        });
    }

    // Tab Navigation
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-section');
            
            // Update Active Link
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Show Target Section
            sections.forEach(sec => sec.style.display = 'none');
            document.getElementById(targetId).style.display = 'block';

            // Close mobile sidebar
            adminSidebar.classList.remove('active');
        });
    });

    // Image Upload
    imageDropzone.addEventListener('click', () => imageFileInput.click());
    imageDropzone.addEventListener('dragover', (e) => { e.preventDefault(); imageDropzone.classList.add('dragover'); });
    imageDropzone.addEventListener('dragleave', () => imageDropzone.classList.remove('dragover'));
    imageDropzone.addEventListener('drop', handleImageDrop);
    imageFileInput.addEventListener('change', handleImageSelect);

    // Form Submit
    productForm.addEventListener('submit', handleProductSubmit);
    
    // Cancel Edit
    if(cancelEditBtn) cancelEditBtn.addEventListener('click', resetProductForm);

    // Order Search
    if(orderSearchInput) orderSearchInput.addEventListener('input', handleOrderSearch);

    // Logout
    if(adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', async () => {
            await signOut(auth);
            window.location.href = '/login.html';
        });
    }
};

// ------------------------- //
// 6. Dashboard Statistics   //
// ------------------------- //
const loadDashboardStats = async () => {
    try {
        // Products Count
        const prodSnap = await getDocs(collection(db, "products"));
        if(totalProductsEl) totalProductsEl.innerText = prodSnap.size;

        // Orders Count & Revenue
        const ordSnap = await getDocs(collection(db, "orders"));
        let revenue = 0;
        ordSnap.forEach(doc => revenue += (doc.data().grandTotal || 0));
        if(totalOrdersEl) totalOrdersEl.innerText = ordSnap.size;
        if(totalRevenueEl) totalRevenueEl.innerText = formatCurrency(revenue);

        // Users Count
        const userSnap = await getDocs(collection(db, "users"));
        if(totalUsersEl) totalUsersEl.innerText = userSnap.size;
    } catch (error) {
        console.error("Error loading stats:", error);
    }
};

// ------------------------- //
// 7. Image Handling         //
// ------------------------- //
const handleImageDrop = (e) => {
    e.preventDefault();
    imageDropzone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    processImages(files);
};

const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    processImages(files);
    e.target.value = ''; // Reset input
};

const processImages = async (files) => {
    for (const file of files) {
        if (selectedImageFiles.length + existingImageUrls.length >= 4) {
            return showToast('Maximum 4 images allowed.', 'error');
        }
        try {
            showToast('Compressing image...', 'info');
            const compressedFile = await compressImage(file, 200);
            selectedImageFiles.push(compressedFile);
            renderImagePreviews();
            showToast('Image added successfully.', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
};

const renderImagePreviews = () => {
    imagePreviews.innerHTML = '';
    
    // Render existing URLs (during edit)
    existingImageUrls.forEach((url, index) => {
        imagePreviews.innerHTML += `
            <div class="preview-item">
                <img src="${url}" alt="Existing">
                <button type="button" class="remove-preview" onclick="removeExistingImage(${index})"><i class="fas fa-times"></i></button>
            </div>`;
    });

    // Render new selected files
    selectedImageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreviews.innerHTML += `
                <div class="preview-item">
                    <img src="${e.target.result}" alt="New">
                    <button type="button" class="remove-preview" onclick="removeNewImage(${index})"><i class="fas fa-times"></i></button>
                </div>`;
        };
        reader.readAsDataURL(file);
    });
};

// Global functions for inline onclick
window.removeExistingImage = (index) => {
    existingImageUrls.splice(index, 1);
    renderImagePreviews();
};

window.removeNewImage = (index) => {
    selectedImageFiles.splice(index, 1);
    renderImagePreviews();
};

// ------------------------- //
// 8. Product CRUD           //
// ------------------------- //
const handleProductSubmit = async (e) => {
    e.preventDefault();
    
    submitProductBtn.disabled = true;
    submitProductBtn.innerText = 'Saving...';

    try {
        const productData = {
            name: productNameInput.value.trim(),
            description: productDescInput.value.trim(),
            category: productCategoryInput.value.trim(),
            collection: productCollectionInput.value.trim(),
            mrp: Number(productMrpInput.value),
            sellingPrice: Number(productSellingPriceInput.value),
            stock: Number(productStockInput.value),
            featured: productFeaturedToggle.checked,
            // NO DISCOUNT FIELD SAVED - Calculated dynamically on frontend
            updatedAt: serverTimestamp()
        };

        let docRef;

        if (currentEditProductId) {
            // UPDATE
            docRef = doc(db, "products", currentEditProductId);
            await updateDoc(docRef, productData);
            showToast('Product updated successfully!', 'success');
        } else {
            // CREATE
            productData.createdAt = serverTimestamp();
            productData.images = []; // Initialize empty, fill after upload
            docRef = await addDoc(collection(db, "products"), productData);
            showToast('Product created! Uploading images...', 'success');
        }

        // Handle Image Uploads
        if (selectedImageFiles.length > 0) {
            const uploadedUrls = await uploadImages(docRef.id, selectedImageFiles);
            const finalImages = [...existingImageUrls, ...uploadedUrls];
            await updateDoc(doc(db, "products", docRef.id), { images: finalImages });
        } else if (currentEditProductId) {
            // If editing and no new images selected, keep existing ones
            await updateDoc(doc(db, "products", docRef.id), { images: existingImageUrls });
        }

        loadAllProducts();
        loadDashboardStats();
        resetProductForm();

    } catch (error) {
        console.error("Error saving product:", error);
        showToast('Failed to save product.', 'error');
    } finally {
        submitProductBtn.disabled = false;
        submitProductBtn.innerText = currentEditProductId ? 'Update Product' : 'Add Product';
    }
};

const uploadImages = async (productId, files) => {
    const urls = [];
    for (let i = 0; i < files.length; i++) {
        const storageRef = ref(storage, `products/${productId}/img_${Date.now()}_${i}.jpg`);
        const snapshot = await uploadBytes(storageRef, files[i]);
        const url = await getDownloadURL(snapshot);
        urls.push(url);
    }
    return urls;
};

const loadAllProducts = async () => {
    if(!productsTableBody) return;
    productsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Loading...</td></tr>';

    try {
        const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        productsTableBody.innerHTML = '';

        if (snapshot.empty) {
            productsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">No products added yet.</td></tr>';
            return;
        }

        snapshot.forEach(docSnap => {
            const p = docSnap.data();
            const discount = calculateDiscount(p.mrp, p.sellingPrice);
            const imgUrl = p.images && p.images.length > 0 ? p.images[0] : 'https://via.placeholder.com/50';
            
            productsTableBody.innerHTML += `
                <tr>
                    <td><img src="${imgUrl}" alt="${p.name}" class="table-img"></td>
                    <td><strong>${p.name}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${p.category}</span></td>
                    <td>${formatCurrency(p.mrp)}</td>
                    <td>${formatCurrency(p.sellingPrice)} ${discount > 0 ? `<br><span style="color:#34C759; font-size:0.8rem; font-weight:600;">${discount}% OFF</span>` : ''}</td>
                    <td>${p.stock}</td>
                    <td>
                        <div class="action-btns">
                            <button class="action-btn edit" onclick="editProduct('${docSnap.id}')" title="Edit"><i class="fas fa-pen"></i></button>
                            <button class="action-btn delete" onclick="deleteProduct('${docSnap.id}', '${p.name}')" title="Delete"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>`;
        });
    } catch (error) {
        console.error("Error loading products:", error);
        productsTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#FF3B30;">Error loading products.</td></tr>';
    }
};

window.editProduct = async (id) => {
    try {
        const docSnap = await getDoc(doc(db, "products", id));
        if (!docSnap.exists()) return showToast('Product not found.', 'error');
        
        const p = docSnap.data();
        currentEditProductId = id;
        
        // Populate Form
        productFormTitle.innerText = 'Edit Product';
        submitProductBtn.innerText = 'Update Product';
        cancelEditBtn.style.display = 'inline-block';
        
        productNameInput.value = p.name || '';
        productDescInput.value = p.description || '';
        productCategoryInput.value = p.category || '';
        productCollectionInput.value = p.collection || '';
        productMrpInput.value = p.mrp || 0;
        productSellingPriceInput.value = p.sellingPrice || 0;
        productStockInput.value = p.stock || 0;
        productFeaturedToggle.checked = p.featured || false;

        existingImageUrls = p.images || [];
        selectedImageFiles = [];
        renderImagePreviews();

        // Scroll to form
        document.getElementById('productFormSection').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        showToast('Error fetching product for editing.', 'error');
    }
};

window.deleteProduct = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;

    try {
        // 1. Delete Document
        await deleteDoc(doc(db, "products", id));
        
        // 2. Delete Images from Storage (Best effort)
        try {
            const storageRef = ref(storage, `products/${id}`);
            // Note: In Firebase Storage, to delete a "folder", you must list files first. 
            // For simplicity here we just delete the document. To fully delete storage, you need a Cloud Function or listAll.
        } catch(e) { console.warn("Could not delete storage files:", e); }

        showToast('Product deleted!', 'success');
        loadAllProducts();
        loadDashboardStats();
    } catch (error) {
        showToast('Failed to delete product.', 'error');
    }
};

const resetProductForm = () => {
    currentEditProductId = null;
    productForm.reset();
    productFormTitle.innerText = 'Add New Product';
    submitProductBtn.innerText = 'Add Product';
    cancelEditBtn.style.display = 'none';
    selectedImageFiles = [];
    existingImageUrls = [];
    renderImagePreviews();
};

// ------------------------- //
// 9. Order Management       //
// ------------------------- //
let allOrdersCache = [];

const loadAllOrders = async () => {
    if(!ordersTableBody) return;
    ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">Loading...</td></tr>';

    try {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        allOrdersCache = [];
        ordersTableBody.innerHTML = '';

        if (snapshot.empty) {
            ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 40px; color: var(--text-muted);">No orders received yet.</td></tr>';
            return;
        }

        snapshot.forEach(docSnap => {
            const o = { id: docSnap.id, ...docSnap.data() };
            allOrdersCache.push(o);
            ordersTableBody.innerHTML += createOrderRow(o);
        });
    } catch (error) {
        console.error("Error loading orders:", error);
        ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#FF3B30;">Error loading orders.</td></tr>';
    }
};

const createOrderRow = (o) => {
    let dateStr = 'N/A';
    if (o.createdAt) dateStr = o.createdAt.toDate().toLocaleDateString('en-IN');
    
    let statusClass = 'status-pending';
    if(o.status) {
        const s = o.status.toLowerCase();
        if(s === 'confirmed') statusClass = 'status-confirmed';
        if(s === 'shipped') statusClass = 'status-shipped';
        if(s === 'delivered') statusClass = 'status-delivered';
        if(s === 'cancelled') statusClass = 'status-cancelled';
    }

    // Create status dropdown options
    const statuses = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
    const optionsHtml = statuses.map(s => `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('');

    return `
        <tr>
            <td><strong>#${o.id.substring(0,8).toUpperCase()}</strong><br><span style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</span></td>
            <td>${o.customerName || 'N/A'}<br><span style="font-size:0.8rem; color:var(--text-muted);">📞 ${o.customerMobile || 'N/A'}</span></td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${o.items ? o.items.map(i=>i.name).join(', ') : 'N/A'}</td>
            <td><strong>${formatCurrency(o.grandTotal || 0)}</strong></td>
            <td>
                <select class="form-control status-select" style="padding: 8px; font-size: 0.85rem;" onchange="updateOrderStatus('${o.id}', this.value)">
                    ${optionsHtml}
                </select>
            </td>
            <td><span class="status-badge ${statusClass}">${o.status || 'Pending'}</span></td>
        </tr>`;
};

// ⭐ UPDATED: Ab is function mein 'Confirmed' status hone par stock automatically
// kam ho jaata hai. Firestore runTransaction use kiya hai taaki read+write
// atomic rahe (agar ek hi product wale 2 orders simultaneously confirm hon
// to bhi stock sahi se hi kam ho, koi race condition na aaye).
window.updateOrderStatus = async (orderId, newStatus) => {
    try {
        // Cache se purana status nikal lo, taaki pata chale stock kam karna hai ya nahi
        const order = allOrdersCache.find(o => o.id === orderId);
        const previousStatus = order ? order.status : null;

        // Stock sirf TABHI kam hoga jab:
        // 1. Naya status 'Confirmed' hai, AND
        // 2. Order pehle se 'Confirmed' nahi tha (dropdown dobara same
        //    value pe set karne se stock dobara kam nahi hoga)
        const shouldDecrementStock = newStatus === 'Confirmed' && previousStatus !== 'Confirmed';

        if (shouldDecrementStock && order && order.items && order.items.length > 0) {
            await runTransaction(db, async (transaction) => {
                // Pehle saare product docs read karo
                const productRefs = order.items.map(item => doc(db, "products", item.id));
                const productSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

                // Ab har product ka naya stock calculate karo aur update karo
                productSnaps.forEach((snap, index) => {
                    if (!snap.exists()) return; // Product delete ho gaya ho shayad
                    const item = order.items[index];
                    const currentStock = snap.data().stock || 0;
                    const newStock = Math.max(0, currentStock - item.qty); // Negative se bachao
                    transaction.update(productRefs[index], { stock: newStock });
                });

                // Order status bhi isi transaction mein update kar do
                transaction.update(doc(db, "orders", orderId), { status: newStatus });
            });

            showToast(`Order confirmed! Stock updated for ${order.items.length} item(s).`, 'success');
        } else {
            // Normal status update (Confirmed se kisi aur status pe, ya
            // dobara Confirmed select karna) - stock se kuch lena dena nahi
            await updateDoc(doc(db, "orders", orderId), { status: newStatus });
            showToast(`Order status updated to ${newStatus}`, 'success');
        }

        loadAllOrders();
        loadAllProducts(); // Stock change product table mein bhi reflect ho jaaye
    } catch (error) {
        console.error("Error updating order status:", error);
        showToast('Failed to update status.', 'error');
    }
};

const handleOrderSearch = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = allOrdersCache.filter(o => 
        o.id.toLowerCase().includes(searchTerm) || 
        (o.customerName && o.customerName.toLowerCase().includes(searchTerm)) ||
        (o.customerMobile && o.customerMobile.includes(searchTerm))
    );

    ordersTableBody.innerHTML = '';
    if (filtered.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">No orders match your search.</td></tr>';
    } else {
        filtered.forEach(o => ordersTableBody.innerHTML += createOrderRow(o));
    }
};
