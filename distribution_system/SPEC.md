# Automating Seed and Equipment Distribution Tracking System

## Project Overview

**Project Name:** Distribution Tracking System
**Project Type:** Web Application (PHP + MySQL + PWA)
**Core Functionality:** A centralized platform for managing agricultural resource distribution, tracking farmer records, monitoring inventory, handling offline operations, scheduling reminders, and generating reports.
**Target Users:** Agricultural administrators, field staff, and farmers

---

## UI/UX Specification

### Layout Structure

**Pages:**
1. **Login/Register** - Authentication for admin and users
2. **Dashboard** - Overview with stats, quick actions, recent activities
3. **Farmers Management** - CRUD operations for farmer records
4. **Inventory Management** - Seed and equipment stock tracking
5. **Distribution** - Record distributions to farmers
6. **Schedules** - Manage distribution schedules and reminders
7. **Reports** - Analytics and report generation
8. **Settings** - System configuration

**Layout:**
- Fixed sidebar navigation (260px width on desktop, collapsible on mobile)
- Top header with user info, notifications, and offline status indicator
- Main content area with responsive grid
- Floating action buttons for quick add operations

**Responsive Breakpoints:**
- Mobile: < 768px (single column, hamburger menu)
- Tablet: 768px - 1024px (condensed sidebar)
- Desktop: > 1024px (full sidebar)

### Visual Design

**Color Palette:**
- Primary: `#2E7D32` (Forest Green - agriculture theme)
- Primary Light: `#4CAF50`
- Primary Dark: `#1B5E20`
- Secondary: `#FF8F00` (Amber - for alerts/actions)
- Accent: `#00897B` (Teal - for highlights)
- Background: `#F5F5F5`
- Surface: `#FFFFFF`
- Text Primary: `#212121`
- Text Secondary: `#757575`
- Error: `#D32F2F`
- Success: `#388E3C`
- Warning: `#F57C00`
- Offline Indicator: `#9E9E9E`

**Typography:**
- Font Family: 'Segoe UI', system-ui, sans-serif (for local/offline compatibility)
- Headings: 
  - H1: 28px, weight 600
  - H2: 24px, weight 600
  - H3: 20px, weight 500
  - H4: 16px, weight 500
- Body: 14px, weight 400
- Small: 12px, weight 400

**Spacing System:**
- Base unit: 8px
- Spacing scale: 4px, 8px, 16px, 24px, 32px, 48px

**Visual Effects:**
- Card shadows: `0 2px 8px rgba(0,0,0,0.1)`
- Hover shadows: `0 4px 16px rgba(0,0,0,0.15)`
- Border radius: 8px for cards, 4px for buttons/inputs
- Transitions: 200ms ease-in-out

### Components

**Navigation Sidebar:**
- Logo at top
- Icon + text menu items
- Active state: green background with white text
- Hover: light green background
- Collapsible on mobile with overlay

**Cards:**
- White background, subtle shadow
- 16px padding
- Section title with action buttons

**Data Tables:**
- Alternating row colors (white/#FAFAFA)
- Sortable headers
- Pagination controls
- Search/filter bar

**Forms:**
- Labels above inputs
- Input height: 40px
- Focus state: green border
- Validation states: red border + message

**Buttons:**
- Primary: Green background, white text
- Secondary: White background, green border
- Danger: Red background for delete actions
- Icon buttons for table actions

**Alerts/Notifications:**
- Toast notifications (top-right)
- Badge for counts
- Color-coded by type

**Offline Indicator:**
- Fixed bottom-right banner
- Gray when offline, green when online
- Pulse animation when syncing

---

## Functionality Specification

### Core Features

#### 1. Authentication & Authorization
- Login with username/password
- Role-based access: Admin, Staff, Farmer
- Session management
- Password reset functionality

#### 2. Farmer Management
- Add/Edit/Delete farmer records
- Fields: Name, Phone, Email, Address, Farm Location (GPS coordinates), Farm Size, Crop Type, Registration Date
- Search and filter by name, location, crop
- Bulk import/export (CSV)
- View distribution history per farmer

#### 3. Inventory Management
- **Seeds Inventory:**
  - Crop type, variety, quantity (kg), unit price, supplier
  - Low stock threshold per item
  - Expiry date tracking
  
- **Equipment Inventory:**
  - Equipment name, category, quantity, condition
  - Low stock threshold
  - Maintenance schedule

- Real-time stock levels display
- Automatic low stock alerts (visual + notification)
- Stock adjustment history

#### 4. Distribution Management
- Record distribution to farmers
- Fields: Farmer, Items (seeds/equipment), Quantity, Date, Season, Notes
- Auto-deduct from inventory
- Distribution receipt generation
- Search/filter distributions

#### 5. Offline Functionality (PWA)
- Service Worker for caching static assets
- IndexedDB for local data storage
- Queue pending operations when offline
- Sync indicator showing pending changes
- Auto-sync when connection restored
- Conflict resolution (server wins with notification)

#### 6. Schedule & Reminders
- Create distribution schedules
- Fields: Title, Date, Time, Location, Assigned Staff, Items
- Calendar view with month/week/day
- Reminder notifications:
  - Email (simulated with local storage)
  - In-app notifications
  - Browser notifications (if permitted)
- Recurring schedules support

#### 7. Reports & Analytics
- **Dashboard Stats:**
  - Total farmers
  - Total distributions this month
  - Low stock items count
  - Upcoming schedules

- **Distribution Reports:**
  - Daily/Weekly/Monthly/Yearly summaries
  - By crop type
  - By region/location
  - By farmer category

- **Inventory Reports:**
  - Current stock levels
  - Stock movement history
  - Low stock alerts

- **Export Options:**
  - Print-friendly view
  - Export to CSV
  - Export to PDF (using browser print)

### User Interactions and Flows

**Login Flow:**
1. Enter credentials → Validate → Redirect to Dashboard

**Add Farmer Flow:**
1. Click "Add Farmer" → Fill form → Validate → Save → Show success → Refresh list

**Record Distribution Flow:**
1. Select farmer → Select items → Enter quantities → Confirm → Deduct stock → Show receipt

**Offline Sync Flow:**
1. App detects offline → Show indicator → Queue operations locally
2. Connection restored → Sync queued data → Show sync status → Update UI

### Data Handling

**Database Tables:**
- users (id, username, password, role, created_at)
- farmers (id, name, phone, email, address, farm_location, farm_size, crop_type, created_at)
- seeds_inventory (id, crop_type, variety, quantity, unit, price, threshold, expiry_date, supplier, created_at)
- equipment_inventory (id, name, category, quantity, condition, threshold, created_at)
- distributions (id, farmer_id, items_json, total_quantity, distribution_date, season, notes, created_at)
- schedules (id, title, date, time, location, assigned_staff, items_json, status, created_at)
- stock_history (id, item_type, item_id, quantity_change, type, notes, created_at)
- sync_queue (id, operation, data_json, created_at)

**API Endpoints:**
- RESTful JSON API
- Authentication via JWT tokens (stored locally)

### Edge Cases
- Handle duplicate farmer entries (show warning)
- Validate quantities don't exceed available stock
- Handle sync conflicts gracefully
- Prevent past date selections for schedules
- Handle session expiry while offline
- Large data pagination (50 items per page)

---

## Acceptance Criteria

### Visual Checkpoints
- [ ] Login page displays with green theme
- [ ] Dashboard shows 4 stat cards + charts
- [ ] Sidebar navigation is functional and highlights active page
- [ ] Forms have proper validation feedback
- [ ] Tables are sortable and paginated
- [ ] Offline indicator appears when connection lost
- [ ] Mobile view has hamburger menu

### Functional Checkpoints
- [ ] User can login and see role-appropriate menu
- [ ] Add/Edit/Delete farmers works
- [ ] Inventory shows real-time stock levels
- [ ] Low stock items show warning indicator
- [ ] Distribution records deduct from inventory
- [ ] Schedules can be created and viewed in calendar
- [ ] Reports show correct aggregated data
- [ ] Offline mode queues operations
- [ ] Sync happens automatically when online
- [ ] Data exports to CSV work correctly