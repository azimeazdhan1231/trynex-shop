
// TryneX Lifestyle - Enhanced Checkout with Database Integration
let supabase = null;
let cart = [];
let vouchers = [];
let appliedVoucher = null;

// Supabase Configuration
const SUPABASE_URL = 'https://wifsqonbnfmwtqvupqbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpZnNxb25ibmZtd3RxdnVwcWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODAyNjMsImV4cCI6MjA2NzE1NjI2M30.A7o3vhEaNZb9lmViHA_KQrwzKJTBWpsD6KbHqkkput0';

// Initialize Supabase with retry mechanism
async function initializeSupabase() {
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
        try {
            if (typeof window !== 'undefined' && window.supabase) {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase initialized for checkout');
                
                // Test connection
                const { data, error } = await supabase.from('vouchers').select('count').limit(1);
                if (error) throw error;
                
                await loadVouchers();
                console.log('✅ Checkout connected to database');
                return;
            } else {
                throw new Error('Supabase client not available');
            }
        } catch (error) {
            retryCount++;
            console.error(`❌ Checkout connection attempt ${retryCount} failed:`, error);
            
            if (retryCount >= maxRetries) {
                console.log('📱 Checkout using localStorage fallback mode');
                loadVouchersFromStorage();
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
    }
}

// Admin access function - 5 clicks in 2 seconds, no password
let adminClickCount = 0;
let adminClickTimer = null;

function handleAdminClick() {
    adminClickCount++;
    
    if (adminClickTimer) {
        clearTimeout(adminClickTimer);
    }
    
    adminClickTimer = setTimeout(() => {
        adminClickCount = 0;
    }, 2000);
    
    if (adminClickCount === 5) {
        showNotification('🔓 Opening admin panel...', 'success');
        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 500);
        adminClickCount = 0;
    } else if (adminClickCount === 3) {
        showNotification(`Click ${5 - adminClickCount} more times quickly`, 'info');
    }
}

// Legacy function for compatibility
function openAdminPanel() {
    handleAdminClick();
}

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
            loadVouchersFromStorage();
        }
    } catch (error) {
        console.error('Error loading vouchers:', error);
        loadVouchersFromStorage();
    }
}

function loadVouchersFromStorage() {
    vouchers = JSON.parse(localStorage.getItem('vouchers') || '[]');
}

// Load cart from localStorage
function loadCart() {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        showEmptyCartMessage();
        return;
    }
    displayCartItems();
    calculateTotals();
}

// Display cart items
function displayCartItems() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image || 'https://via.placeholder.com/80'}" alt="${item.name}" class="item-image">
            <div class="item-details">
                <h3 class="item-name">${item.name}</h3>
                <p class="item-price">₹${item.price}</p>
                <div class="quantity-controls">
                    <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})" class="qty-btn">-</button>
                    <span class="quantity">${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})" class="qty-btn">+</button>
                </div>
            </div>
            <div class="item-total">₹${item.price * item.quantity}</div>
            <button onclick="removeFromCart('${item.id}')" class="remove-btn">×</button>
        </div>
    `).join('');
}

// Update quantity
function updateQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        displayCartItems();
        calculateTotals();
    }
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    
    if (cart.length === 0) {
        showEmptyCartMessage();
        return;
    }
    
    displayCartItems();
    calculateTotals();
    showNotification('Item removed from cart', 'info');
}

// Show empty cart message
function showEmptyCartMessage() {
    const container = document.getElementById('cart-items');
    if (container) {
        container.innerHTML = `
            <div class="empty-cart">
                <h3>Your cart is empty</h3>
                <p>Add some products to your cart to proceed with checkout.</p>
                <a href="products.html" class="btn-primary">Browse Products</a>
            </div>
        `;
    }
    
    const orderSummary = document.getElementById('order-summary');
    if (orderSummary) {
        orderSummary.style.display = 'none';
    }
}

// Apply voucher
function applyVoucher() {
    const voucherCode = document.getElementById('voucher-code').value.trim().toUpperCase();
    if (!voucherCode) {
        showNotification('Please enter a voucher code', 'warning');
        return;
    }
    
    const voucher = vouchers.find(v => v.code === voucherCode && v.is_active);
    if (!voucher) {
        showNotification('Invalid voucher code', 'error');
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Check minimum order value
    if (voucher.min_order_value && subtotal < voucher.min_order_value) {
        showNotification(`Minimum order value ₹${voucher.min_order_value} required`, 'warning');
        return;
    }
    
    // Check usage limits
    if (voucher.max_uses && voucher.used_count >= voucher.max_uses) {
        showNotification('Voucher usage limit exceeded', 'error');
        return;
    }
    
    // Check expiry
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        showNotification('Voucher has expired', 'error');
        return;
    }
    
    appliedVoucher = voucher;
    calculateTotals();
    showNotification(`Voucher applied! ${voucher.discount_type === 'percentage' ? voucher.discount_value + '% off' : '₹' + voucher.discount_value + ' off'}`, 'success');
}

// Remove voucher
function removeVoucher() {
    appliedVoucher = null;
    document.getElementById('voucher-code').value = '';
    calculateTotals();
    showNotification('Voucher removed', 'info');
}

// Calculate totals
function calculateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    let discount = 0;
    
    if (appliedVoucher) {
        if (appliedVoucher.discount_type === 'percentage') {
            discount = (subtotal * appliedVoucher.discount_value) / 100;
        } else {
            discount = appliedVoucher.discount_value;
        }
        discount = Math.min(discount, subtotal); // Don't let discount exceed subtotal
    }
    
    const shipping = subtotal > 500 ? 0 : 50; // Free shipping over ₹500
    const total = subtotal - discount + shipping;
    
    // Update UI
    document.getElementById('subtotal').textContent = `₹${subtotal}`;
    document.getElementById('discount').textContent = `-₹${discount}`;
    document.getElementById('shipping').textContent = `₹${shipping}`;
    document.getElementById('total').textContent = `₹${total}`;
    
    // Show/hide discount row
    const discountRow = document.getElementById('discount-row');
    if (discountRow) {
        discountRow.style.display = discount > 0 ? 'flex' : 'none';
    }
    
    // Show/hide voucher applied info
    const voucherApplied = document.getElementById('voucher-applied');
    if (voucherApplied) {
        if (appliedVoucher) {
            voucherApplied.innerHTML = `
                <span>Voucher: ${appliedVoucher.code}</span>
                <button onclick="removeVoucher()" class="remove-voucher">×</button>
            `;
            voucherApplied.style.display = 'flex';
        } else {
            voucherApplied.style.display = 'none';
        }
    }
}

// Process order
async function processOrder(event) {
    event.preventDefault();
    
    if (cart.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const orderData = {
        customer_name: formData.get('customer_name'),
        customer_email: formData.get('customer_email'),
        customer_phone: formData.get('customer_phone'),
        shipping_address: formData.get('shipping_address'),
        city: formData.get('city'),
        pincode: formData.get('pincode'),
        items: cart,
        subtotal: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        discount: appliedVoucher ? (appliedVoucher.discount_type === 'percentage' ? 
            (cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * appliedVoucher.discount_value) / 100 : 
            appliedVoucher.discount_value) : 0,
        shipping_cost: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) > 500 ? 0 : 50,
        voucher_code: appliedVoucher ? appliedVoucher.code : null,
        status: 'pending',
        created_at: new Date().toISOString()
    };
    
    orderData.total_amount = orderData.subtotal - orderData.discount + orderData.shipping_cost;
    
    try {
        const submitBtn = document.getElementById('submit-order');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        
        let orderId;
        
        if (supabase) {
            // Save to database
            const { data, error } = await supabase
                .from('orders')
                .insert([orderData])
                .select()
                .single();
            
            if (error) throw error;
            orderId = data.id;
            
            // Update voucher usage if applied
            if (appliedVoucher) {
                await supabase
                    .from('vouchers')
                    .update({ used_count: (appliedVoucher.used_count || 0) + 1 })
                    .eq('id', appliedVoucher.id);
            }
        } else {
            // Fallback to localStorage
            orderId = Date.now().toString();
            orderData.id = orderId;
            
            const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
            existingOrders.unshift(orderData);
            localStorage.setItem('orders', JSON.stringify(existingOrders));
        }
        
        // Clear cart
        cart = [];
        localStorage.removeItem('cart');
        
        // Show success and redirect
        showNotification('Order placed successfully!', 'success');
        
        // Store order ID for tracking
        localStorage.setItem('lastOrderId', orderId);
        
        // Send WhatsApp message
        sendWhatsAppOrder(orderData, orderId);
        
        // Redirect to order confirmation
        setTimeout(() => {
            window.location.href = `track-order.html?order=${orderId}`;
        }, 2000);
        
    } catch (error) {
        console.error('Error processing order:', error);
        showNotification('Error processing order. Please try again.', 'error');
        
        const submitBtn = document.getElementById('submit-order');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Place Order';
    }
}

// Send WhatsApp order notification
function sendWhatsAppOrder(orderData, orderId) {
    const message = `
🛍️ *New Order from TryneX Lifestyle*

📦 *Order ID:* ${orderId}
👤 *Customer:* ${orderData.customer_name}
📧 *Email:* ${orderData.customer_email}
📱 *Phone:* ${orderData.customer_phone}

📍 *Shipping Address:*
${orderData.shipping_address}
${orderData.city} - ${orderData.pincode}

🛒 *Items:*
${orderData.items.map(item => `• ${item.name} (Qty: ${item.quantity}) - ₹${item.price * item.quantity}`).join('\n')}

💰 *Order Summary:*
Subtotal: ₹${orderData.subtotal}
${orderData.discount > 0 ? `Discount: -₹${orderData.discount}` : ''}
Shipping: ₹${orderData.shipping_cost}
*Total: ₹${orderData.total_amount}*

${orderData.voucher_code ? `🎟️ Voucher Used: ${orderData.voucher_code}` : ''}

Please process this order. Thank you!
    `.trim();
    
    const whatsappNumber = '918530684122'; // Your WhatsApp number
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    // Auto-open WhatsApp (optional)
    setTimeout(() => {
        window.open(whatsappUrl, '_blank');
    }, 1000);
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🛒 Checkout page initializing...');
    
    // Initialize Supabase
    initializeSupabase();
    
    // Load cart
    loadCart();
    
    // Bind form submission
    const checkoutForm = document.getElementById('checkout-form');
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', processOrder);
    }
    
    // Bind voucher application
    const voucherBtn = document.getElementById('apply-voucher');
    if (voucherBtn) {
        voucherBtn.addEventListener('click', applyVoucher);
    }
    
    console.log('✅ Checkout initialized successfully');
});

// Export functions for global access
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.applyVoucher = applyVoucher;
window.removeVoucher = removeVoucher;
window.processOrder = processOrder;
