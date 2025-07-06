
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Supabase configuration
const supabaseUrl = 'https://wifsqonbnfmwtqvupqbk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpZnNxb25ibmZtd3RxdnVwcWJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODAyNjMsImV4cCI6MjA2NzE1NjI2M30.A7o3vhEaNZb9lmViHA_KQrwzKJTBWpsD6KbHqkkput0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        message: 'TryneX Backend Server Running'
    });
});

// Products API
app.get('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/products', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .insert([req.body])
            .select()
            .single();
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Orders API
app.get('/api/orders', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .insert([req.body])
            .select()
            .single();
        
        if (error) throw error;
        
        // Send success response
        res.json({ success: true, data });
        
        // Log order creation
        console.log('✅ New order created:', data.id);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('orders')
            .update(req.body)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Vouchers API
app.get('/api/vouchers', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('vouchers')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching vouchers:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Real-time sync endpoint
app.get('/api/sync', async (req, res) => {
    try {
        const [products, orders, vouchers] = await Promise.all([
            supabase.from('products').select('*'),
            supabase.from('orders').select('*'),
            supabase.from('vouchers').select('*')
        ]);
        
        res.json({
            success: true,
            data: {
                products: products.data || [],
                orders: orders.data || [],
                vouchers: vouchers.data || []
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error syncing data:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 TryneX Backend Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`💾 Connected to Supabase: ${supabaseUrl}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});
