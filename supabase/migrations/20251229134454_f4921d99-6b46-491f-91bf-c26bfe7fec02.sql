-- Drop existing tables (clean slate for e-commerce)
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS bom CASCADE;
DROP TABLE IF EXISTS quality_control CASCADE;
DROP TABLE IF EXISTS resource_allocations CASCADE;
DROP TABLE IF EXISTS resources CASCADE;
DROP TABLE IF EXISTS sprints CASCADE;
DROP TABLE IF EXISTS team_tasks CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS job_order_history CASCADE;
DROP TABLE IF EXISTS job_activities CASCADE;
DROP TABLE IF EXISTS job_tasks CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS invoice_approvals CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chat_rooms CASCADE;
DROP TABLE IF EXISTS workers CASCADE;
DROP TABLE IF EXISTS vendor_companies CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Drop existing enums
DROP TYPE IF EXISTS job_status CASCADE;
DROP TYPE IF EXISTS app_role CASCADE;

-- Create new e-commerce schema

-- Admin users table
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Brands table
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  short_description TEXT,
  category_id UUID REFERENCES public.categories(id),
  brand_id UUID REFERENCES public.brands(id),
  base_price NUMERIC NOT NULL,
  sale_price NUMERIC,
  gender TEXT NOT NULL CHECK (gender IN ('men', 'women', 'kids', 'unisex')),
  occasion TEXT[], -- casual, sports, formal, running
  material TEXT,
  features TEXT[], -- anti-slip, breathable, lightweight
  rating NUMERIC DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_bestseller BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product variants (size + color combinations)
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  color_hex TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  price_adjustment NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product images
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer profiles
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  preferred_size TEXT,
  gender TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Customer addresses
CREATE TABLE public.customer_addresses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  country TEXT DEFAULT 'India',
  is_default BOOLEAN DEFAULT false,
  address_type TEXT DEFAULT 'home',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Shopping cart
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  session_id TEXT, -- For guest carts
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, variant_id),
  UNIQUE(session_id, variant_id)
);

-- Wishlist
CREATE TABLE public.wishlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

-- Coupons
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  min_order_amount NUMERIC DEFAULT 0,
  max_discount NUMERIC,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES public.customers(id),
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  billing_address JSONB,
  subtotal NUMERIC NOT NULL,
  discount_amount NUMERIC DEFAULT 0,
  shipping_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  coupon_id UUID REFERENCES public.coupons(id),
  coupon_code TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'razorpay', 'upi')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  payment_id TEXT,
  order_status TEXT NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned')),
  notes TEXT,
  tracking_number TEXT,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id),
  product_name TEXT NOT NULL,
  variant_sku TEXT NOT NULL,
  size TEXT NOT NULL,
  color TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Product reviews
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  order_id UUID REFERENCES public.orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  fit_rating TEXT CHECK (fit_rating IN ('runs_small', 'true_to_size', 'runs_large')),
  comfort_rating INTEGER CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
  images TEXT[],
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Homepage banners
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  link_url TEXT,
  button_text TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Site settings
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Admin users - only admins can manage
CREATE POLICY "Admins can view admin users" ON public.admin_users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage admin users" ON public.admin_users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Categories - public read, admin write
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Brands - public read, admin write
CREATE POLICY "Anyone can view active brands" ON public.brands FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage brands" ON public.brands FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Products - public read, admin write
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Product variants - public read, admin write
CREATE POLICY "Anyone can view active variants" ON public.product_variants FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage variants" ON public.product_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Product images - public read, admin write
CREATE POLICY "Anyone can view product images" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Admins can manage product images" ON public.product_images FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Customers - own data only
CREATE POLICY "Customers can view own profile" ON public.customers FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Customers can update own profile" ON public.customers FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Anyone can create customer" ON public.customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all customers" ON public.customers FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Customer addresses - own data only
CREATE POLICY "Customers can manage own addresses" ON public.customer_addresses FOR ALL USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);

-- Cart items - own data or session
CREATE POLICY "Users can manage own cart" ON public.cart_items FOR ALL USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  OR session_id IS NOT NULL
);

-- Wishlist - own data only
CREATE POLICY "Customers can manage own wishlist" ON public.wishlist FOR ALL USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);

-- Coupons - public read active, admin write
CREATE POLICY "Anyone can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Orders - own data or admin
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT USING (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "Anyone can create order" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Order items
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  order_id IN (SELECT id FROM public.orders WHERE customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()))
);
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Reviews - public read approved, auth write own
CREATE POLICY "Anyone can view approved reviews" ON public.reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Customers can create reviews" ON public.reviews FOR INSERT WITH CHECK (
  customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Banners - public read, admin write
CREATE POLICY "Anyone can view active banners" ON public.banners FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage banners" ON public.banners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Site settings - public read, admin write
CREATE POLICY "Anyone can view site settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_products_gender ON public.products(gender);
CREATE INDEX idx_products_featured ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX idx_products_bestseller ON public.products(is_bestseller) WHERE is_bestseller = true;
CREATE INDEX idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_stock ON public.product_variants(stock_quantity);
CREATE INDEX idx_orders_customer ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(order_status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX idx_cart_customer ON public.cart_items(customer_id);
CREATE INDEX idx_cart_session ON public.cart_items(session_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Insert sample categories
INSERT INTO public.categories (name, slug, description, display_order) VALUES
('Sneakers', 'sneakers', 'Casual and lifestyle sneakers', 1),
('Running', 'running', 'Performance running shoes', 2),
('Casual', 'casual', 'Everyday casual footwear', 3),
('Sports', 'sports', 'Athletic and sports shoes', 4),
('Formal', 'formal', 'Business and formal shoes', 5);

-- Insert sample brands
INSERT INTO public.brands (name, slug, description) VALUES
('StepUp', 'stepup', 'Premium comfort footwear'),
('UrbanStride', 'urbanstride', 'Street style sneakers'),
('FlexRun', 'flexrun', 'Performance running shoes'),
('ClassicFoot', 'classicfoot', 'Timeless formal wear');

-- Insert sample products
INSERT INTO public.products (name, slug, description, short_description, category_id, brand_id, base_price, sale_price, gender, occasion, material, features, is_featured, is_bestseller) VALUES
('Air Max Runner Pro', 'air-max-runner-pro', 'Premium running shoes with advanced cushioning technology for maximum comfort during long runs.', 'Ultimate comfort for runners', (SELECT id FROM categories WHERE slug = 'running'), (SELECT id FROM brands WHERE slug = 'flexrun'), 4999, 3999, 'men', ARRAY['running', 'sports'], 'Mesh upper with rubber sole', ARRAY['anti-slip', 'breathable', 'lightweight'], true, true),
('Urban Street Classic', 'urban-street-classic', 'Classic street style sneakers perfect for everyday wear. Timeless design meets modern comfort.', 'Street style essentials', (SELECT id FROM categories WHERE slug = 'sneakers'), (SELECT id FROM brands WHERE slug = 'urbanstride'), 3499, 2999, 'men', ARRAY['casual'], 'Canvas upper with rubber sole', ARRAY['breathable', 'cushioned'], true, false),
('Flex Comfort Walk', 'flex-comfort-walk', 'Ultra-comfortable walking shoes designed for all-day wear. Perfect for work or leisure.', 'All-day comfort', (SELECT id FROM categories WHERE slug = 'casual'), (SELECT id FROM brands WHERE slug = 'stepup'), 2999, 2499, 'women', ARRAY['casual', 'walking'], 'Synthetic leather with foam sole', ARRAY['lightweight', 'cushioned', 'anti-slip'], false, true),
('Kids Sports Runner', 'kids-sports-runner', 'Durable and comfortable sports shoes for active kids. Built to withstand play.', 'Built for active kids', (SELECT id FROM categories WHERE slug = 'sports'), (SELECT id FROM brands WHERE slug = 'flexrun'), 1999, 1599, 'kids', ARRAY['sports', 'school'], 'Synthetic mesh with rubber sole', ARRAY['anti-slip', 'durable', 'lightweight'], true, false),
('Executive Oxford', 'executive-oxford', 'Premium leather oxford shoes for the modern professional. Elegant design with superior comfort.', 'Professional elegance', (SELECT id FROM categories WHERE slug = 'formal'), (SELECT id FROM brands WHERE slug = 'classicfoot'), 5999, NULL, 'men', ARRAY['formal', 'office'], 'Genuine leather', ARRAY['premium', 'cushioned'], false, false),
('Women Casual Slip-On', 'women-casual-slip-on', 'Easy slip-on design with memory foam insole. Perfect for errands and casual outings.', 'Easy comfort', (SELECT id FROM categories WHERE slug = 'casual'), (SELECT id FROM brands WHERE slug = 'stepup'), 1999, 1499, 'women', ARRAY['casual'], 'Knit fabric with EVA sole', ARRAY['breathable', 'lightweight', 'flexible'], true, true);

-- Insert sample variants for products
INSERT INTO public.product_variants (product_id, sku, size, color, color_hex, stock_quantity) VALUES
-- Air Max Runner Pro
((SELECT id FROM products WHERE slug = 'air-max-runner-pro'), 'AMRP-BLK-7', '7', 'Black', '#000000', 15),
((SELECT id FROM products WHERE slug = 'air-max-runner-pro'), 'AMRP-BLK-8', '8', 'Black', '#000000', 20),
((SELECT id FROM products WHERE slug = 'air-max-runner-pro'), 'AMRP-BLK-9', '9', 'Black', '#000000', 18),
((SELECT id FROM products WHERE slug = 'air-max-runner-pro'), 'AMRP-BLK-10', '10', 'Black', '#000000', 12),
((SELECT id FROM products WHERE slug = 'air-max-runner-pro'), 'AMRP-WHT-8', '8', 'White', '#FFFFFF', 10),
((SELECT id FROM products WHERE slug = 'air-max-runner-pro'), 'AMRP-WHT-9', '9', 'White', '#FFFFFF', 8),
((SELECT id FROM products WHERE slug = 'air-max-runner-pro'), 'AMRP-RED-8', '8', 'Red', '#FF0000', 5),
-- Urban Street Classic
((SELECT id FROM products WHERE slug = 'urban-street-classic'), 'USC-WHT-7', '7', 'White', '#FFFFFF', 25),
((SELECT id FROM products WHERE slug = 'urban-street-classic'), 'USC-WHT-8', '8', 'White', '#FFFFFF', 30),
((SELECT id FROM products WHERE slug = 'urban-street-classic'), 'USC-WHT-9', '9', 'White', '#FFFFFF', 22),
((SELECT id FROM products WHERE slug = 'urban-street-classic'), 'USC-BLK-8', '8', 'Black', '#000000', 20),
((SELECT id FROM products WHERE slug = 'urban-street-classic'), 'USC-NVY-8', '8', 'Navy', '#000080', 15),
-- Flex Comfort Walk
((SELECT id FROM products WHERE slug = 'flex-comfort-walk'), 'FCW-PNK-5', '5', 'Pink', '#FFC0CB', 18),
((SELECT id FROM products WHERE slug = 'flex-comfort-walk'), 'FCW-PNK-6', '6', 'Pink', '#FFC0CB', 20),
((SELECT id FROM products WHERE slug = 'flex-comfort-walk'), 'FCW-GRY-5', '5', 'Grey', '#808080', 15),
((SELECT id FROM products WHERE slug = 'flex-comfort-walk'), 'FCW-GRY-6', '6', 'Grey', '#808080', 12),
((SELECT id FROM products WHERE slug = 'flex-comfort-walk'), 'FCW-BLK-6', '6', 'Black', '#000000', 25),
-- Kids Sports Runner
((SELECT id FROM products WHERE slug = 'kids-sports-runner'), 'KSR-BLU-1', '1', 'Blue', '#0000FF', 30),
((SELECT id FROM products WHERE slug = 'kids-sports-runner'), 'KSR-BLU-2', '2', 'Blue', '#0000FF', 28),
((SELECT id FROM products WHERE slug = 'kids-sports-runner'), 'KSR-BLU-3', '3', 'Blue', '#0000FF', 25),
((SELECT id FROM products WHERE slug = 'kids-sports-runner'), 'KSR-RED-2', '2', 'Red', '#FF0000', 20),
((SELECT id FROM products WHERE slug = 'kids-sports-runner'), 'KSR-GRN-2', '2', 'Green', '#00FF00', 15),
-- Executive Oxford
((SELECT id FROM products WHERE slug = 'executive-oxford'), 'EO-BRN-8', '8', 'Brown', '#8B4513', 10),
((SELECT id FROM products WHERE slug = 'executive-oxford'), 'EO-BRN-9', '9', 'Brown', '#8B4513', 12),
((SELECT id FROM products WHERE slug = 'executive-oxford'), 'EO-BRN-10', '10', 'Brown', '#8B4513', 8),
((SELECT id FROM products WHERE slug = 'executive-oxford'), 'EO-BLK-8', '8', 'Black', '#000000', 15),
((SELECT id FROM products WHERE slug = 'executive-oxford'), 'EO-BLK-9', '9', 'Black', '#000000', 18),
-- Women Casual Slip-On
((SELECT id FROM products WHERE slug = 'women-casual-slip-on'), 'WCSO-BLK-5', '5', 'Black', '#000000', 22),
((SELECT id FROM products WHERE slug = 'women-casual-slip-on'), 'WCSO-BLK-6', '6', 'Black', '#000000', 25),
((SELECT id FROM products WHERE slug = 'women-casual-slip-on'), 'WCSO-BLK-7', '7', 'Black', '#000000', 20),
((SELECT id FROM products WHERE slug = 'women-casual-slip-on'), 'WCSO-GRY-5', '5', 'Grey', '#808080', 18),
((SELECT id FROM products WHERE slug = 'women-casual-slip-on'), 'WCSO-GRY-6', '6', 'Grey', '#808080', 15);

-- Insert sample product images
INSERT INTO public.product_images (product_id, image_url, alt_text, display_order, is_primary) VALUES
((SELECT id FROM products WHERE slug = 'air-max-runner-pro'), 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 'Air Max Runner Pro - Side View', 0, true),
((SELECT id FROM products WHERE slug = 'air-max-runner-pro'), 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800', 'Air Max Runner Pro - Front View', 1, false),
((SELECT id FROM products WHERE slug = 'urban-street-classic'), 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', 'Urban Street Classic - Side View', 0, true),
((SELECT id FROM products WHERE slug = 'flex-comfort-walk'), 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800', 'Flex Comfort Walk - Side View', 0, true),
((SELECT id FROM products WHERE slug = 'kids-sports-runner'), 'https://images.unsplash.com/photo-1514989940723-e8e51d675571?w=800', 'Kids Sports Runner - Side View', 0, true),
((SELECT id FROM products WHERE slug = 'executive-oxford'), 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800', 'Executive Oxford - Side View', 0, true),
((SELECT id FROM products WHERE slug = 'women-casual-slip-on'), 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800', 'Women Casual Slip-On - Side View', 0, true);

-- Insert sample banners
INSERT INTO public.banners (title, subtitle, image_url, link_url, button_text, display_order) VALUES
('New Season Collection', 'Step into style with our latest arrivals', 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1920', '/products?filter=new', 'Shop New Arrivals', 1),
('Up to 50% Off', 'Mega sale on bestsellers', 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=1920', '/products?filter=sale', 'Shop Sale', 2);

-- Insert site settings
INSERT INTO public.site_settings (key, value) VALUES
('store_name', '"StepUp Store"'),
('store_tagline', '"Premium Footwear. Perfect Fit. Delivered Fast."'),
('free_shipping_threshold', '999'),
('contact_email', '"support@stepupstore.com"'),
('contact_phone', '"+91 98765 43210"'),
('social_instagram', '"@stepupstore"'),
('social_facebook', '"stepupstore"');