// TryneX Lifestyle - Enhanced Admin Panel with Real-time Database Sync
let supabase = null;
let allProducts = [];
let allOrders = [];
let allVouchers = [];
let allPromotions = [];
let currentEditingProduct = null;
let isConnected = false;
let imageUploadSupported = false;

// Supabase Configuration
const SUPABASE_URL = 'https://wifsqonbnfmwtqvupqbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpZnNxb25ibmZtd3RxdnVwcWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODAyNjMsImV4cCI6MjA2NzE1NjI2M30.A7o3vhEaNZb9lmViHA_KQrwzKJTBWpsD6KbHqkkput0';

// Initialize Supabase with robust connection handling
async function initializeSupabase() {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
        try {
            if (typeof window !== 'undefined' && window.supabase) {
                supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                console.log('✅ Supabase initialized');

                await testSupabaseConnection();

                // Setup auto-reconnection
                setupAutoReconnection();
                return;
            } else {
                throw new Error('Supabase client not available');
            }
        } catch (error) {
            retryCount++;
            console.error(`❌ Admin connection attempt ${retryCount} failed:`, error);

            if (retryCount >= maxRetries) {
                console.log('📱 Admin using localStorage fallback mode');
                initializeFallbackMode();
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
        }
    }
}

// Setup auto-reconnection
function setupAutoReconnection() {
    // Check connection every 30 seconds
    setInterval(async () => {
        if (!isConnected && supabase) {
            console.log('🔄 Attempting to reconnect...');
            try {
                await testSupabaseConnection();
            } catch (error) {
                console.log('Reconnection failed, will retry...');
            }
        }
    }, 30000);
}

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('products').select('count').limit(1);
        if (error) throw error;

        // Test storage bucket access for image uploads
        try {
            const { data: buckets } = await supabase.storage.listBuckets();
            imageUploadSupported = buckets && buckets.some(bucket => bucket.name === 'product-images');
            console.log('📁 Image upload support:', imageUploadSupported ? 'Enabled' : 'Disabled');
        } catch (storageError) {
            console.log('📁 Storage not configured, using URL inputs only');
            imageUploadSupported = false;
        }

        isConnected = true;
        showConnectionStatus('connected');
        console.log('✅ Database connection successful');

        // Load initial data
        await loadAllData();

    } catch (error) {
        console.error('❌ Database connection failed:', error);
        initializeFallbackMode();
    }
}

// Fallback to localStorage
function initializeFallbackMode() {
    isConnected = false;
    showConnectionStatus('disconnected');
    loadDataFromLocalStorage();
    console.log('📱 Using localStorage fallback mode');
}

// Show connection status
function showConnectionStatus(status) {
    const statusDiv = document.getElementById('connectionStatus') || createConnectionStatusDiv();

    switch (status) {
        case 'connected':
            statusDiv.innerHTML = `
                <i class="fas fa-check-circle" style="color: #28a745;"></i>
                <span>Live Database Connected</span>
                <small>Changes sync globally in real-time</small>
            `;
            statusDiv.className = 'connection-status connected';
            break;
        case 'disconnected':
            statusDiv.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="color: #ffc107;"></i>
                <span>Offline Mode</span>
                <small>Using local storage only</small>
            `;
            statusDiv.className = 'connection-status disconnected';
            break;
        case 'error':
            statusDiv.innerHTML = `
                <i class="fas fa-times-circle" style="color: #dc3545;"></i>
                <span>Connection Error</span>
                <small>Check internet connection</small>
            `;
            statusDiv.className = 'connection-status error';
            break;
    }
}

function createConnectionStatusDiv() {
    const div = document.createElement('div');
    div.id = 'connectionStatus';
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 1rem;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 1000;
        min-width: 200px;
        font-size: 0.9rem;
    `;

    const style = document.createElement('style');
    style.textContent = `
        .connection-status {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .connection-status i {
            font-size: 1.2rem;
        }
        .connection-status span {
            font-weight: 600;
        }
        .connection-status small {
            color: #666;
            font-size: 0.8rem;
        }
        .connection-status.connected {
            border-left: 4px solid #28a745;
        }
        .connection-status.disconnected {
            border-left: 4px solid #ffc107;
        }
        .connection-status.error {
            border-left: 4px solid #dc3545;
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(div);
    return div;
}

// Load all data
async function loadAllData() {
    try {
        await Promise.all([
            loadProducts(),
            loadOrders(),
            loadVouchers(),
            loadPromotions()
        ]);
        updateDashboard();

    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data', 'error');
    }
}

// Load products from multiple sources with retry logic
async function loadProducts() {
    try {
        let products = [];

        // Try database first
        if (isConnected && supabase) {
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

                if (!error && data) {
                    // Transform data to match expected format
                    products = data.map(product => ({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        description: product.description,
                        image_url: product.image_url,
                        category: product.categories ? product.categories.name : 'General',
                        badge: product.badge,
                        featured: product.feature,
                        is_featured: product.feature,
                        stock_quantity: product.stock_quantity,
                        is_active: true,
                        created_at: product.created_at
                    }));
                    console.log(`✅ Loaded ${products.length} products from database`);
                }
            } catch (dbError) {
                console.log('Database connection failed, using fallbacks');
            }
        }

        // Try localStorage if database failed
        if (products.length === 0) {
            const cachedProducts = localStorage.getItem('admin-products') || 
                                 localStorage.getItem('products') ||
                                 localStorage.getItem('website-products');
            if (cachedProducts) {
                try {
                    products = JSON.parse(cachedProducts);
                    console.log(`✅ Loaded ${products.length} products from cache`);
                } catch (parseError) {
                    console.log('Cache parse failed');
                }
            }
        }

        // Use sample products if nothing else works
        if (products.length === 0) {
            products = getSample48Products();
            console.log(`✅ Using ${products.length} sample products`);
        }

        allProducts = products;

        // Save to all storage locations for synchronization
        localStorage.setItem('admin-products', JSON.stringify(allProducts));
        localStorage.setItem('website-products', JSON.stringify(allProducts));
        localStorage.setItem('products', JSON.stringify(allProducts));
        localStorage.setItem('frontend-products', JSON.stringify(allProducts));

        displayProducts();
        console.log(`✅ Admin loaded ${allProducts.length} products total`);

    } catch (error) {
        console.error('Error loading products:', error);
        // Emergency fallback
        allProducts = getSample48Products();
        localStorage.setItem('admin-products', JSON.stringify(allProducts));
        localStorage.setItem('website-products', JSON.stringify(allProducts));
        localStorage.setItem('products', JSON.stringify(allProducts));
        displayProducts();
    }
}

async function saveProduct(productData) {
    try {
        if (isConnected && supabase) {
            // First, get or create category
            let categoryId = 1; // Default category ID
            if (productData.category) {
                const { data: categoryData, error: categoryError } = await supabase
                    .from('categories')
                    .select('id')
                    .eq('name', productData.category)
                    .single();

                if (categoryError) {
                    // Create new category if it doesn't exist
                    const { data: newCategory, error: createError } = await supabase
                        .from('categories')
                        .insert([{
                            name: productData.category,
                            slug: productData.category.toLowerCase().replace(/\s+/g, '-'),
                            description: `Category for ${productData.category}`,
                            is_active: true
                        }])
                        .select()
                        .single();

                    if (!createError) {
                        categoryId = newCategory.id;
                    }
                } else {
                    categoryId = categoryData.id;
                }
            }

            // Prepare product data for database
            const dbProductData = {
                name: productData.name,
                description: productData.description || '',
                price: parseFloat(productData.price) || 0,
                category_id: categoryId,
                image_url: productData.image_url || '',
                badge: productData.badge || '',
                feature: productData.is_featured || productData.featured || false,
                stock_quantity: productData.stock_quantity || 0
            };

            if (productData.id) {
                // Update existing product
                const { data, error } = await supabase
                    .from('products')
                    .update(dbProductData)
                    .eq('id', productData.id)
                    .select(`
                        *,
                        categories (
                            name,
                            slug
                        )
                    `)
                    .single();

                if (error) throw error;

                // Transform back to expected format
                const transformedProduct = {
                    id: data.id,
                    name: data.name,
                    price: data.price,
                    description: data.description,
                    image_url: data.image_url,
                    category: data.categories ? data.categories.name : 'General',
                    badge: data.badge,
                    featured: data.feature,
                    is_featured: data.feature,
                    stock_quantity: data.stock_quantity,
                    is_active: true,
                    created_at: data.created_at
                };

                // Update local array
                const index = allProducts.findIndex(p => p.id === productData.id);
                if (index !== -1) {
                    allProducts[index] = transformedProduct;
                }
            } else {
                // Create new product
                const { data, error } = await supabase
                    .from('products')
                    .insert([dbProductData])
                    .select(`
                        *,
                        categories (
                            name,
                            slug
                        )
                    `)
                    .single();

                if (error) throw error;

                // Transform back to expected format
                const transformedProduct = {
                    id: data.id,
                    name: data.name,
                    price: data.price,
                    description: data.description,
                    image_url: data.image_url,
                    category: data.categories ? data.categories.name : 'General',
                    badge: data.badge,
                    featured: data.feature,
                    is_featured: data.feature,
                    stock_quantity: data.stock_quantity,
                    is_active: true,
                    created_at: data.created_at
                };

                allProducts.unshift(transformedProduct);
            }
        } else {
            // Fallback to localStorage
            if (productData.id) {
                const index = allProducts.findIndex(p => p.id === productData.id);
                if (index !== -1) {
                    allProducts[index] = productData;
                }
            } else {
                productData.id = Date.now().toString();
                productData.created_at = new Date().toISOString();
                allProducts.unshift(productData);
            }
        }

        // Update localStorage as backup
        localStorage.setItem('products', JSON.stringify(allProducts));
        localStorage.setItem('admin-products', JSON.stringify(allProducts));
        localStorage.setItem('website-products', JSON.stringify(allProducts));
        localStorage.setItem('frontend-products', JSON.stringify(allProducts));
        displayProducts();
        showNotification('Product saved successfully!', 'success');

    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Error saving product: ' + error.message, 'error');
    }
}

async function deleteProduct(productId) {
    try {
        if (isConnected && supabase) {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
        }

        allProducts = allProducts.filter(p => p.id !== productId);
        localStorage.setItem('products', JSON.stringify(allProducts));
        localStorage.setItem('admin-products', JSON.stringify(allProducts));
        localStorage.setItem('website-products', JSON.stringify(allProducts));
        localStorage.setItem('frontend-products', JSON.stringify(allProducts));
        displayProducts();
        showNotification('Product deleted successfully!', 'success');

    } catch (error) {
        console.error('Error deleting product:', error);
        showNotification('Error deleting product: ' + error.message, 'error');
    }
}

// Orders Management
async function loadOrders() {
    try {
        if (isConnected && supabase) {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            allOrders = data || [];
        } else {
            allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        }
        displayOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
        displayOrders();
    }
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        if (isConnected && supabase) {
            const { data, error } = await supabase
                .from('orders')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', orderId)
                .select()
                .single();

            if (error) throw error;

            const index = allOrders.findIndex(o => o.id === orderId);
            if (index !== -1) {
                allOrders[index] = data;
            }
        } else {
            const order = allOrders.find(o => o.id === orderId);
            if (order) {
                order.status = newStatus;
                order.updated_at = new Date().toISOString();
            }
        }

        localStorage.setItem('orders', JSON.stringify(allOrders));
        localStorage.setItem('admin-orders', JSON.stringify(allOrders));
        localStorage.setItem('website-orders', JSON.stringify(allOrders));
        displayOrders();
        showNotification('Order status updated!', 'success');

    } catch (error) {
        console.error('Error updating order:', error);
        showNotification('Error updating order: ' + error.message, 'error');
    }
}

// Vouchers Management
async function loadVouchers() {
    try {
        if (isConnected && supabase) {
            const { data, error } = await supabase
                .from('vouchers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            allVouchers = data || [];
        } else {
            allVouchers = JSON.parse(localStorage.getItem('vouchers') || '[]');
        }
        displayVouchers();
    } catch (error) {
        console.error('Error loading vouchers:', error);
        allVouchers = JSON.parse(localStorage.getItem('vouchers') || '[]');
        displayVouchers();
    }
}

async function saveVoucher(voucherData) {
    try {
        if (isConnected && supabase) {
            if (voucherData.id) {
                const { data, error } = await supabase
                    .from('vouchers')
                    .update(voucherData)
                    .eq('id', voucherData.id)
                    .select()
                    .single();

                if (error) throw error;

                const index = allVouchers.findIndex(v => v.id === voucherData.id);
                if (index !== -1) {
                    allVouchers[index] = data;
                }
            } else {
                const { data, error } = await supabase
                    .from('vouchers')
                    .insert([{ ...voucherData, created_at: new Date().toISOString() }])
                    .select()
                    .single();

                if (error) throw error;
                allVouchers.unshift(data);
            }
        } else {
            if (voucherData.id) {
                const index = allVouchers.findIndex(v => v.id === voucherData.id);
                if (index !== -1) {
                    allVouchers[index] = voucherData;
                }
            } else {
                voucherData.id = Date.now().toString();
                voucherData.created_at = new Date().toISOString();
                allVouchers.unshift(voucherData);
            }
        }

        localStorage.setItem('vouchers', JSON.stringify(allVouchers));
        localStorage.setItem('admin-vouchers', JSON.stringify(allVouchers));
        localStorage.setItem('website-vouchers', JSON.stringify(allVouchers));
        displayVouchers();
        showNotification('Voucher saved successfully!', 'success');

    } catch (error) {
        console.error('Error saving voucher:', error);
        showNotification('Error saving voucher: ' + error.message, 'error');
    }
}

// Enhanced promotion loading
async function loadPromotions() {
    try {
        if (isConnected && supabase) {
            const { data, error } = await supabase
                .from('promotions')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            allPromotions = data || [];

            localStorage.setItem('admin-promotions', JSON.stringify(allPromotions));
            localStorage.setItem('website-promotions', JSON.stringify(allPromotions));

        } else {
            allPromotions = JSON.parse(localStorage.getItem('admin-promotions')) || getSamplePromotions();
        }

        console.log(`✅ Loaded ${allPromotions.length} promotions with real-time sync`);

    } catch (error) {
        console.error('❌ Error loading promotions:', error);
        allPromotions = getSamplePromotions();
    }
}

// Display Functions
function displayProducts() {
    const container = document.getElementById('products-list');
    if (!container) return;

    if (allProducts.length === 0) {
        container.innerHTML = '<p class="no-data">No products found. Add your first product!</p>';
        return;
    }

    container.innerHTML = allProducts.map(product => `
        <div class="admin-card">
            <div class="product-header">
                <h3>${product.name || 'Unnamed Product'}</h3>
                <div class="product-actions">
                    <button onclick="editProduct('${product.id}')" class="btn-edit">✏️ Edit</button>
                    <button onclick="deleteProduct('${product.id}')" class="btn-delete">🗑️ Delete</button>
                </div>
            </div>
            <div class="product-details">
                <img src="${product.image_url || product.image || 'https://via.placeholder.com/150'}" alt="${product.name}" class="product-thumb">
                <div class="product-info">
                    <p><strong>Price:</strong> ₹${product.price || 0}</p>
                    <p><strong>Category:</strong> ${product.category || 'Uncategorized'}</p>
                    <p><strong>Description:</strong> ${(product.description || '').substring(0, 100)}...</p>
                    <p><strong>Created:</strong> ${new Date(product.created_at).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function displayOrders() {
    const container = document.getElementById('orders-list');
    if (!container) return;

    if (allOrders.length === 0) {
        container.innerHTML = '<p class="no-data">No orders found.</p>';
        return;
    }

    container.innerHTML = allOrders.map(order => `
        <div class="admin-card">
            <div class="order-header">
                <h3>Order #${order.id}</h3>
                <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                </select>
            </div>
            <div class="order-details">
                <p><strong>Customer:</strong> ${order.customer_name || 'N/A'}</p>
                <p><strong>Phone:</strong> ${order.customer_phone || 'N/A'}</p>
                <p><strong>Total:</strong> ₹${order.total_amount || 0}</p>
                <p><strong>Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    `).join('');
}

function displayVouchers() {
    const container = document.getElementById('vouchers-list');
    if (!container) return;

    if (allVouchers.length === 0) {
        container.innerHTML = '<p class="no-data">No vouchers found. Create your first voucher!</p>';
        return;
    }

    container.innerHTML = allVouchers.map(voucher => `
        <div class="admin-card">
            <div class="voucher-header">
                <h3>${voucher.code}</h3>
                <span class="voucher-status ${voucher.is_active ? 'active' : 'inactive'}">
                    ${voucher.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
            <div class="voucher-details">
                <p><strong>Discount:</strong> ${voucher.discount_type === 'percentage' ? voucher.discount_value + '%' : '₹' + voucher.discount_value}</p>
                <p><strong>Min Order:</strong> ₹${voucher.min_order_value || 0}</p>
                <p><strong>Uses:</strong> ${voucher.used_count || 0}/${voucher.max_uses || '∞'}</p>
                <p><strong>Expires:</strong> ${voucher.expires_at ? new Date(voucher.expires_at).toLocaleDateString() : 'Never'}</p>
            </div>
        </div>
    `).join('');
}

function displayPromotions() {
    const promotionsGrid = document.getElementById('promotionsGrid');
    if (!promotionsGrid) return;

    if (allPromotions.length === 0) {
        promotionsGrid.innerHTML = '<div class="empty-state"><p>No promotions found.</p></div>';
        return;
    }

    promotionsGrid.innerHTML = allPromotions.map(promotion => `
        <div class="promotion-card">
            <div class="promotion-header">
                <h4>${promotion.title}</h4>
                <span class="promotion-type">${promotion.discount_type}</span>
            </div>
            <div class="promotion-details">
                <p><strong>Value:</strong> ${promotion.discount_value}${promotion.discount_type === 'percentage' ? '%' : '৳'}</p>
                <p><strong>Description:</strong> ${promotion.description}</p>
                <p><strong>Popup:</strong> ${promotion.show_popup ? 'Yes' : 'No'}</p>
                <p><strong>Period:</strong> ${promotion.start_date || 'No start'} to ${promotion.end_date || 'No end'}</p>
            </div>
            <div class="promotion-actions">
                <button class="btn-danger" onclick="deletePromotion(${promotion.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
                <button class="btn-edit" onclick="editPromotion(${promotion.id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
            </div>
        </div>
    `).join('');
}

// Form Handlers
function handleProductForm(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const productData = {
        name: formData.get('name'),
        price: parseFloat(formData.get('price')) || 0,
        description: formData.get('description'),
        image_url: formData.get('image_url') || 'https://via.placeholder.com/300',
        category: formData.get('category') || 'general',
        is_featured: formData.get('is_featured') === 'on',
        feature: formData.get('productFeature') || '',
        badge: formData.get('productBadge') || '',
        stock_quantity: parseInt(formData.get('productStock')) || 100,
        is_active: true,
    };

    if (currentEditingProduct) {
        productData.id = currentEditingProduct;
        currentEditingProduct = null;
    }

    saveProduct(productData);
    event.target.reset();
}

function handleVoucherForm(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const voucherData = {
        code: formData.get('code').toUpperCase(),
        discount_type: formData.get('discount_type'),
        discount_value: parseFloat(formData.get('discount_value')) || 0,
        min_order_value: parseFloat(formData.get('min_order_value')) || 0,
        max_uses: parseInt(formData.get('max_uses')) || null,
        expires_at: formData.get('expires_at') || null,
        is_active: true,
        used_count: 0
    };

    saveVoucher(voucherData);
    event.target.reset();
}

// Enhanced add product with instant global sync
async function handleAddProduct(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const productData = {
        name: formData.get('productName'),
        price: parseFloat(formData.get('productPrice')),
        category: formData.get('productCategory'),
        description: formData.get('productDescription'),
        image_url: formData.get('productImage'),
        feature: formData.get('productFeature') || '',
        badge: formData.get('productBadge') || '',
        stock_quantity: parseInt(formData.get('productStock')) || 100,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        if (isConnected && supabase) {
            const { data, error } = await supabase
                .from('products')
                .insert([productData])
                .select()
                .single();

            if (error) throw error;

            // Add to local array
            allProducts.unshift(data);

            showToast('✅ Product added and synced globally!', 'success');

        } else {
            productData.id = Date.now();
            allProducts.unshift(productData);

            // Save to multiple storage locations for fallback sync
            localStorage.setItem('admin-products', JSON.stringify(allProducts));
            localStorage.setItem('website-products', JSON.stringify(allProducts));
            localStorage.setItem('frontend-products', JSON.stringify(allProducts));

            // Broadcast to website
            // broadcastToWebsite('products_updated', { eventType: 'INSERT', new: productData });

            showToast('✅ Product added successfully!', 'success');
        }

        event.target.reset();
        displayProducts();
        updateDashboard();

        // Force website refresh by updating cache buster
        localStorage.setItem('cache_buster', Date.now().toString());

    } catch (error) {
        console.error('❌ Error adding product:', error);
        showToast('❌ Error adding product: ' + error.message, 'error');
    }
}

async function handleAddVoucher(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const voucherData = {
        code: formData.get('voucherCode').toUpperCase(),
        discount_type: formData.get('voucherType'),
        discount_value: parseFloat(formData.get('voucherValue')),
        description: formData.get('voucherDescription') || '',
        expiry_date: formData.get('voucherExpiry') || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        if (isConnected && supabase) {
            const { data, error } = await supabase
                .from('vouchers')
                .insert([voucherData])
                .select()
                .single();

            if (error) throw error;
            allVouchers.unshift(data);

        } else {
            voucherData.id = Date.now();
            allVouchers.unshift(voucherData);
            localStorage.setItem('admin-vouchers', JSON.stringify(allVouchers));
            localStorage.setItem('website-vouchers', JSON.stringify(allVouchers));
            // broadcastToWebsite('vouchers_updated', { eventType: 'INSERT', new: voucherData });
        }

        showToast('✅ Voucher added and synced globally!', 'success');
        event.target.reset();
        displayVouchers();

        localStorage.setItem('cache_buster', Date.now().toString());

    } catch (error) {
        console.error('❌ Error adding voucher:', error);
        showToast('❌ Error adding voucher: ' + error.message, 'error');
    }
}

async function handleAddPromotion(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const promotionData = {
        title: formData.get('promotionTitle'),
        discount_type: formData.get('promotionType'),
        discount_value: parseFloat(formData.get('promotionValue')),
        description: formData.get('promotionDescription'),
        show_popup: formData.get('promotionPopup') === 'on',
        start_date: formData.get('promotionStart') || null,
        end_date: formData.get('promotionEnd') || null,
        popup_title: formData.get('popupTitle') || '',
        popup_message: formData.get('popupMessage') || '',
        button_text: formData.get('buttonText') || 'Shop Now',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    try {
        if (isConnected && supabase) {
            const { data, error } = await supabase
                .from('promotions')
                .insert([promotionData])
                .select()
                .single();

            if (error) throw error;
            allPromotions.unshift(data);

        } else {
            promotionData.id = Date.now();
            allPromotions.unshift(promotionData);
            localStorage.setItem('admin-promotions', JSON.stringify(allPromotions));
            localStorage.setItem('website-promotions', JSON.stringify(allPromotions));
            // broadcastToWebsite('promotions_updated', { eventType: 'INSERT', new: promotionData });
        }

        showToast('✅ Promotion added and synced globally!', 'success');
        event.target.reset();
        displayPromotions();

        localStorage.setItem('cache_buster', Date.now().toString());

    } catch (error) {
        console.error('❌ Error adding promotion:', error);
        showToast('❌ Error adding promotion: ' + error.message, 'error');
    }
}

// Enhanced update order status with real-time sync
async function updateOrderStatus(orderId, newStatus) {
    try {
        const orderIndex = allOrders.findIndex(order => order.id == orderId);
        if (orderIndex === -1) {
            showToast('❌ Order not found', 'error');
            return;
        }

        const updateData = {
            status: newStatus,
            updated_at: new Date().toISOString()
        };

        if (isConnected && supabase) {
            const { error } = await supabase
                .from('orders')
                .update(updateData)
                .eq('id', orderId);

            if (error) throw error;
        }

        // Update local data
        allOrders[orderIndex] = { ...allOrders[orderIndex], ...updateData };

        // Sync to localStorage for website access
        localStorage.setItem('admin-orders', JSON.stringify(allOrders));
        localStorage.setItem('website-orders', JSON.stringify(allOrders));

        // Broadcast to website
        // broadcastToWebsite('orders_updated', { 
        //     eventType: 'UPDATE', 
        //     new: allOrders[orderIndex] 
        // });

        showToast(`✅ Order status updated to ${newStatus} - Synced globally!`, 'success');
        displayOrders();

        // Force cache refresh
        localStorage.setItem('cache_buster', Date.now().toString());

    } catch (error) {
        console.error('❌ Error updating order status:', error);
        showToast('❌ Error updating order status: ' + error.message, 'error');
    }
}

// Payment management functions (keeping existing functionality)
function manageOrderPayment(orderId, totalAmount, currentPaid, paymentStatus) {
    const dueAmount = Math.max(0, totalAmount - currentPaid);

    const modal = document.createElement('div');
    modal.innerHTML = `
        <div style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            font-family: 'Poppins', sans-serif;
        ">
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 15px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                min-width: 450px;
                max-width: 90%;
            ">
                <h2 style="margin-bottom: 1rem; color: #333; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas fa-credit-card" style="color: #FFD700;"></i> Manage Payment - Order #${orderId}
                </h2>

                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem: text-align: center;">
                        <div>
                            <small style="color: #666;">Total Amount</small><br>
                            <strong style="font-size: 1.2rem;">৳${totalAmount}</strong>
                        </div>
                        <div>
                            <small style="color: #666;">Paid Amount</small><br>
                            <strong style="font-size: 1.2rem; color: #28a745;">৳${currentPaid}</strong>
                        </div>
                        <div>
                            <small style="color: #666;">Due Amount</small><br>
                            <strong style="font-size: 1.2rem; color: ${dueAmount > 0 ? '#dc3545' : '#28a745'};">৳${dueAmount}</strong>
                        </div>
                    </div>
                </div>

                                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color: #333; margin-bottom: 1rem;">Payment Actions:</h4>

                    ${dueAmount > 0 ? `
                        <div style="margin-bottom: 1rem;">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Record Payment Amount:</label>
                            <input type="number" id="paymentAmount" placeholder="Enter amount" value="${dueAmount}" max="${dueAmount}" min="1" style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 2px solid #ddd;
                                border-radius: 5px;
                                font-size: 1rem;
                                margin-bottom: 0.5rem;
                            ">
                            <select id="paymentMethod" style="
                                width: 100%;
                                padding: 0.75rem;
                                border: 2px solid #ddd;
                                border-radius: 5px;
                                font-size: 1rem;
                                margin-bottom: 1rem;
                            ">
                                <option value="cash">Cash Payment</option>
                                <option value="bkash">bKash</option>
                                <option value="nagad">Nagad</option>
                                <option value="rocket">Rocket</option>
                                <option value="bank">Bank Transfer</option>
                            </select>
                            <button onclick="recordPayment('${orderId}', '${totalAmount}')" style="
                                background: #28a745;
                                color: white;
                                border: none;
                                padding: 0.75rem 1.5rem;
                                border-radius: 5px;
                                font-weight: 600;
                                cursor: pointer;
                                width: 100%;
                                margin-bottom: 0.5rem;
                            ">
                                <i class="fas fa-plus"></i> Record Payment
                            </button>
                        </div>
                    ` : ''}

                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                        <button onclick="setPaymentStatus('${orderId}', 'fully_paid', ${totalAmount})" style="
                            background: #28a745;
                            color: white;
                            border: none;
                            padding: 0.75rem 1rem;
                            border-radius: 5px;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            <i class="fas fa-check"></i> Mark Fully Paid
                        </button>
                        <button onclick="setPaymentStatus('${orderId}', 'pending', ${currentPaid})" style="
                            background: #dc3545;
                            color: white;
                            border: none;
                            padding: 0.75rem 1rem;
                            border-radius: 5px;
                            font-weight: 600;
                            cursor: pointer;
                        ">
                            <i class="fas fa-times"></i> Mark Unpaid
                        </button>
                    </div>
                </div>

                <div style="text-align: center;">
                    <button onclick="closePaymentManagementModal()" style="
                        background: #6c757d;
                        color: white;
                        border: none;
                        padding: 0.75rem 2rem;
                        border-radius: 5px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Close</button>
                </div>
            </div>
        </div>
    `;

    modal.id = 'paymentManagementModal';
    document.body.appendChild(modal);
}

function recordPayment(orderId, totalAmount) {
    const amountInput = document.getElementById('paymentAmount');
    const methodSelect = document.getElementById('paymentMethod');

    const amount = parseFloat(amountInput.value);
    const method = methodSelect.value;

    if (!amount || amount <= 0) {
        showToast('Please enter a valid payment amount', 'error');
        return;
    }

    const orderIndex = allOrders.findIndex(o => o.id == orderId);
    if (orderIndex > -1) {
        const order = allOrders[orderIndex];
        const currentPaid = order.advancePaid || 100;
        const newPaidAmount = currentPaid + amount;
        const total = parseFloat(totalAmount);

        allOrders[orderIndex].advancePaid = newPaidAmount;
        allOrders[orderIndex].paymentStatus = newPaidAmount >= total ? 'fully_paid' : 'partially_paid';
        allOrders[orderIndex].lastPayment = {
            amount: amount,
            method: method,
            timestamp: new Date().toISOString(),
            recordedBy: 'admin'
        };

        if (!allOrders[orderIndex].paymentHistory) {
            allOrders[orderIndex].paymentHistory = [];
        }
        allOrders[orderIndex].paymentHistory.push({
            amount: amount,
            method: method,
            timestamp: new Date().toISOString(),
            recordedBy: 'admin',
            transactionId: 'ADM' + Date.now()
        });

        saveOrdersToStorage();
        // broadcastToWebsite('orders_updated', { 
        //     eventType: 'UPDATE', 
        //     new: allOrders[orderIndex] 
        // });

        showToast(`Payment of ৳${amount} recorded and synced globally!`, 'success');
        closePaymentManagementModal();
        displayOrders();

        localStorage.setItem('cache_buster', Date.now().toString());
    }
}

function setPaymentStatus(orderId, status, amount) {
    const orderIndex = allOrders.findIndex(o => o.id == orderId);
    if (orderIndex > -1) {
        if (status === 'fully_paid') {
            allOrders[orderIndex].advancePaid = parseFloat(amount);
            allOrders[orderIndex].paymentStatus = 'fully_paid';
        } else if (status === 'pending') {
            allOrders[orderIndex].paymentStatus = 'pending';
        }

        allOrders[orderIndex].paymentStatusUpdatedBy = 'admin';
        allOrders[orderIndex].paymentStatusUpdatedAt = new Date().toISOString();

        saveOrdersToStorage();
        // broadcastToWebsite('orders_updated', { 
        //     eventType: 'UPDATE', 
        //     new: allOrders[orderIndex] 
        // });

        showToast(`Payment status updated to ${status.replace('_', ' ')} - Synced globally!`, 'success');
        closePaymentManagementModal();
        displayOrders();

        localStorage.setItem('cache_buster', Date.now().toString());
    }
}

function saveOrdersToStorage() {
    localStorage.setItem('admin-orders', JSON.stringify(allOrders));
    localStorage.setItem('website-orders', JSON.stringify(allOrders));
}

function closePaymentManagementModal() {
    const modal = document.getElementById('paymentManagementModal');
    if (modal) {
        document.body.removeChild(modal);
    }
}

// Enhanced global sync for dynamic styles and design updates
function updateGlobalDesignSettings() {
    const designSettings = {
        primaryColor: localStorage.getItem('site-primary-color') || '#1a1a1a',
        secondaryColor: localStorage.getItem('site-secondary-color') || '#FFD700',
        accentColor: localStorage.getItem('site-accent-color') || '#FFF8DC',
        fontFamily: localStorage.getItem('site-font-family') || 'Poppins',
        borderRadius: localStorage.getItem('site-border-radius') || '10px',
        lastUpdated: Date.now()
    };

    // Broadcast design changes to all website instances
    // broadcastToWebsite('design_updated', designSettings);
    localStorage.setItem('global-design-settings', JSON.stringify(designSettings));
    console.log('🎨 Global design settings updated and synced');
}

// Enhanced site settings management
async function handleSiteSettings(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const siteSettings = {
        siteName: formData.get('siteName') || 'TryneX Lifestyle',
        heroTitle: formData.get('heroTitle') || 'Premium Custom Gifts',
        heroSubtitle: formData.get('heroSubtitle') || 'Personalized products for every occasion',
        contactPhone: formData.get('contactPhone') || '+880 1747 292277',
        contactEmail: formData.get('contactEmail') || 'info@trynexlifestyle.com',
        aboutText: formData.get('aboutText') || 'Creating memories with premium custom gifts.',
        primaryColor: formData.get('primaryColor') || '#1a1a1a',
        secondaryColor: formData.get('secondaryColor') || '#FFD700',
        accentColor: formData.get('accentColor') || '#FFF8DC',
        fontFamily: formData.get('fontFamily') || 'Poppins',
        borderRadius: formData.get('borderRadius') || '10px',
        updated_at: new Date().toISOString()
    };

    try {
        // Save to multiple storage locations for maximum reliability
        localStorage.setItem('site-settings', JSON.stringify(siteSettings));
        localStorage.setItem('website-settings', JSON.stringify(siteSettings));
        localStorage.setItem('frontend-settings', JSON.stringify(siteSettings));

        // Save individual design settings for easy access
        Object.keys(siteSettings).forEach(key => {
            if (key.includes('Color') || key === 'fontFamily' || key === 'borderRadius') {
                localStorage.setItem(`site-${key.toLowerCase().replace(/([A-Z])/g, '-$1')}`, siteSettings[key]);
            }
        });

        // Update global design settings
        updateGlobalDesignSettings();

        // Broadcast comprehensive update
        // broadcastToWebsite('site_settings_updated', siteSettings);

        // Force refresh all website instances
        localStorage.setItem('force_refresh', Date.now().toString());
        localStorage.setItem('cache_buster', Date.now().toString());

        showToast('✅ Site settings updated and synced globally!', 'success');

        // Apply changes immediately to admin panel
        applyDesignChangesToAdminPanel(siteSettings);

    } catch (error) {
        console.error('❌ Error saving site settings:', error);
        showToast('❌ Error saving site settings: ' + error.message, 'error');
    }
}

// Apply design changes to admin panel immediately
function applyDesignChangesToAdminPanel(settings) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.primaryColor);
    root.style.setProperty('--secondary-color', settings.secondaryColor);
    root.style.setProperty('--accent-color', settings.accentColor);
    root.style.setProperty('--border-radius', settings.borderRadius);

    if (settings.fontFamily) {
        document.body.style.fontFamily = `'${settings.fontFamily}', sans-serif`;
    }

    console.log('🎨 Admin panel design updated in real-time');
}

// Enhanced delete functions with real-time sync
async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This change will be instant for all users.')) return;

    try {
        if (isConnected && supabase) {
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', productId);

            if (error) throw error;
        }

        const deletedProduct = allProducts.find(p => p.id === productId);
        allProducts = allProducts.filter(p => p.id !== productId);

        // Sync to localStorage
        localStorage.setItem('admin-products', JSON.stringify(allProducts));
        localStorage.setItem('website-products', JSON.stringify(allProducts));
        localStorage.setItem('frontend-products', JSON.stringify(allProducts));

        // Broadcast deletion with force refresh
        // broadcastToWebsite('products_updated', { 
        //     eventType: 'DELETE', 
        //     old: deletedProduct,
        //     forceRefresh: true
        // });

        showToast('✅ Product deleted and synced globally!', 'success');
        displayProducts();
        updateDashboard();

        // Multiple cache busting strategies
        localStorage.setItem('cache_buster', Date.now().toString());
        localStorage.setItem('force_refresh', Date.now().toString());
        localStorage.setItem('data_version', Date.now().toString());

    } catch (error) {
        console.error('❌ Error deleting product:', error);
        showToast('❌ Error deleting product: ' + error.message, 'error');
    }
}

async function deleteVoucher(voucherId) {
    if (!confirm('Are you sure you want to delete this voucher? This change will be instant for all users.')) return;

    try {
        if (isConnected && supabase) {
            const { error } = await supabase
                .from('vouchers')
                .delete()
                .eq('id', voucherId);

            if (error) throw error;
        }

        const deletedVoucher = allVouchers.find(v => v.id === voucherId);
        allVouchers = allVouchers.filter(v => v.id !== voucherId);

        localStorage.setItem('admin-vouchers', JSON.stringify(allVouchers));
        localStorage.setItem('website-vouchers', JSON.stringify(allVouchers));

        // broadcastToWebsite('vouchers_updated', { 
        //     eventType: 'DELETE', 
        //     old: deletedVoucher 
        // });

        showToast('✅ Voucher deleted globally!', 'success');
        displayVouchers();

        localStorage.setItem('cache_buster', Date.now().toString());

    } catch (error) {
        console.error('❌ Error deleting voucher:', error);
        showToast('❌ Error deleting voucher: ' + error.message, 'error');
    }
}

async function deletePromotion(promotionId) {
    if (!confirm('Are you sure you want to delete this promotion? This change will be instant for all users.')) return;

    try {
        if (isConnected && supabase) {
            const { error } = await supabase
                .from('promotions')
                .delete()
                .eq('id', promotionId);

            if (error) throw error;
        }

        const deletedPromotion = allPromotions.find(p => p.id === promotionId);
        allPromotions = allPromotions.filter(p => p.id !== promotionId);

        localStorage.setItem('admin-promotions', JSON.stringify(allPromotions));
        localStorage.setItem('website-promotions', JSON.stringify(allPromotions));

        // broadcastToWebsite('promotions_updated', { 
        //     eventType: 'DELETE', 
        //     old: deletedPromotion 
        // });

        showToast('✅ Promotion deleted globally!', 'success');
        displayPromotions();

        localStorage.setItem('cache_buster', Date.now().toString());

    } catch (error) {
        console.error('❌ Error deleting promotion:', error);
        showToast('❌ Error deleting promotion: ' + error.message, 'error');
    }
}

function updateDashboard() {
    const totalProducts = document.getElementById('totalProducts');
    const totalOrders = document.getElementById('totalOrders');
    const pendingOrders = document.getElementById('pendingOrders');
    const totalRevenue = document.getElementById('totalRevenue');

    if (totalProducts) totalProducts.textContent = allProducts.length;
    if (totalOrders) totalOrders.textContent = allOrders.length;
    if (pendingOrders) {
        const pending = allOrders.filter(order => 
            !order.status || order.status === 'pending' || order.status === 'processing'
        ).length;
        pendingOrders.textContent = pending;
    }
    if (totalRevenue) {
        const revenue = allOrders.reduce((sum, order) => 
            sum + (parseFloat(order.total_amount || order.total || 0)), 0
        );
        totalRevenue.textContent = `৳${revenue.toFixed(0)}`;
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 5px;
        z-index: 10000;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        font-family: 'Poppins', sans-serif;
        font-weight: 500;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function loadDataFromLocalStorage() {
    allProducts = JSON.parse(localStorage.getItem('admin-products') || '[]');
    allOrders = JSON.parse(localStorage.getItem('admin-orders') || '[]');
    allVouchers = JSON.parse(localStorage.getItem('admin-vouchers') || '[]');
    allPromotions = JSON.parse(localStorage.getItem('admin-promotions') || '[]');

    displayProducts();
    displayOrders();
    displayVouchers();
    displayPromotions();
}

// Tab Management
function showTab(tabName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const targetSection = document.getElementById(tabName + 'Section');
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Remove active class from all buttons
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Add active class to the button that calls showTab
    document.querySelector(`[onclick="showTab('${tabName}')"]`).classList.add('active');

    // Display the appropriate content based on which tab is selected
     switch(tabName) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'products':
            displayProducts();
            break;
        case 'orders':
            displayOrders();
            break;
        case 'vouchers':
            displayVouchers();
            break;
        case 'promotions':
            displayPromotions();
            break;
    }
}

// Sample data functions - Generate 48+ products
function getSample48Products() {
    const categories = ['Custom Gifts', 'Apparel', 'Accessories', 'Personalized Items', 'Home Decor', 'Office Items'];
    const baseProducts = [
        { name: 'Custom Photo Mug', basePrice: 450, category: 'Custom Gifts', description: 'Personalized photo mug with your favorite memories' },
        { name: 'Personalized T-Shirt', basePrice: 650, category: 'Apparel', description: 'Custom printed t-shirt with your design' },
        { name: 'Custom Phone Case', basePrice: 350, category: 'Accessories', description: 'Protect your phone with a personalized case' },
        { name: 'Photo Keychain', basePrice: 200, category: 'Accessories', description: 'Acrylic photo keychain with your memory' },
        { name: 'Custom Coffee Mug', basePrice: 400, category: 'Custom Gifts', description: 'Personalized coffee mug with your favorite quote' },
        { name: 'Polo Shirt', basePrice: 750, category: 'Apparel', description: 'Professional polo shirt with custom embroidery' },
        { name: 'Custom Mouse Pad', basePrice: 300, category: 'Office Items', description: 'Personalized mouse pad for your workspace' },
        { name: 'Photo Frame', basePrice: 500, category: 'Home Decor', description: 'Beautiful custom photo frame' }
    ];

    const features = ['Premium Quality', 'Durable Material', 'Premium Cotton', 'Eco-Friendly', 'Waterproof', 'Scratch Resistant'];
    const badges = ['🔥 Hot', '⭐ Popular', '🆕 New', '❤️ Love', '☕ Coffee', '📸 Memory', '👔 Professional', '🎁 Gift'];

    const products = [];

    for (let i = 0; i < 48; i++) {
        const base = baseProducts[i % baseProducts.length];
        const variation = Math.floor(i / baseProducts.length) + 1;

        products.push({
            id: i + 1,
            name: variation > 1 ? `${base.name} ${variation}` : base.name,
            price: base.basePrice + (variation - 1) * 50 + (Math.random() * 100 - 50),
            category: base.category,
            description: base.description + (variation > 1 ? ` - Variant ${variation}` : ''),
            image_url: `https://images.unsplash.com/photo-${1544787219 + i}?w=400&h=400&fit=crop`,
            feature: features[i % features.length],
            badge: badges[i % badges.length],
            stock_quantity: Math.floor(Math.random() * 100) + 20,
            is_active: true,
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        });
    }

    return products;
}

function getSampleOrders() {
    return [
        {
            id: 'TRX' + Date.now(),
            customer_name: 'John Doe',
            customer_phone: '01712345678',
            customer_email: 'john@example.com',
            shipping_address: 'Dhaka, Bangladesh',
            total_amount: 1500,
            advancePaid: 100,
            paymentStatus: 'partially_paid',
            status: 'pending',
            created_at: new Date().toISOString()
        }
    ];
}

function getSampleVouchers() {
    return [
        {
            id: 1,
            code: 'SAVE20',
            discount_type: 'percentage',
            discount_value: 20,
            description: '20% off on all items',
            is_active: true,
            created_at: new Date().toISOString()
        }
    ];
}

function getSamplePromotions() {
    return [
        {
            id: 1,
            title: 'Summer Special',
            discount_type: 'percentage',
            discount_value: 25,
            description: '25% off on all summer items',
            show_popup: true,
            popup_title: '🌞 Summer Special!',
            popup_message: 'Get 25% off on all items this summer!',
            button_text: 'Shop Now',
            is_active: true,
            created_at: new Date().toISOString()
        }
    ];
}

// Update product counts display
function updateProductCounts() {
    const totalCount = document.getElementById('totalProductsCount');
    const activeCount = document.getElementById('activeProductsCount');
    const featuredCount = document.getElementById('featuredProductsCount');

    if (totalCount) totalCount.textContent = allProducts.length;
    if (activeCount) activeCount.textContent = allProducts.filter(p => p.is_active !== false).length;
    if (featuredCount) featuredCount.textContent = allProducts.filter(p => p.is_featured).length;
}

// Load featured products selector
function loadFeaturedProductsSelector() {
    const selector = document.getElementById('featuredProductsSelector');
    if (!selector || allProducts.length === 0) return;

    const featuredProducts = JSON.parse(localStorage.getItem('featured-products') || '[]');

    selector.innerHTML = allProducts.slice(0, 12).map(product => `
        <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border: 1px solid #ddd; margin-bottom: 1rem; border-radius: 5px;">
            <input type="checkbox" 
                   id="featured_${product.id}" 
                   value="${product.id}"
                   ${featuredProducts.includes(product.id) ? 'checked' : ''}
                   style="width: auto;">
            <img src="${product.image_url}" alt="${product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;">
            <div>
                <strong>${product.name}</strong>
                <div style="color: #666; font-size: 0.9rem;">${product.category} - ৳${product.price}</div>
            </div>
        </div>
    `).join('');
}

// Save featured products
function saveFeaturedProducts() {
    const checkboxes = document.querySelectorAll('#featuredProductsSelector input[type="checkbox"]:checked');
    const featuredProductIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    localStorage.setItem('featured-products', JSON.stringify(featuredProductIds));
    localStorage.setItem('cache_buster', Date.now().toString());

    // Update display
    // displayFeatured();
    displayProducts();

    showToast('✅ Featured products updated successfully!', 'success');
}

// Delete category
async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
        const categories = JSON.parse(localStorage.getItem('admin-categories') || '[]');
        const updatedCategories = categories.filter(c => c.id !== categoryId);
        localStorage.setItem('admin-categories', JSON.stringify(updatedCategories));

        // displayCategories();
        displayProducts();

        localStorage.setItem('cache_buster', Date.now().toString());

        showToast('✅ Category deleted successfully!', 'success');

    } catch (error) {
        console.error('❌ Error deleting category:', error);
        showToast('❌ Error deleting category!', 'error');
    }
}

// Remove featured product
function removeFeaturedProduct(productId) {
    const featuredProducts = JSON.parse(localStorage.getItem('featured-products') || '[]');
    const updatedFeatured = featuredProducts.filter(id => id !== productId);

    localStorage.setItem('featured-products', JSON.stringify(updatedFeatured));
    localStorage.setItem('cache_buster', Date.now().toString());

    // Update displays
    // displayFeatured();
    displayProducts();
    loadFeaturedProductsSelector();

    showToast('✅ Product removed from featured!', 'success');
}

// Handle category addition
async function handleAddCategory(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const categoryData = {
        id: Date.now(),
        name: formData.get('categoryName'),
        slug: formData.get('categorySlug'),
        image: formData.get('categoryImage'),
        icon: formData.get('categoryIcon'),
        description: formData.get('categoryDescription'),
        created_at: new Date().toISOString()
    };

    try {
        // Add to categories array
        const categories = JSON.parse(localStorage.getItem('admin-categories') || '[]');
        categories.push(categoryData);
        localStorage.setItem('admin-categories', JSON.stringify(categories));

        // displayCategories();
        displayProducts();

        // Reset form
        event.target.reset();

        // Clear cache
        localStorage.setItem('cache_buster', Date.now().toString());

        showToast('✅ Category added successfully!', 'success');

    } catch (error) {
        console.error('❌ Error adding category:', error);
        showToast('❌ Error adding category!', 'error');
    }
}

function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const form = document.getElementById('product-form');
    if (!form) return;

    form.name.value = product.name || '';
    form.price.value = product.price || '';
    form.description.value = product.description || '';
    form.image_url.value = product.image_url || '';
    form.category.value = product.category || 'general';
    form.is_featured.checked = product.is_featured || false;

    currentEditingProduct = productId;

    // Scroll to form
    form.scrollIntoView({ behavior: 'smooth' });
}

//Enhanced global sync for dynamic styles and design updates
function updateGlobalDesignSettings() {
    const designSettings = {
        primaryColor: localStorage.getItem('site-primary-color') || '#1a1a1a',
        secondaryColor: localStorage.getItem('site-secondary-color') || '#FFD700',
        accentColor: localStorage.getItem('site-accent-color') || '#FFF8DC',
        fontFamily: localStorage.getItem('site-font-family') || 'Poppins',
        borderRadius: localStorage.getItem('site-border-radius') || '10px',
        lastUpdated: Date.now()
    };

     //Broadcast design changes to all website instances
    //broadcastToWebsite('design_updated', designSettings);
    localStorage.setItem('global-design-settings', JSON.stringify(designSettings));
    console.log('🎨 Global design settings updated and synced');
}

// Legacy function for compatibility
function openAdminPanel() {
    handleAdminAccess();
}

// Initialize admin panel
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin panel initializing...');

    // Initialize Supabase connection
    initializeSupabase().then(() => {
        // Load all data
        loadProductsAdmin();
        loadOrdersData();
        loadVouchersData();

        console.log('✅ Admin panel initialized');
    });

    // Initialize form handlers
    const productForm = document.getElementById('productForm');
    if (productForm) {
        productForm.addEventListener('submit', handleProductSubmit);
    }
});

// Handle product form submission
async function handleProductSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const productData = {
        name: formData.get('productName'),
        price: parseFloat(formData.get('productPrice')),
        category: formData.get('productCategory'),
        description: formData.get('productDescription') || '',
        image_url: formData.get('productImage'),
        is_active: true,
        created_at: new Date().toISOString()
    };

    try {
        if (window.editingProductId) {
            // Update existing product
            productData.id = window.editingProductId;

            if (supabase) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', window.editingProductId);

                if (error) throw error;
            }

            // Update in local array
            const index = allProducts.findIndex(p => p.id === window.editingProductId);
            if (index !== -1) {
                allProducts[index] = { ...allProducts[index], ...productData };
            }

            showNotification('Product updated successfully!', 'success');
            delete window.editingProductId;
        } else {
            // Add new product
            productData.id = Date.now();

            if (supabase) {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);

                if (error) throw error;
            }

            allProducts.push(productData);
            showNotification('Product added successfully!', 'success');
        }

        // Update localStorage
        localStorage.setItem('admin-products', JSON.stringify(allProducts));
        localStorage.setItem('website-products', JSON.stringify(allProducts));

        // Refresh display
        displayProductsAdmin();
        updateProductCounts();

        // Reset form
        event.target.reset();
        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-plus"></i> Add Product';
        }

    } catch (error) {
        console.error('Error saving product:', error);
        showNotification('Failed to save product: ' + error.message, 'error');
    }
}

//Export functions for global access
window.showSection = showSection;
window.handleAddProduct = handleAddProduct;
window.handleAddVoucher = handleAddVoucher;
window.handleSiteSettings = handleSiteSettings;
window.updateOrderStatus = updateOrderStatus;
window.deleteProduct = deleteProduct;
window.updateGlobalDesignSettings = updateGlobalDesignSettings;
window.applyDesignChangesToAdminPanel = applyDesignChangesToAdminPanel;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Admin Panel initializing...');
     //Initialize Supabase
    initializeSupabase();

    // Show first tab by default
    showTab('dashboard');

     //Bind form handlers
    const productForm = document.getElementById('addProductForm');
    if (productForm) {
        productForm.addEventListener('submit', handleAddProduct);
    }

    const voucherForm = document.getElementById('addVoucherForm');
    if (voucherForm) {
        voucherForm.addEventListener('submit', handleAddVoucher);
    }

    const promotionForm = document.getElementById('addPromotionForm');
    if (promotionForm) {
        promotionForm.addEventListener('submit', handleAddPromotion);
}

    const siteSettingsForm = document.getElementById('siteSettingsForm');
    if (siteSettingsForm) {
        siteSettingsForm.addEventListener('submit', handleSiteSettings);
    }

    // Auto-refresh data every 5 minutes
    setInterval(() => {
        if (isConnected) {
            loadAllData();
        }
    }, 300000);
});

// Load site settings into form
function loadSiteSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('site-settings') || '{}');

        // Load content settings
        if (document.getElementById('siteName')) document.getElementById('siteName').value = settings.siteName || 'TryneX Lifestyle';
        if (document.getElementById('heroTitle')) document.getElementById('heroTitle').value = settings.heroTitle || 'Premium Custom Gifts';        if (document.getElementById('heroSubtitle')) document.getElementById('heroSubtitle').value = settings.heroSubtitle || 'Personalized products for every occasion';
        if (document.getElementById('contactPhone')) document.getElementById('contactPhone').value = settings.contactPhone || '+880 1747 292277';
        if (document.getElementById('contactEmail')) document.getElementById('contactEmail').value = settings.contactEmail || 'info@trynexlifestyle.com';
        if (document.getElementById('aboutText')) document.getElementById('aboutText').value = settings.aboutText || 'Creating memories with premium custom gifts.';

        // Load design settings
        if (document.getElementById('primaryColor')) document.getElementById('primaryColor').value = settings.primaryColor || '#1a1a1a';
        if (document.getElementById('secondaryColor')) document.getElementById('secondaryColor').value = settings.secondaryColor || '#FFD700';
        if (document.getElementById('accentColor')) document.getElementById('accentColor').value = settings.accentColor || '#FFF8DC';
        if (document.getElementById('fontFamily')) document.getElementById('fontFamily').value = settings.fontFamily || 'Poppins';
        if (document.getElementById('borderRadius')) document.getElementById('borderRadius').value = settings.borderRadius || '10px';

        // Apply current design
        applyDesignChangesToAdminPanel(settings);

    } catch (error) {
        console.error('❌ Error loading site settings:', error);
    }
}

// Load products for admin panel
async function loadProductsAdmin() {
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            allProducts = data || [];
        } else {
            allProducts = JSON.parse(localStorage.getItem('admin-products') || '[]');
        }

        localStorage.setItem('admin-products', JSON.stringify(allProducts));
        localStorage.setItem('website-products', JSON.stringify(allProducts));
        displayProductsAdmin();
        updateProductCounts();

    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products: ' + error.message, 'error');
    }
}

// Display products in admin panel
function displayProductsAdmin() {
    const container = document.getElementById('productsList');
    if (!container) return;

    if (allProducts.length === 0) {
        container.innerHTML = '<p class="no-data">No products found.</p>';
        return;
    }

    container.innerHTML = allProducts.map(product => `
        <div class="admin-card">
            <div class="product-header">
                <h3>${product.name}</h3>
                <div class="product-actions">
                    <button onclick="editProduct('${product.id}')" class="btn-edit">Edit</button>
                    <button onclick="deleteProduct('${product.id}')" class="btn-delete">Delete</button>
                </div>
            </div>
            <div class="product-details">
                <img src="${product.image_url || 'https://via.placeholder.com/150'}" alt="${product.name}" class="product-thumb">
                <div class="product-info">
                    <p><strong>Price:</strong> ₹${product.price}</p>
                    <p><strong>Category:</strong> ${product.category}</p>
                    <p><strong>Description:</strong> ${product.description.substring(0, 100)}...</p>
                    <p><strong>Created:</strong> ${new Date(product.created_at).toLocaleDateString()}</p>
                </div>
            </div>
        </div>
    `).join('');
}

//Edit product function
function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    const form = document.getElementById('productForm');
    if (!form) return;

    form.productName.value = product.name || '';
    form.productPrice.value = product.price || '';
    form.productCategory.value = product.category || '';
    form.productDescription.value = product.description || '';
    form.productImage.value = product.image_url || '';

    window.editingProductId = productId;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Product';
    }
}

//Export functions for global access
window.showTab = showTab;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.removeFeaturedProduct = removeFeaturedProduct;
window.deleteCategory = deleteCategory;
window.handleSiteSettings = handleSiteSettings;
window.handleAddCategory = handleAddCategory;
window.applyDesignChangesToAdminPanel = applyDesignChangesToAdminPanel;
window.loadSiteSettings = loadSiteSettings;
window.loadProductsAdmin = loadProductsAdmin;
window.displayProductsAdmin = displayProductsAdmin;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.updateProductCounts = updateProductCounts;
window.updateProductCounts = updateProductCounts;

// Initialize admin panel without authentication
        async function initializeAdminPanel() {
            try {
                // Show admin content directly
                document.querySelector('.admin-container').style.display = 'block';
                console.log('🔓 Admin panel loaded without authentication');

                // Initialize Supabase and load data
                await initializeSupabase();
            } catch (error) {
                console.error('Initialization error:', error);
                // Still show admin panel even if there are errors
                document.querySelector('.admin-container').style.display = 'block';
            }
        }

// Add event listener to the admin symbol
document.addEventListener('DOMContentLoaded', function() {
    let clickCount = 0;
    let timer;
    const adminSymbol = document.getElementById('adminSymbol'); // Ensure you have an element with this ID in your footer

    if (adminSymbol) {
        adminSymbol.addEventListener('click', function() {
            clickCount++;

            if (clickCount === 1) {
                timer = setTimeout(() => {
                    clickCount = 0;
                }, 2000); // Reset after 2 seconds of inactivity
            }

            if (clickCount >= 5) {
                clearTimeout(timer);
                clickCount = 0;
                initializeAdminPanel(); // Call the admin panel initialization
            }
        });
    } else {
        console.warn('Admin symbol element not found. Ensure an element with id "adminSymbol" exists.');
    }
});