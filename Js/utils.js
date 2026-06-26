/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Utility Functions
 * =====================================================
 * File: /js/utils.js
 * Description: Reusable helper functions used across 
 * the application like discount calculation, toast 
 * notifications, image compression, and formatting.
 * =====================================================
 */

/**
 * Calculate Discount Percentage
 * Formula: ((MRP - Selling Price) / MRP) * 100
 * @param {number} mrp - Maximum Retail Price
 * @param {number} sellingPrice - Actual Selling Price
 * @returns {number} - Rounded discount percentage
 */
export const calculateDiscount = (mrp, sellingPrice) => {
    if (mrp <= 0 || sellingPrice <= 0 || sellingPrice >= mrp) return 0;
    const discount = ((mrp - sellingPrice) / mrp) * 100;
    return Math.round(discount);
};

/**
 * Format Currency to Indian Rupee
 * @param {number} amount 
 * @returns {string} - Formatted string (e.g., ₹1,500)
 */
export const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
};

/**
 * Show Toast Notification
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 */
export const showToast = (message, type = 'success') => {
    // Get or create toast container
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    
    toast.innerHTML = `
        <span style="font-size: 1.2rem; font-weight: bold;">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove toast after animation completes (approx 3 seconds)
    setTimeout(() => {
        toast.remove();
        // Remove container if empty
        if (container.children.length === 0) container.remove();
    }, 3000);
};

/**
 * Compress Image Before Upload
 * Ensures image is under maxSizeKB. Rejects if impossible.
 * @param {File} file - Image file from input
 * @param {number} maxSizeKB - Maximum allowed size in KB (Default: 200KB)
 * @returns {Promise<File>} - Compressed image file
 */
export const compressImage = (file, maxSizeKB = 200) => {
    return new Promise((resolve, reject) => {
        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            return reject(new Error('Only image files are allowed.'));
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;

            img.onload = () => {
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');
                
                // Set canvas dimensions to image dimensions
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                let quality = 0.8; // Start with 80% quality
                let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                let sizeInKB = Math.round((compressedDataUrl.length * 3) / 4) / 1024;

                // Loop to reduce quality until size is under maxSizeKB
                while (sizeInKB > maxSizeKB && quality > 0.1) {
                    quality -= 0.1;
                    compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    sizeInKB = Math.round((compressedDataUrl.length * 3) / 4) / 1024;
                }

                // If still too large after max compression, resize the image dimensions
                if (sizeInKB > maxSizeKB) {
                    let scale = Math.sqrt(maxSizeKB / sizeInKB);
                    canvas.width = img.width * scale;
                    canvas.height = img.height * scale;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    sizeInKB = Math.round((compressedDataUrl.length * 3) / 4) / 1024;
                }

                // Final check: reject if STILL too large (corrupted/heavy image)
                if (sizeInKB > maxSizeKB) {
                    return reject(new Error(`Image is too large. Maximum size allowed is ${maxSizeKB}KB even after compression.`));
                }

                // Convert dataURL back to File object
                const byteString = atob(compressedDataUrl.split(',')[1]);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }

                const compressedFile = new File([ab], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                    type: 'image/jpeg',
                    lastModified: new Date().getTime()
                });

                resolve(compressedFile);
            };

            img.onerror = () => reject(new Error('Failed to load image.'));
        };

        reader.onerror = () => reject(new Error('Failed to read file.'));
    });
};

/**
 * Generate Unique ID
 * @returns {string}
 */
export const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Debounce Function
 * Prevents rapid firing of functions (e.g., search input)
 * @param {Function} func 
 * @param {number} delay 
 * @returns {Function}
 */
export const debounce = (func, delay = 300) => {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
};

/**
 * Simple Skeleton Loader Generator
 * @param {number} count - Number of skeletons to generate
 * @returns {string} - HTML string of skeletons
 */
export const generateSkeletons = (count = 4) => {
    let skeletons = '';
    for (let i = 0; i < count; i++) {
        skeletons += `
            <div class="product-card">
                <div class="skeleton skeleton-img"></div>
                <div class="product-info">
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text short"></div>
                    <div style="margin-top: 20px;">
                        <div class="skeleton skeleton-text" style="width: 30%; height: 24px;"></div>
                    </div>
                </div>
            </div>
        `;
    }
    return skeletons;
};