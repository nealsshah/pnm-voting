# 🏛️ PNM Voting Platform

**A comprehensive fraternity/sorority recruitment management system built for the modern era.**

[![Next.js](https://img.shields.io/badge/Next.js-15.1.6-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Powered-green)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue)](https://www.typescriptlang.org)

## 🌟 Overview

The PNM (Potential New Member) Voting Platform is a sophisticated, real-time recruitment management system designed specifically for Greek life organizations. It streamlines the entire recruitment process from candidate evaluation to final selection, providing powerful tools for both administrators and active members.

## ✨ Key Features

### 🗳️ **Advanced Voting System**
- **Star Rating System**: 1-5 star ratings with detailed scoring breakdowns
- **Round-Based Voting**: Automated voting cycles tied to recruitment events
- **Bayesian Statistics**: Sophisticated statistical analysis for fair candidate evaluation
- **Vote Analytics**: Comprehensive statistics with privacy controls
- **Real-time Updates**: Instant vote synchronization across all users

### 💬 **Comprehensive Comments System**
- **Anonymous Posting**: Optional anonymous feedback for honest evaluations
- **Real-time Comments**: Live comment updates with Supabase Realtime
- **Comment Moderation**: Admin tools for content management and oversight
- **Comment Replies**: Threaded discussions for detailed feedback
- **Like System**: Community-driven comment validation

### 📅 **Event & Round Management**
- **Automatic Round Creation**: Rounds auto-created for each recruitment event
- **Smart Scheduling**: Rounds open/close automatically based on event timing
- **Manual Overrides**: Admin controls for emergency round management
- **Status Tracking**: Visual indicators for round states (pending/open/closed)
- **Event Reordering**: Drag-and-drop event management interface

### 📊 **Attendance Tracking**
- **Event Attendance**: Track PNM participation at recruitment events
- **CSV Uploads**: Bulk attendance import via CSV files
- **Attendance Analytics**: Detailed attendance reporting and statistics
- **Multi-Event Support**: Support for various recruitment event types

### 🖼️ **Photo Management & Gallery**
- **PNM Photo Uploads**: Drag-and-drop photo management system
- **Gallery View**: Beautiful photo gallery with sorting and filtering
- **Supabase Storage**: Secure, scalable photo storage solution
- **Mobile Optimization**: Touch-friendly gallery navigation

### ⚡ **Real-time Features**
- **Live Updates**: Instant UI refreshes when data changes
- **Supabase Realtime**: WebSocket-powered real-time synchronization
- **Cache Management**: Smart caching for optimal performance
- **Offline Support**: Graceful handling of connectivity issues

## 🎯 User Roles & Permissions

### 👑 **Administrators**
- Full platform management and oversight
- User approval and role management
- PNM data management (add/edit/delete)
- Event and round management
- Settings configuration
- Comment moderation tools
- Statistics publishing controls

### 🤝 **Brothers (Active Members)**
- Vote on PNMs during open rounds
- Submit and edit comments
- View candidate profiles and statistics
- Access gallery and attendance data
- Real-time collaboration features

### ⏳ **Pending Users**
- Limited access until admin approval
- Account verification workflow
- Role assignment by administrators

## 🚀 Technology Stack

### **Frontend**
- **Next.js 15.1.6**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Framer Motion**: Smooth animations and transitions
- **React Query**: Efficient data fetching and caching

### **Backend & Database**
- **Supabase**: PostgreSQL database with real-time features
- **Row Level Security (RLS)**: Fine-grained access control
- **Supabase Auth**: Authentication and user management
- **Supabase Storage**: File storage for photos
- **Edge Functions**: Serverless functions for automation

### **Key Libraries**
- **Lucide React**: Beautiful, customizable icons
- **React Dropzone**: File upload components
- **CSV Parser**: Data import/export functionality
- **Date-fns**: Date manipulation utilities
- **Recharts**: Data visualization and charts

## 🏗️ Architecture Highlights

### **Database Design**
- **Normalized Schema**: Efficient relational database structure
- **UUID Primary Keys**: Secure, distributed-friendly identifiers
- **Automated Triggers**: Database-level automation for data consistency
- **Performance Indexes**: Optimized queries for large datasets

### **Security Features**
- **Row Level Security**: Database-level access control
- **Role-based Permissions**: Granular user access management
- **Secure Authentication**: Supabase Auth integration
- **Data Validation**: Client and server-side input validation

### **Performance Optimizations**
- **Caching Strategy**: Multi-layer caching for optimal speed
- **Real-time Subscriptions**: Efficient WebSocket connections
- **Lazy Loading**: On-demand component and data loading
- **Mobile Optimization**: Touch-friendly responsive design

## 📱 Mobile Experience

The platform is fully optimized for mobile devices with:
- **Touch Navigation**: Swipe gestures and mobile-first interactions
- **Responsive Design**: Adaptive layouts for all screen sizes
- **Fixed Action Bars**: Persistent navigation on mobile
- **Touch Targets**: Appropriately sized interactive elements

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Supabase account and project
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/pnm-voting.git
   cd pnm-voting
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Configure your Supabase URL and keys
   ```

4. **Run database migrations**
   ```bash
   npm run supabase:start
   # Apply migrations in the migrations/ folder
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Initial Setup

1. **Create your first admin user** through the Supabase dashboard
2. **Import PNM data** using the CSV template system
3. **Configure recruitment events** in the admin panel
4. **Set up attendance tracking** for your events
5. **Configure settings** for statistics visibility

## 📚 Core Workflows

### **PNM Data Management**
1. Download CSV template from admin dashboard
2. Fill template with PNM information (email, name, major, year, GPA)
3. Upload via dashboard - system handles duplicates automatically
4. Add photos using drag-and-drop interface
5. Real-time UI updates for all connected users

### **Voting Process**
1. Admins create recruitment events with start times
2. System automatically creates corresponding voting rounds
3. Rounds open/close based on event timing
4. Brothers vote 1-5 stars during open rounds
5. Statistics calculated using Bayesian analysis
6. Results published when configured by admins

### **Comments & Feedback**
1. Brothers submit comments (anonymous or attributed)
2. Real-time updates across all user sessions
3. Comments editable while round is active
4. Admin moderation tools for content management
5. Threaded replies for detailed discussions

## ⚙️ Admin Features

### **Dashboard Overview**
- PNM count and statistics
- Current round status
- Recent activity summaries
- Quick action buttons

### **User Management**
- Approve/deny new user registrations
- Bulk user operations
- Role assignment (admin/brother/pending)
- User activity monitoring

### **Settings Configuration**
- Statistics visibility controls
- DNI (Did Not Interact) round publishing
- System-wide feature toggles
- Privacy and access controls

### **Data Export**
- CSV export capabilities
- Attendance reports
- Voting statistics
- Comment summaries

## 🔐 Security & Privacy

- **Row Level Security**: Database-level access control
- **Role-based Access**: Granular permission system
- **Anonymous Comments**: Privacy-preserving feedback options
- **Data Encryption**: Secure data storage and transmission
- **Audit Trails**: Activity logging for accountability

## 🚀 Deployment

The application is optimized for deployment on:
- **Vercel** (recommended): Zero-config deployment
- **Netlify**: JAMstack-optimized hosting
- **Custom servers**: Docker-compatible setup

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for:
- Code style standards
- Pull request process
- Issue reporting
- Feature requests

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

Built with love for the Greek life community. Special thanks to:
- The Next.js team for the amazing framework
- Supabase for the powerful backend platform
- The open-source community for incredible tools

---

**Ready to modernize your recruitment process?** Get started today and experience the future of fraternity/sorority member selection! 🚀
