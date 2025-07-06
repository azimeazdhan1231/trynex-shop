
-- Additional sample data for TryneX Lifestyle
-- Run this AFTER the main database setup

-- Insert more categories
INSERT INTO categories (name, slug, description, image_url) VALUES
('Mugs', 'mugs', 'Custom photo mugs and drinkware', 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400'),
('T-Shirts', 't-shirts', 'Custom printed t-shirts and apparel', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'),
('Keychains', 'keychains', 'Personalized keychains and accessories', 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400'),
('Home Decor', 'home-decor', 'Custom home decoration items', 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400');

-- Insert 48 sample products
INSERT INTO products (name, description, price, category_id, image_url, badge, feature, stock_quantity) VALUES
-- Mugs (12 products)
('Classic White Mug', 'Premium ceramic mug with custom photo printing', 350, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Popular', true, 50),
('Color Changing Mug', 'Magic mug that reveals image when hot', 450, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Hot', true, 30),
('Travel Mug', 'Insulated travel mug with custom design', 550, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'New', false, 40),
('Heart Handle Mug', 'Romantic mug with heart-shaped handle', 400, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Love', true, 25),
('Premium Coffee Mug', 'High-quality ceramic coffee mug', 380, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', '', false, 60),
('Personalized Name Mug', 'Custom mug with name and photo', 370, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Bestseller', false, 45),
('Birthday Special Mug', 'Special birthday themed mug', 360, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Gift', false, 35),
('Anniversary Mug', 'Romantic anniversary themed mug', 390, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Anniversary', false, 30),
('Family Photo Mug', 'Large mug for family photos', 420, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Family', false, 40),
('Pet Photo Mug', 'Special mug for pet lovers', 350, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Pet', false, 35),
('Graduation Mug', 'Commemorative graduation mug', 400, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Graduation', false, 25),
('Corporate Mug', 'Professional corporate branded mug', 380, 5, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400', 'Corporate', false, 50),

-- T-Shirts (12 products)
('Premium Cotton T-Shirt', 'High-quality cotton t-shirt with custom print', 450, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Popular', true, 100),
('Polo Shirt Custom', 'Professional polo shirt with embroidery', 650, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Premium', true, 75),
('Hoodie Custom Print', 'Comfortable hoodie with custom design', 850, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Winter', false, 60),
('V-Neck Custom Tee', 'Stylish v-neck t-shirt with custom print', 480, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Style', false, 80),
('Sports T-Shirt', 'Athletic t-shirt with custom team logo', 520, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Sports', false, 70),
('Designer T-Shirt', 'Premium designer t-shirt with custom art', 750, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Designer', false, 50),
('Couple T-Shirt Set', 'Matching t-shirts for couples', 900, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Couple', true, 40),
('Birthday T-Shirt', 'Special birthday themed t-shirt', 450, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Birthday', false, 60),
('Team T-Shirt', 'Custom team t-shirt with logo', 500, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Team', false, 90),
('Event T-Shirt', 'Custom event commemoration t-shirt', 480, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Event', false, 70),
('Fashion T-Shirt', 'Trendy fashion t-shirt with custom design', 550, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Fashion', false, 65),
('Vintage Style Tee', 'Retro vintage style custom t-shirt', 580, 6, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', 'Vintage', false, 55),

-- Keychains (12 products)
('Acrylic Photo Keychain', 'Clear acrylic keychain with photo', 150, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Popular', true, 200),
('Metal Engraved Keychain', 'Premium metal keychain with engraving', 180, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Premium', false, 150),
('Heart Shape Keychain', 'Romantic heart-shaped photo keychain', 160, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Love', true, 180),
('LED Light Keychain', 'Keychain with LED light and photo', 220, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Tech', false, 120),
('Wooden Custom Keychain', 'Eco-friendly wooden keychain with engraving', 140, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Eco', false, 160),
('Crystal Photo Keychain', 'Premium crystal keychain with 3D photo', 280, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Crystal', false, 100),
('Leather Custom Keychain', 'Genuine leather keychain with custom text', 200, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Leather', false, 130),
('Car Photo Keychain', 'Special keychain for car enthusiasts', 170, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Car', false, 140),
('Round Photo Keychain', 'Classic round photo keychain', 150, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Classic', false, 190),
('Square Photo Keychain', 'Modern square photo keychain', 155, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Modern', false, 175),
('Diamond Shape Keychain', 'Unique diamond-shaped keychain', 190, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Unique', false, 110),
('Pet Photo Keychain', 'Special keychain for pet photos', 160, 7, 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400', 'Pet', false, 165),

-- Home Decor (12 products)
('Custom Photo Frame', 'Wooden photo frame with custom text', 380, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Popular', true, 80),
('Wall Clock Custom', 'Personalized wall clock with photo', 750, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Functional', false, 40),
('Canvas Print', 'High-quality canvas print of your photo', 650, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Art', true, 60),
('Custom Pillow', 'Soft pillow with custom photo print', 450, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Comfort', false, 70),
('Photo Magnet Set', 'Set of custom photo magnets', 250, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Set', false, 120),
('Custom Lamp', 'Table lamp with personalized photo shade', 890, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Lighting', false, 30),
('Photo Coaster Set', 'Set of 4 custom photo coasters', 320, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Set', false, 90),
('Custom Calendar', 'Personalized photo calendar', 480, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Calendar', false, 50),
('Photo Puzzle', 'Custom jigsaw puzzle with your photo', 420, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Puzzle', false, 60),
('Custom Doormat', 'Personalized welcome doormat', 680, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Welcome', false, 45),
('Photo Bookmarks', 'Set of personalized photo bookmarks', 180, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Books', false, 100),
('Custom Night Light', 'LED night light with custom photo', 520, 8, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400', 'Night', false, 40);

-- Update featured products to include some of the new products
DELETE FROM featured_products;
INSERT INTO featured_products (product_id, display_order) VALUES
(1, 1), (2, 2), (5, 3), (13, 4), (14, 5), (17, 6), (25, 7), (26, 8);

-- Update existing products to be featured
UPDATE products SET feature = true WHERE id IN (1, 2, 5, 13, 14, 17, 25, 26);

SELECT 'Sample data setup completed! 48 products added with proper categories and featured products.' AS status;
