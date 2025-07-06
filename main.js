// TryneX Lifestyle - Enhanced Main Website with Real-time Database Sync
let supabase = null;
let products = [];
let featuredProducts = [];
let cart = [];
let vouchers = [];

// Supabase Configuration
const SUPABASE_URL = 'https://wifsqonbnfmwtqvupqbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpZnNxb25ibmZtd3RxdnVwcWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODAyNjMsImV4cCI6MjA2NzE1NjI2M30.A7o3vhEaNZb9lmViHA_KQrwzKJTBWpsD6KbHqkkput0';

// Initialize Supabase with persistent connection attempts
async function initializeSupabase() {
    if (typeof window !== 'undefined' && window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase initialized - Attempting database connection...');

        // Keep trying until connected
        let connected = false;
        while (!connected) {
            try {
                const { data, error } = await supabase.from('products').select('id').limit(1);
                if (error) throw error;
                
                console.log('✅ Successfully connected to Supabase database');
                connected = true;
                
                await loadProducts();
                await loadVouchers();
                return;
            } catch (error) {
                console.error('❌ Database connection failed, retrying in 3 seconds...', error.message);
                showNotification('Connecting to database...', 'info');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    } else {
        console.error('❌ Supabase client library not loaded');
        showNotification('Database connection unavailable', 'error');
    }
}

// Load products with robust fallback system
async function loadProducts() {
    try {
        console.log('📡 Loading products...');
        let loadedProducts = [];

        // Try Supabase first
        if (supabase) {
            try {
                const { data, error } = await supabase
                    .from('products')
                    .select(`
                        *,
                        categories (
                            name,
                            slug
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (!error && data && data.length > 0) {
                    // Transform data to match expected format
                    loadedProducts = data.map(product => ({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        description: product.description,
                        image_url: product.image_url,
                        image: product.image_url,
                        category: product.categories ? product.categories.name : 'General',
                        badge: product.badge,
                        featured: product.feature,
                        is_featured: product.feature,
                        stock_quantity: product.stock_quantity,
                        is_active: true,
                        created_at: product.created_at,
                        discount: 0
                    }));
                    console.log(`✅ Loaded ${loadedProducts.length} products from Supabase`);
                }
            } catch (supabaseError) {
                console.log('Supabase failed, trying cache...', supabaseError.message);
            }
        }

        // Try localStorage cache
        if (loadedProducts.length === 0) {
            const cachedProducts = localStorage.getItem('products') || 
                                 localStorage.getItem('admin-products') || 
                                 localStorage.getItem('website-products');
            if (cachedProducts) {
                try {
                    loadedProducts = JSON.parse(cachedProducts);
                    console.log(`✅ Loaded ${loadedProducts.length} products from cache`);
                } catch (parseError) {
                    console.log('Cache parse failed');
                }
            }
        }

        // Use sample products as final fallback
        if (loadedProducts.length === 0) {
            loadedProducts = getSampleProducts();
            console.log(`✅ Using ${loadedProducts.length} sample products`);
        }

        products = loadedProducts;
        
        // Try to load featured products from featured_products table
        if (supabase && products.length > 0) {
            try {
                const { data: featuredData, error: featuredError } = await supabase
                    .from('featured_products')
                    .select(`
                        products (
                            id,
                            name,
                            price,
                            description,
                            image_url,
                            badge,
                            feature,
                            stock_quantity,
                            created_at,
                            categories (
                                name,
                                slug
                            )
                        )
                    `)
                    .order('display_order', { ascending: true });

                if (!featuredError && featuredData && featuredData.length > 0) {
                    featuredProducts = featuredData.map(item => ({
                        id: item.products.id,
                        name: item.products.name,
                        price: item.products.price,
                        description: item.products.description,
                        image_url: item.products.image_url,
                        image: item.products.image_url,
                        category: item.products.categories ? item.products.categories.name : 'General',
                        badge: item.products.badge,
                        featured: item.products.feature,
                        is_featured: item.products.feature,
                        stock_quantity: item.products.stock_quantity,
                        is_active: true,
                        created_at: item.products.created_at,
                        discount: 0
                    }));
                } else {
                    // Fallback to featured products from main products list
                    featuredProducts = products.filter(p => p.is_featured || p.featured).slice(0, 8);
                }
            } catch (featuredError) {
                console.log('Featured products query failed, using fallback');
                featuredProducts = products.filter(p => p.is_featured || p.featured).slice(0, 8);
            }
        } else {
            featuredProducts = products.filter(p => p.is_featured || p.featured).slice(0, 8);
        }
        
        // If no featured products, use first 8 products
        if (featuredProducts.length === 0) {
            featuredProducts = products.slice(0, 8);
        }

        // Cache for performance
        localStorage.setItem('products', JSON.stringify(products));
        localStorage.setItem('featuredProducts', JSON.stringify(featuredProducts));

        displayFeaturedProducts();
        console.log(`✅ Displaying ${featuredProducts.length} featured products`);

    } catch (error) {
        console.error('❌ Error loading products:', error);
        // Emergency fallback
        products = getSampleProducts();
        featuredProducts = products.slice(0, 8);
        localStorage.setItem('products', JSON.stringify(products));
        localStorage.setItem('featuredProducts', JSON.stringify(featuredProducts));
        displayFeaturedProducts();
    }
}

// Removed sample data fallback - database connection required

// Load vouchers
async function loadVouchers() {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('vouchers')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;
            vouchers = data || [];
            localStorage.setItem('vouchers', JSON.stringify(vouchers));
        } else {
            vouchers = JSON.parse(localStorage.getItem('vouchers') || '[]');
        }
    } catch (error) {
        console.error('Error loading vouchers:', error);
        vouchers = JSON.parse(localStorage.getItem('vouchers') || '[]');
    }
}

// Display featured products
function displayFeaturedProducts() {
    const container = document.getElementById('productsGrid') || document.getElementById('featured-products');
    if (!container) {
        console.error('No products container found');
        return;
    }

    // If no featured products, show all products (first 8)
    let productsToShow = featuredProducts.length > 0 ? featuredProducts : products.slice(0, 8);
    
    if (productsToShow.length === 0) {
        // Load sample products if no products exist
        products = getSampleProducts();
        productsToShow = products.slice(0, 8);
        localStorage.setItem('products', JSON.stringify(products));
        localStorage.setItem('featuredProducts', JSON.stringify(productsToShow));
    }

    container.innerHTML = productsToShow.map(product => `
        <div class="product-card" onclick="viewProduct('${product.id}')">
            <div class="product-image">
                <img src="${product.image_url || product.image || 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300'}" alt="${product.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300'">
                <div class="product-overlay">
                    <button class="btn-quick-add" onclick="event.stopPropagation(); addToCart('${product.id}', {name: '${product.name}', price: ${product.price}, image: '${product.image_url || product.image}'})">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">৳${product.price}</p>
                <p class="product-category">${product.category || 'General'}</p>
                ${product.discount ? `<div class="product-discount">-${product.discount}%</div>` : ''}
            </div>
        </div>
    `).join('');
}

// Cart Management
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }

    updateCartUI();
    showNotification(`${product.name} added to cart!`, 'success');
    saveCartToStorage();
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartToStorage();
}

function updateQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (item && newQuantity > 0) {
        item.quantity = newQuantity;
    } else if (item && newQuantity <= 0) {
        removeFromCart(productId);
    }
    updateCartUI();
    saveCartToStorage();
}

function updateCartUI() {
    const cartIcon = document.querySelector('.cart-icon');
    const cartCount = document.querySelector('.cart-count');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (cartCount) {
        cartCount.textContent = totalItems;
        cartCount.style.display = totalItems > 0 ? 'block' : 'none';
    }

    // Update cart dropdown if exists
    updateCartDropdown();
}

function updateCartDropdown() {
    const cartDropdown = document.getElementById('cart-dropdown');
    if (!cartDropdown) return;

    if (cart.length === 0) {
        cartDropdown.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        return;
    }

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    cartDropdown.innerHTML = `
        <div class="cart-items">
            ${cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}" class="cart-item-image">
                    <div class="cart-item-details">
                        <h4>${item.name}</h4>
                        <p>₹${item.price} x ${item.quantity}</p>
                        <div class="quantity-controls">
                            <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                        </div>
                    </div>
                    <button onclick="removeFromCart('${item.id}')" class="remove-item">×</button>
                </div>
            `).join('')}
        </div>
        <div class="cart-total">
            <strong>Total: ₹${totalAmount}</strong>
        </div>
        <div class="cart-actions">
            <button onclick="goToCheckout()" class="btn-checkout">Checkout</button>
            <button onclick="clearCart()" class="btn-clear">Clear Cart</button>
        </div>
    `;
}

function clearCart() {
    cart = [];
    updateCartUI();
    saveCartToStorage();
    showNotification('Cart cleared!', 'info');
}

function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    updateCartUI();
}

// Navigation
function viewProduct(productId) {
    localStorage.setItem('selectedProduct', productId);
    window.location.href = 'products.html';
}

function goToCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'warning');
        return;
    }
    window.location.href = 'checkout.html';
}

// Admin Panel Access - 5 clicks in 2 seconds, no password
let clickCount = 0;
let clickTimer = null;

function handleAdminAccess() {
    clickCount++;

    if (clickTimer) {
        clearTimeout(clickTimer);
    }

    clickTimer = setTimeout(() => {
        clickCount = 0;
    }, 2000);

    if (clickCount === 5) {
        showNotification('🔓 Opening admin panel...', 'success');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 500);
        clickCount = 0;
    } else if (clickCount === 3) {
        showNotification(`Click ${5 - clickCount} more times quickly`, 'info');
    }
}

// Global admin click handler
function handleAdminClick() {
    handleAdminAccess();
}

// Legacy function for compatibility
function openAdminPanel() {
    handleAdminAccess();
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function getSampleProducts() {
    return [
        {
            id: '1',
            name: 'Premium Gift Box',
            price: 999,
            description: 'Luxury gift box with assorted items',
            image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=300',
            category: 'gift-boxes',
            is_featured: true,
            created_at: new Date().toISOString()
        },
        {
            id: '2',
            name: 'Elegant Flower Bouquet',
            price: 799,
            description: 'Beautiful fresh flowers arranged perfectly',
            image: 'https://images.unsplash.com/photo-1563181719-04f4c45d7dd5?w=300',
            category: 'flowers',
            is_featured: true,
            created_at: new Date().toISOString()
        },
        {
            id: '3',
            name: 'Artisan Chocolate Collection',
            price: 1299,
            description: 'Handcrafted chocolates with premium ingredients',
            image: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=300',
            category: 'chocolates',
            is_featured: true,
            created_at: new Date().toISOString()
        },
        {
            id: '4',
            name: 'Personalized Photo Frame',
            price: 599,
            description: 'Custom photo frame with your memories',
            image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=300',
            category: 'personalized',
            is_featured: true,
            created_at: new Date().toISOString()
        }
    ];
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 TryneX Lifestyle initializing...');
    console.log('🔗 Connecting to Supabase database...');

    // Initialize Supabase and load data - NO sample data
    initializeSupabase();

    // Load cart from storage
    loadCartFromStorage();

    // Bind admin access to gear icon
    const gearIcon = document.querySelector('.admin-gear');
    if (gearIcon) {
        gearIcon.addEventListener('click', handleAdminAccess);
    }

    // Auto-refresh products every 5 minutes
    setInterval(() => {
        if (supabase) {
            loadProducts();
        }
    }, 300000);

    console.log('✅ Website initialized successfully');
});

// Export functions for global access
window.addToCart = addToCart;
window.removeFromCart = removeFromCart;
window.updateQuantity = updateQuantity;
window.viewProduct = viewProduct;
window.goToCheckout = goToCheckout;
window.clearCart = clearCart;
window.handleAdminAccess = handleAdminAccess;
window.toggleCart = () => {};
window.closeCartModal = () => {};
window.applyVoucher = () => {};
window.proceedToOrder = () => {};
window.toggleMobileMenu = () => {};
window.toggleSearch = () => {};
window.closePromoBanner = () => {};
window.openAdminPanel = () => {};