/**
 * =====================================================
 * Shree Panchmukhi Balaji Handloom - Product Services
 * =====================================================
 * File: /js/products.js
 * Description: Centralized data fetching layer for 
 * products. Handles all Firestore queries related to 
 * products to avoid code duplication across pages.
 * =====================================================
 */

// Firebase Imports
import { db } from './firebase.js';
import { 
    collection, 
    getDocs, 
    getDoc, 
    doc, 
    query, 
    where, 
    orderBy, 
    limit 
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Firestore Collection Reference
const productsRef = collection(db, 'products');

/**
 * Fetch a Single Product by ID
 * @param {string} productId - The document ID of the product
 * @returns {Promise<Object|null>} - Product data object or null if not found
 */
export const getProductById = async (productId) => {
    try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            console.warn(`Product with ID ${productId} not found.`);
            return null;
        }
    } catch (error) {
        console.error("Error fetching product by ID:", error);
        throw error;
    }
};

/**
 * Fetch Products by Category
 * @param {string} categoryName - The exact category name
 * @param {number} limitCount - Max number of products to fetch
 * @returns {Promise<Array>} - Array of product objects
 */
export const getProductsByCategory = async (categoryName, limitCount = 10) => {
    try {
        const q = query(
            productsRef, 
            where('category', '==', categoryName), 
            orderBy('createdAt', 'desc'), 
            limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error fetching products for category ${categoryName}:`, error);
        return [];
    }
};

/**
 * Fetch Products by Collection Tag
 * @param {string} collectionName - The exact collection name (e.g., "Summer 2024")
 * @param {number} limitCount - Max number of products to fetch
 * @returns {Promise<Array>} - Array of product objects
 */
export const getProductsByCollection = async (collectionName, limitCount = 8) => {
    try {
        const q = query(
            productsRef, 
            where('collection', '==', collectionName), 
            limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error fetching products for collection ${collectionName}:`, error);
        return [];
    }
};

/**
 * Fetch All Products (Used primarily in Admin Panel)
 * @returns {Promise<Array>} - Array of all product objects
 */
export const getAllProducts = async () => {
    try {
        // Note: Firestore requires an orderBy if there are more than 1000 documents 
        // and you are using inequality filters, but a simple getDocs is fine for standard stores.
        const snapshot = await getDocs(productsRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching all products:", error);
        throw error;
    }
};

/**
 * Fetch Related Products (Same Category, excluding current product)
 * @param {string} currentProductId - ID to exclude
 * @param {string} category - Category to match
 * @param {number} limitCount - Max items to return
 * @returns {Promise<Array>} - Array of related product objects
 */
export const getRelatedProducts = async (currentProductId, category, limitCount = 4) => {
    try {
        const q = query(
            productsRef, 
            where('category', '==', category), 
            limit(limitCount + 1) // Fetch +1 to ensure we have enough after filtering
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(product => product.id !== currentProductId)
            .slice(0, limitCount); // Strictly limit to requested count
    } catch (error) {
        console.error("Error fetching related products:", error);
        return [];
    }
};

/**
 * Search Products by Name Prefix (Client-Side Safe)
 * Note: For production with large datasets, consider Algolia or Elasticsearch.
 * This uses Firestore's standard string prefix query.
 * @param {string} searchText - Text to search for
 * @param {number} limitCount - Max results
 * @returns {Promise<Array>} - Array of matching product objects
 */
export const searchProducts = async (searchText, limitCount = 10) => {
    try {
        if (!searchText || searchText.length < 2) return [];
        
        const q = query(
            productsRef, 
            where('name', '>=', searchText), 
            where('name', '<=', searchText + '\uf8ff'), 
            limit(limitCount)
        );
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error searching products:", error);
        return [];
    }
};