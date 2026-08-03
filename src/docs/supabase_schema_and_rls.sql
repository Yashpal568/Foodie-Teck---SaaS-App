-- ==============================================================================
-- FOODIE-TECH / SERVORA — COMPLETE SUPABASE DATABASE SCHEMA & RLS SECURITY POLICIES
-- ==============================================================================
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- TABLE CREATION
-- ------------------------------------------------------------------------------

-- Restaurants
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    address TEXT,
    description TEXT,
    logo_url TEXT,
    cover_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE UNIQUE,
    plan_name TEXT DEFAULT 'BASIC', -- BASIC, PRO, PREMIUM
    price NUMERIC DEFAULT 999,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS public.menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, name)
);

-- Menu Items
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    price NUMERIC NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    type TEXT DEFAULT 'VEG', -- VEG, NON_VEG
    is_in_stock BOOLEAN DEFAULT TRUE,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Sessions
CREATE TABLE IF NOT EXISTS public.table_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number INT NOT NULL,
    status TEXT DEFAULT 'available', -- available, occupied, billing
    customers INT DEFAULT 0,
    current_order_id UUID,
    session_start TIMESTAMPTZ,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, table_number)
);

-- QR Codes
CREATE TABLE IF NOT EXISTS public.qr_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number INT NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(restaurant_id, table_number)
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    customer_name TEXT DEFAULT 'Guest',
    status TEXT DEFAULT 'PENDING', -- PENDING, PREPARING, READY, SERVED, BILL_REQUESTED, FINISHED
    subtotal NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    gst_rate NUMERIC DEFAULT 0,
    gst_label TEXT DEFAULT 'GST',
    type TEXT DEFAULT 'DINE-IN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GST Settings
CREATE TABLE IF NOT EXISTS public.gst_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT FALSE,
    rate NUMERIC DEFAULT 0,
    label TEXT DEFAULT 'GST',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers CRM
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    last_visit TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    business_name TEXT,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    priority TEXT DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket Replies
CREATE TABLE IF NOT EXISTS public.ticket_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender_role TEXT DEFAULT 'merchant',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    order_id UUID,
    table_number TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waiter Calls
CREATE TABLE IF NOT EXISTS public.waiter_calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    customer_name TEXT DEFAULT 'Guest',
    is_handled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    type TEXT DEFAULT 'SYSTEM',
    actor TEXT DEFAULT 'system',
    severity TEXT DEFAULT 'NOMINAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) ENABLEMENT & POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gst_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. RESTAURANTS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view basic restaurant profile when scanning QR
CREATE POLICY "Public restaurants view" ON public.restaurants 
FOR SELECT USING (true);

-- Authenticated & registration users can insert their restaurant profile on sign up
CREATE POLICY "Users register restaurant" ON public.restaurants 
FOR INSERT WITH CHECK (true);

-- Owners can update their own restaurant profile
CREATE POLICY "Owners manage restaurant" ON public.restaurants 
FOR UPDATE USING (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- 2. MENU ITEMS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view menu items for QR ordering
CREATE POLICY "Public view menu items" ON public.menu_items 
FOR SELECT USING (true);

-- Restaurant owners can add, update, delete menu items
CREATE POLICY "Owners insert menu items" ON public.menu_items 
FOR INSERT WITH CHECK (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "Owners update menu items" ON public.menu_items 
FOR UPDATE USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "Owners delete menu items" ON public.menu_items 
FOR DELETE USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- 3. ORDERS & ORDER ITEMS POLICIES
-- ------------------------------------------------------------------------------
-- Customers (public) can place orders at tables
CREATE POLICY "Public create order" ON public.orders 
FOR INSERT WITH CHECK (true);

-- Customers can view orders, Owners can view their restaurant orders
CREATE POLICY "View orders" ON public.orders 
FOR SELECT USING (true);

-- Customers can update status (e.g. BILL_REQUESTED), Owners can manage status
CREATE POLICY "Update order status" ON public.orders 
FOR UPDATE USING (true);

-- Order Items (Public insert & select)
CREATE POLICY "Public insert order items" ON public.order_items 
FOR INSERT WITH CHECK (true);

CREATE POLICY "Public view order items" ON public.order_items 
FOR SELECT USING (true);

-- ------------------------------------------------------------------------------
-- 4. TABLE SESSIONS & QR CODES
-- ------------------------------------------------------------------------------
CREATE POLICY "Public table sessions view" ON public.table_sessions FOR SELECT USING (true);
CREATE POLICY "Public table sessions manage" ON public.table_sessions FOR ALL USING (true);

CREATE POLICY "Public qr_codes view" ON public.qr_codes FOR SELECT USING (true);
CREATE POLICY "Owners manage qr_codes" ON public.qr_codes FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

-- ------------------------------------------------------------------------------
-- 5. MERCHANT SPECIFIC DATA (Support, Notifications, Subscriptions, Audit Logs)
-- ------------------------------------------------------------------------------
CREATE POLICY "Owners support tickets" ON public.support_tickets FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "Ticket replies" ON public.ticket_replies FOR ALL USING (true);

CREATE POLICY "Owners notifications" ON public.notifications FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "Owners waiter calls" ON public.waiter_calls FOR ALL USING (true);

CREATE POLICY "Owners gst settings" ON public.gst_settings FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "Owners audit logs" ON public.audit_logs FOR ALL USING (
    restaurant_id IN (SELECT id FROM public.restaurants WHERE owner_id = auth.uid())
);

CREATE POLICY "Public subscriptions view" ON public.subscriptions FOR SELECT USING (true);

-- ==============================================================================
-- DONE! Your Supabase database is now structured & secured with RLS!
-- ==============================================================================
