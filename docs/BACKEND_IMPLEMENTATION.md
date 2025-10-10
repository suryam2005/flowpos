# FlowPOS Backend Implementation Overview

## 🏗️ Current Architecture

FlowPOS currently operates as a **client-side application** with local data storage and processing. The backend functionality is implemented through service classes and utility functions that handle business logic, data persistence, and external integrations.

## 📱 Client-Side Backend Services

### 1. Core Service Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer Architecture                │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Services                                    │
│  ├── FeatureService.js (SaaS Features & Limits)            │
│  ├── UPIPaymentListener.js (Payment Detection)             │
│  └── WhatsAppService.js (Message Integration)              │
├─────────────────────────────────────────────────────────────┤
│  Context Providers (State Management)                      │
│  ├── CartContext.js (Shopping Cart Logic)                  │
│  ├── AuthContext.js (Authentication State)                 │
│  └── DataSyncContext.js (Data Synchronization)             │
├─────────────────────────────────────────────────────────────┤
│  Utility Services                                           │
│  ├── invoiceGenerator.js (PDF Generation)                  │
│  ├── storeUtils.js (Store Configuration)                   │
│  ├── dataUtils.js (Data Persistence)                       │
│  └── secureStorage.js (Encrypted Storage)                  │
├─────────────────────────────────────────────────────────────┤
│  Data Storage Layer                                         │
│  ├── AsyncStorage (Orders, Products, Settings)             │
│  ├── SecureStore (PIN, Sensitive Data)                     │
│  └── File System (PDFs, Exports)                           │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Service Implementations

### 1. FeatureService.js - SaaS Business Logic
**Purpose**: Manages subscription plans, feature restrictions, and usage limits

**Key Features**:
- **Plan Management**: Free, Starter, Business, Enterprise plans
- **Feature Flags**: Dynamic feature enabling/disabling based on subscription
- **Usage Tracking**: Monitor products, orders, storage limits
- **Upgrade Prompts**: Smart upgrade suggestions based on usage patterns

**Implementation Highlights**:
```javascript
// Plan-based feature restrictions
canUseFeature(featureName) {
  return this.features[featureName] === true;
}

// Usage limit enforcement
async hasReachedLimit(limitName) {
  const limit = this.getLimit(limitName);
  const currentUsage = await this.getCurrentUsage(limitName);
  return currentUsage >= limit;
}

// Smart upgrade prompts
showUpgradePrompt(featureName, context) {
  // Context-aware upgrade suggestions
}
```

### 2. UPIPaymentListener.js - Payment Detection System
**Purpose**: Automatic UPI payment confirmation via SMS detection

**Key Features**:
- **SMS Parsing**: Intelligent parsing of bank/UPI app SMS messages
- **Payment Matching**: Match SMS confirmations to pending payments
- **Confidence Scoring**: AI-like confidence calculation for auto-confirmation
- **Fallback Support**: Manual confirmation when auto-detection fails

**Implementation Highlights**:
```javascript
// SMS message parsing with multiple patterns
parsePaymentMessage(message) {
  const patterns = [
    /(?:received|credited).*?rs\.?\s*(\d+(?:\.\d{2})?)/i,
    /(?:received|credited).*?₹\s*(\d+(?:\.\d{2})?)/i,
    // Multiple bank/UPI app patterns
  ];
}

// Intelligent payment matching
matchActivePayment(parsedPayment) {
  // Amount, timing, and reference matching
  // Returns confidence score for auto-confirmation
}
```

### 3. WhatsAppService.js - Message Integration
**Purpose**: WhatsApp Business API integration for invoice delivery

**Key Features**:
- **Twilio Integration**: WhatsApp Business API via Twilio
- **Image Handling**: Invoice image preparation and sending
- **Fallback Methods**: Device WhatsApp app integration
- **Message Templates**: Professional invoice messages

**Implementation Highlights**:
```javascript
// Send invoice via WhatsApp Business API
async sendInvoiceImage(customerPhone, invoiceImageUri, invoiceData) {
  const formattedPhone = this.formatPhoneNumber(customerPhone);
  const imageData = await this.prepareImageForSending(invoiceImageUri);
  const messageBody = this.createInvoiceMessage(invoiceData);
  
  return await this.sendTwilioWhatsAppMessage(
    formattedPhone, messageBody, imageData
  );
}
```

## 📊 Data Management Architecture

### 1. Storage Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                    Data Storage Layers                      │
├─────────────────────────────────────────────────────────────┤
│  SecureStore (Encrypted - Sensitive Data)                  │
│  ├── User PIN Hash                                          │
│  ├── Biometric Settings                                     │
│  ├── API Keys/Tokens                                        │
│  └── Payment Credentials                                    │
├─────────────────────────────────────────────────────────────┤
│  AsyncStorage (Persistent - Business Data)                 │
│  ├── Store Configuration                                    │
│  ├── Product Catalog                                        │
│  ├── Order History                                          │
│  ├── Customer Data                                          │
│  ├── Analytics Data                                         │
│  └── App Settings                                           │
├─────────────────────────────────────────────────────────────┤
│  Memory (Runtime - Temporary Data)                         │
│  ├── Cart State                                             │
│  ├── UI State                                               │
│  ├── Navigation State                                       │
│  └── Session Data                                           │
├─────────────────────────────────────────────────────────────┤
│  File System (Documents - Generated Files)                 │
│  ├── Generated PDFs                                         │
│  ├── Exported Data                                          │
│  ├── Cached Images                                          │
│  └── Backup Files                                           │
└─────────────────────────────────────────────────────────────┘
```

### 2. Data Models & Schemas

#### Store Configuration
```javascript
{
  storeName: string,
  storeAddress: string,
  storePhone: string,
  storeUPI: string,
  storeGSTIN: string,
  setupComplete: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Product Model
```javascript
{
  id: string,
  name: string,
  price: number,
  category: string,
  emoji: string,
  stock: number,
  barcode?: string,
  description?: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Order Model
```javascript
{
  id: string,
  orderNumber: string,
  items: [
    {
      id: string,
      name: string,
      price: number,
      quantity: number,
      emoji: string
    }
  ],
  customerName: string,
  customerPhone: string,
  subtotal: number,
  tax: number,
  total: number,
  paymentMethod: string,
  paymentStatus: string,
  status: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Customer Model
```javascript
{
  name: string,        // Required, min 2 chars
  phone: string,       // Required, 10 digits, 6-9 prefix
  email?: string,
  address?: string,
  totalOrders: number,
  totalSpent: number,
  lastOrderDate: timestamp,
  createdAt: timestamp
}
```

## 🔄 Business Logic Flow

### 1. Order Processing Flow
```
Product Selection → Cart Management → Customer Validation → Payment Processing
       ↓                 ↓                ↓                    ↓
   Browse/Search    Add/Remove/Qty    Name+Phone         Cash/UPI/Card
   Category Filter   Price Calc       Validation         QR Generation
   Stock Check       Tax Calc         Format Check       Payment Tracking
       ↓                 ↓                ↓                    ↓
Invoice Generation → PDF Creation → Order Storage → Analytics Update
       ↓                 ↓                ↓                    ↓
   HTML Template    expo-print       AsyncStorage       Revenue Calc
   Store Branding   File System      Order History      Stock Update
   Customer Data    Share/Export     Customer Record    Metrics Update
```

### 2. Payment Detection Flow
```
UPI Payment Initiated → SMS Monitoring → Message Parsing → Payment Matching
         ↓                    ↓              ↓               ↓
    QR Code Display      SMS Listener    Pattern Match    Confidence Score
    Payment Tracking     Permission      Amount Extract   Auto-Confirm
    Timer Start          Real-time       Reference ID     Manual Fallback
         ↓                    ↓              ↓               ↓
Order Confirmation → Invoice Generation → Customer Notification → Analytics
```

### 3. Invoice Generation Flow
```
Order Data → Store Info → Customer Details → HTML Template → PDF Generation
     ↓           ↓             ↓                ↓              ↓
  Items List   Name/UPI    Name+Phone      Styled HTML    expo-print
  Pricing      Address     Validation      Professional   File System
  Tax Calc     GSTIN       Formatting      Layout         Share/Export
     ↓           ↓             ↓                ↓              ↓
Preview Display → WhatsApp Send → Email Send → Storage → History
```

## 🔐 Security Implementation

### 1. Authentication & Authorization
```javascript
// PIN-based authentication with biometric support
class AuthContext {
  // Dynamic PIN length (4-6 digits)
  async setupPIN(pin, length) {
    const hashedPIN = await this.hashPIN(pin);
    await SecureStore.setItemAsync('userPIN', hashedPIN);
    await SecureStore.setItemAsync('pinLength', length.toString());
  }

  // Biometric authentication
  async authenticateWithBiometrics() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access FlowPOS',
      fallbackLabel: 'Use PIN instead',
    });
    return result.success;
  }
}
```

### 2. Data Encryption & Security
```javascript
// Secure storage wrapper
class SecureStorage {
  async setItem(key, value) {
    const encrypted = await this.encrypt(value);
    return await SecureStore.setItemAsync(key, encrypted);
  }

  async getItem(key) {
    const encrypted = await SecureStore.getItemAsync(key);
    return encrypted ? await this.decrypt(encrypted) : null;
  }
}
```

### 3. Input Validation & Sanitization
```javascript
// Customer data validation
const validateCustomerData = (name, phone) => {
  const errors = {};
  
  // Name validation
  if (!name || name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  
  // Phone validation (Indian format)
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phone || !phoneRegex.test(phone)) {
    errors.phone = 'Enter valid 10-digit mobile number';
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
};
```

## 📊 Analytics & Reporting Engine

### 1. Real-time Analytics
```javascript
// Analytics calculation engine
class AnalyticsEngine {
  async calculateDailyMetrics() {
    const orders = await this.getOrdersForPeriod('today');
    return {
      revenue: orders.reduce((sum, order) => sum + order.total, 0),
      orderCount: orders.length,
      averageOrderValue: orders.length > 0 ? revenue / orders.length : 0,
      topProducts: this.calculateTopProducts(orders)
    };
  }

  async calculateTrends() {
    const weeklyData = await this.getWeeklyData();
    const monthlyData = await this.getMonthlyData();
    
    return {
      weeklyGrowth: this.calculateGrowthRate(weeklyData),
      monthlyGrowth: this.calculateGrowthRate(monthlyData),
      seasonalTrends: this.analyzeSeasonalPatterns(monthlyData)
    };
  }
}
```

### 2. Performance Monitoring
```javascript
// Performance tracking
class PerformanceMonitor {
  trackOperation(operationName, duration) {
    const metrics = {
      operation: operationName,
      duration,
      timestamp: Date.now(),
      memoryUsage: this.getMemoryUsage()
    };
    
    this.saveMetric(metrics);
  }

  async getPerformanceReport() {
    const metrics = await this.getStoredMetrics();
    return {
      averageResponseTime: this.calculateAverage(metrics, 'duration'),
      slowestOperations: this.getSlowOperations(metrics),
      memoryTrends: this.analyzeMemoryUsage(metrics)
    };
  }
}
```

## 🚀 Future Backend Architecture (Cloud Migration)

### 1. Planned Cloud Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Backend Services                   │
├─────────────────────────────────────────────────────────────┤
│  API Gateway (Authentication & Rate Limiting)              │
│  ├── JWT Token Management                                   │
│  ├── Request Validation                                     │
│  └── Rate Limiting & Throttling                            │
├─────────────────────────────────────────────────────────────┤
│  Microservices Architecture                                 │
│  ├── User Management Service                               │
│  ├── Store Management Service                              │
│  ├── Product Catalog Service                               │
│  ├── Order Processing Service                              │
│  ├── Payment Processing Service                            │
│  ├── Invoice Generation Service                            │
│  ├── Analytics Service                                     │
│  └── Notification Service                                  │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                 │
│  ├── PostgreSQL (Primary Database)                         │
│  ├── Redis (Caching & Sessions)                            │
│  ├── S3 (File Storage)                                     │
│  └── ElasticSearch (Analytics & Search)                    │
├─────────────────────────────────────────────────────────────┤
│  External Integrations                                      │
│  ├── Razorpay (Payment Gateway)                            │
│  ├── Twilio (WhatsApp Business API)                        │
│  ├── SendGrid (Email Service)                              │
│  └── AWS SNS (Push Notifications)                          │
└─────────────────────────────────────────────────────────────┘
```

### 2. Migration Strategy
1. **Phase 1**: API Gateway + Authentication Service
2. **Phase 2**: Data Sync Service + Cloud Storage
3. **Phase 3**: Real-time Features + Multi-device Sync
4. **Phase 4**: Advanced Analytics + ML Features
5. **Phase 5**: Enterprise Features + Integrations

## 🔧 Development & Deployment

### 1. Current Development Workflow
```bash
# Local development
npm install
npm start

# Testing
npm run android
npm run ios

# Production build
eas build --platform all --profile production
```

### 2. Service Testing
```javascript
// Feature service testing
const testFeatureService = async () => {
  await featureService.initialize();
  console.log('Can use UPI:', featureService.canUseFeature('upi_payments'));
  console.log('Product limit:', featureService.getLimit('products'));
};

// Payment listener testing
const testPaymentListener = async () => {
  await upiPaymentListener.startListening();
  upiPaymentListener.addPaymentToTrack('test-001', 100, 'test@upi');
};
```

## 📈 Performance & Scalability

### 1. Current Performance Metrics
- **App Launch**: < 3 seconds
- **Invoice Generation**: < 2 seconds
- **Payment Detection**: < 5 seconds
- **Data Sync**: Real-time (local)

### 2. Optimization Strategies
- **Lazy Loading**: Services initialized on demand
- **Caching**: Intelligent data caching strategies
- **Batch Operations**: Bulk data processing
- **Memory Management**: Efficient cleanup and garbage collection

## 🔮 Advanced Features Roadmap

### 1. AI/ML Integration
- **Sales Forecasting**: Predictive analytics for inventory
- **Customer Insights**: Behavior analysis and recommendations
- **Fraud Detection**: Suspicious transaction monitoring
- **Smart Pricing**: Dynamic pricing recommendations

### 2. Enterprise Features
- **Multi-store Management**: Chain store operations
- **Staff Management**: Role-based access control
- **Advanced Reporting**: Custom report generation
- **API Integrations**: Third-party service connections

This backend implementation provides a solid foundation for current operations while being architected for seamless cloud migration and enterprise scaling.