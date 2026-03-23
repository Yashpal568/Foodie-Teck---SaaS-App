import {
  Zap,
  UtensilsCrossed,
  ShoppingCart,
  BarChart3,
  Users,
  LayoutGrid,
  Settings
} from 'lucide-react'

export const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    color: 'amber',
    articles: [
      {
        id: 'introduction',
        title: 'Introduction to Servora',
        content: `Servora is a comprehensive restaurant management platform designed to simplify your operations. From managing menus and processing orders to tracking analytics and managing customer relationships, Servora provides everything you need in one unified dashboard.`,
        features: [
          'Real-time order management with live status updates',
          'QR code-based digital menu for contactless ordering',
          'Comprehensive analytics dashboard with revenue tracking',
          'Customer relationship management (CRM) with loyalty features',
          'Table session tracking and floor management',
          'Multi-device responsive design for desktop and mobile'
        ]
      },
      {
        id: 'quick-setup',
        title: 'Quick Setup Guide',
        content: `Get your restaurant up and running with Servora in just a few simple steps. This guide will walk you through the essential configuration needed to start accepting digital orders.`,
        steps: [
          { title: 'Create Your Account', desc: 'Sign up for Servora and complete your restaurant profile with business details, address, and operating hours.' },
          { title: 'Set Up Your Menu', desc: 'Navigate to Menu Management and add your dishes with names, descriptions, prices, categories, and photos.' },
          { title: 'Generate QR Codes', desc: 'Go to QR Codes section, enter your table count, and generate unique QR codes for each table.' },
          { title: 'Print & Place QR Codes', desc: 'Download and print the QR codes. Place them on each table for customers to scan.' },
          { title: 'Start Receiving Orders', desc: 'Customers scan the QR code, browse your menu, and place orders directly from their phones.' }
        ]
      },
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        content: `The main dashboard is your command center. It provides a real-time snapshot of your restaurant's performance including active orders, table occupancy, and daily revenue metrics.`,
        sections: [
          { title: 'Overview Cards', desc: 'Quick glance at key metrics — total revenue, active orders, occupied tables, and total customers. All data updates in real-time.' },
          { title: 'Table Status Grid', desc: 'Visual representation of all your tables showing their current status (available, occupied, billing) with color-coded indicators.' },
          { title: 'Recent Orders', desc: 'Live feed of the latest orders showing customer details, items ordered, total amount, and current status.' },
          { title: 'Quick Actions', desc: 'One-click buttons to navigate to Orders, Analytics, and other frequently used sections.' }
        ]
      }
    ]
  },
  {
    id: 'menu-management',
    title: 'Menu Management',
    icon: UtensilsCrossed,
    color: 'blue',
    articles: [
      {
        id: 'managing-items',
        title: 'Managing Menu Items',
        content: `The Menu Management section allows you to create, edit, and organize your restaurant's digital menu. Changes are reflected instantly on the customer-facing menu.`,
        sections: [
          { title: 'Adding Items', desc: 'Click "Add Item" to create a new menu item. Fill in the name, description, price, and category. You can also upload a photo for visual appeal.' },
          { title: 'Editing Items', desc: 'Click any existing item to modify its details. Changes save automatically and update the customer menu in real-time.' },
          { title: 'Item Availability', desc: 'Toggle items on/off to temporarily remove them from the menu without deleting them. Perfect for out-of-stock items.' },
          { title: 'Bulk Actions', desc: 'Select multiple items to perform bulk operations like category changes, price adjustments, or availability toggles.' }
        ]
      },
      {
        id: 'categories',
        title: 'Managing Categories',
        content: `Categories help organize your menu into logical sections that customers can easily browse. Create categories like Starters, Main Course, Desserts, Beverages, etc.`,
        tips: [
          'Keep category names short and descriptive for easy scanning',
          'Order categories in the sequence customers naturally browse — appetizers first, desserts last',
          'Use a maximum of 8-10 categories to avoid overwhelming customers',
          'Consider seasonal categories for special menus (e.g., "Summer Specials")'
        ]
      },
      {
        id: 'menu-analytics',
        title: 'Menu Performance Analytics',
        content: `Track how your menu items perform over time. The Menu Analytics panel shows you which items are most popular, which generate the highest revenue, and which might need refreshing.`,
        sections: [
          { title: 'Top Sellers', desc: 'View your best-selling items ranked by order frequency. Use this to ensure popular items are always in stock.' },
          { title: 'Revenue Breakdown', desc: 'See which items contribute most to your revenue. Helps identify high-value items for promotion.' },
          { title: 'Category Performance', desc: 'Compare how different menu categories perform against each other in terms of orders and revenue.' }
        ]
      }
    ]
  },
  {
    id: 'orders',
    title: 'Order Management',
    icon: ShoppingCart,
    color: 'emerald',
    articles: [
      {
        id: 'order-workflow',
        title: 'Order Workflow',
        content: `Orders in Servora follow a structured workflow that keeps both your kitchen and customers informed. Each order progresses through defined statuses.`,
        steps: [
          { title: 'PENDING', desc: 'A new order has been placed by the customer. Review and accept it to begin preparation.' },
          { title: 'PREPARING', desc: 'The kitchen is actively working on the order. The customer sees a "Preparing" status on their device.' },
          { title: 'READY', desc: 'The order is ready for pickup or serving. Staff can now deliver the food to the table.' },
          { title: 'SERVED', desc: 'The food has been delivered to the customer\'s table. The order is awaiting completion.' },
          { title: 'FINISHED', desc: 'The order is complete. Payment has been processed and the table session can be closed.' }
        ]
      },
      {
        id: 'kitchen-operations',
        title: 'Kitchen Operations',
        content: `Kitchen staff guide to processing orders efficiently, managing preparation times, and coordinating with front-of-house operations.`,
        steps: [
          { title: 'Order Display', desc: 'How new orders appear in the kitchen display system with priority indicators.' },
          { title: 'Preparation Timer', desc: 'Built-in timers to track preparation time for each order item.' },
          { title: 'Quality Control', desc: 'Standards for maintaining food quality and presentation consistency.' }
        ]
      }
    ]
  },
  {
    id: 'analytics',
    title: 'Analytics & Reports',
    icon: BarChart3,
    color: 'purple',
    articles: [
      {
        id: 'dashboard-analytics',
        title: 'Dashboard Analytics',
        content: `Comprehensive overview of your restaurant's performance with real-time metrics, revenue tracking, and customer insights.`,
        sections: [
          { title: 'Revenue Metrics', desc: 'Track daily, weekly, and monthly revenue with detailed breakdowns by category and time periods.' },
          { title: 'Customer Analytics', desc: 'Understand customer behavior, order patterns, and preferences to optimize service.' },
          { title: 'Performance Reports', desc: 'Generate detailed reports on table turnover, order completion times, and staff efficiency.' }
        ]
      },
      {
        id: 'custom-reports',
        title: 'Custom Reports',
        content: `Create custom reports tailored to your specific business needs with flexible filtering and export options.`,
        sections: [
          { title: 'Report Builder', desc: 'Drag-and-drop interface to create custom reports with selected metrics and dimensions.' },
          { title: 'Data Export', desc: 'Export reports in multiple formats including PDF, Excel, and CSV for external analysis.' },
          { title: 'Scheduled Reports', desc: 'Automate report generation and delivery to your email on a set schedule.' }
        ]
      }
    ]
  },
  {
    id: 'customer-management',
    title: 'Customer Management',
    icon: Users,
    color: 'indigo',
    articles: [
      {
        id: 'customer-overview',
        title: 'Customer Overview',
        content: `Complete guide to managing customer relationships, loyalty programs, and communication strategies for long-term business growth.`,
        sections: [
          { title: 'Customer Database', desc: 'Maintain comprehensive customer profiles with order history, preferences, and contact information.' },
          { title: 'Loyalty Programs', desc: 'Set up and manage reward systems to encourage repeat business and increase customer lifetime value.' },
          { title: 'Communication Tools', desc: 'Use built-in messaging and notification systems to keep customers engaged and informed.' }
        ]
      }
    ]
  },
  {
    id: 'table-management',
    title: 'Table Management',
    icon: LayoutGrid,
    color: 'emerald',
    articles: [
      {
        id: 'table-overview',
        title: 'Table Overview',
        content: `Learn how to manage restaurant tables, track occupancy, and optimize seating arrangements for maximum efficiency.`,
        sections: [
          { title: 'Table Status Tracking', desc: 'Real-time table status updates including available, occupied, reserved, and maintenance states.' },
          { title: 'Floor Management', desc: 'Visual floor plan designer to arrange tables and optimize seating capacity.' },
          { title: 'Turnover Analytics', desc: 'Track table turnover rates, peak hours, and occupancy patterns for better staffing.' }
        ]
      },
      {
        id: 'reservations',
        title: 'Reservations',
        content: `Complete reservation system with booking management, waitlist handling, and customer notification features.`,
        steps: [
          { title: 'Booking Management', desc: 'Accept, modify, and cancel reservations with an intuitive calendar interface.' },
          { title: 'Waitlist Operations', desc: 'Manage customer waitlist and automatically notify when tables become available.' },
          { title: 'Reservation Policies', desc: 'Set booking rules, deposit requirements, and cancellation policies.' }
        ]
      }
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    color: 'slate',
    articles: [
      {
        id: 'general-settings',
        title: 'General Settings',
        content: `Configure basic restaurant information, business hours, and operational preferences for your Servora account.`,
        sections: [
          { title: 'Restaurant Profile', desc: 'Update restaurant name, cuisine type, contact information, and business details.' },
          { title: 'Operating Hours', desc: 'Set custom hours for different days, holidays, and special operating periods.' },
          { title: 'Location Settings', desc: 'Manage multiple locations, delivery zones, and service areas.' }
        ]
      },
      {
        id: 'payment-settings',
        title: 'Payment Settings',
        content: `Configure payment methods, processing fees, and financial settings for seamless transaction handling.`,
        sections: [
          { title: 'Payment Methods', desc: 'Enable cash, card, digital wallet, and online payment options.' },
          { title: 'Tax Configuration', desc: 'Set up tax rates, automatic calculations, and compliance settings.' },
          { title: 'Billing Settings', desc: 'Configure subscription plans, invoicing, and financial reporting preferences.' }
        ]
      }
    ]
  }
]

export const allArticles = docSections.flatMap(section => 
  section.articles.map(article => ({ ...article, sectionId: section.id, sectionTitle: section.title, icon: section.icon, color: section.color }))
)
