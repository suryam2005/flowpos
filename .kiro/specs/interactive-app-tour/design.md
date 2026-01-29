# Design Document: Interactive App Tour

## Overview

This design document describes the architecture for an enhanced interactive app tour system for FlowPOS. The system transforms the existing passive tour overlay into an interactive learning experience where users can perform actual actions during the tour, with automatic progression based on action completion.

The tour covers screens in this order: POS (interactive) → Cart (interactive) → Invoice Preview (wait for 10-sec display) → Analytics/Stats (informational) → Orders (informational) → Manage with Products and Inventory tabs (interactive).

## Architecture

The interactive tour system follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Tour Orchestrator                         │
│  (Manages tour flow, screen transitions, progress tracking)  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  InteractiveTour │  │   ActionDetector │                 │
│  │     Overlay      │  │     Service      │                 │
│  │                  │  │                  │                 │
│  │ - Touch-through  │  │ - Event listeners│                 │
│  │ - Highlight zone │  │ - Action matching│                 │
│  │ - Animations     │  │ - Completion CB  │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │   TourProgress   │  │   TourContent    │                 │
│  │     Manager      │  │    Registry      │                 │
│  │                  │  │                  │                 │
│  │ - AsyncStorage   │  │ - Screen flows   │                 │
│  │ - Resume logic   │  │ - Step configs   │                 │
│  │ - Skip handling  │  │ - Positions      │                 │
│  └──────────────────┘  └──────────────────┘                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Tour Flow Order

The unified tour follows this exact screen order:

1. **POS Screen** (Interactive) - Learn to add products, manage cart, complete order
2. **Cart Screen** (Interactive) - Complete the order with Complete Order button
3. **Invoice Preview** (Wait) - View invoice for 10 seconds (existing feature)
4. **Analytics/Stats Screen** (Informational) - View business metrics
5. **Orders Screen** (Informational) - View order history
6. **Manage Screen** (Interactive) - Products tab then Inventory tab

## Components and Interfaces

### 1. InteractiveTourOverlay Component

Enhanced version of the existing `ImprovedTourGuide` component with touch-through capability.

```javascript
// InteractiveTourOverlay.js
interface TourStep {
  id: string;
  title: string;
  text: string;
  highlightBox: HighlightPosition;
  cardPosition: 'top' | 'bottom';
  interactive: boolean;
  actionType?: 'tap' | 'long-press' | 'swipe' | 'text-input' | 'navigation';
  actionTarget?: string;
  hintText?: string;
  nextScreen?: string;
}

interface InteractiveTourOverlayProps {
  visible: boolean;
  currentStep: TourStep;
  totalSteps: number;
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;
  onSkipAll: () => void;
  onSkipStep: () => void;
  onActionComplete: () => void;
  showHint: boolean;
  showSkipStep: boolean;
}
```

### 2. ActionDetector Service

Service that listens for user actions and determines when tour step requirements are met.

```javascript
// ActionDetectorService.js
class ActionDetectorService {
  registerAction(stepId: string, config: ActionConfig): void;
  unregisterAction(stepId: string): void;
  onActionDetected(callback: (stepId: string) => void): void;
  
  detectCartItemAdded(callback: () => void): void;
  detectQuantityChanged(callback: () => void): void;
  detectItemRemoved(callback: () => void): void;
  detectOrderCompleted(callback: () => void): void;
  detectNavigation(screenName: string, callback: () => void): void;
}
```

### 3. TourProgressManager

Handles persistence and resume functionality for the unified tour flow.

```javascript
// TourProgressManager.js
interface TourProgress {
  currentScreen: string;
  currentStepIndex: number;
  completedScreens: string[];
  skippedAll: boolean;
  lastUpdated: number;
  tourFlowPosition: number;
}

class TourProgressManager {
  async saveProgress(progress: TourProgress): Promise<void>;
  async loadProgress(): Promise<TourProgress | null>;
  async markScreenComplete(screenName: string): Promise<void>;
  async markAllComplete(): Promise<void>;
  async resetAllProgress(): Promise<void>;
  async getTourFlowPosition(): Promise<number>;
  async setTourFlowPosition(position: number): Promise<void>;
}
```

### 4. TourContentRegistry

Central registry for all tour content and configurations.

```javascript
// TourContentRegistry.js
const TOUR_FLOW_ORDER = [
  'POS', 
  'Cart', 
  'InvoicePreview', 
  'Analytics', 
  'Orders', 
  'ManageProducts', 
  'ManageInventory'
];

const TOUR_FLOWS = {
  POS: {
    interactive: true,
    flowPosition: 0,
    steps: [
      // Welcome, add product, increase qty, remove, add back, cart summary, complete order
    ]
  },
  
  Cart: {
    interactive: true,
    flowPosition: 1,
    steps: [
      // Order details summary, Complete Order button
    ]
  },
  
  InvoicePreview: {
    interactive: false,
    flowPosition: 2,
    waitForExisting: true,
    steps: [
      // Wait for existing 10-sec display, then guide to Analytics
    ]
  },
  
  Analytics: {
    interactive: false,
    flowPosition: 3,
    steps: [
      // Welcome, metrics, time filter, advanced link
    ]
  },
  
  Orders: {
    interactive: false,
    flowPosition: 4,
    steps: [
      // Welcome, order list, order actions
    ]
  },
  
  ManageProducts: {
    interactive: true,
    flowPosition: 5,
    steps: [/* existing steps */]
  },
  
  ManageInventory: {
    interactive: true,
    flowPosition: 6,
    steps: [/* existing steps */]
  }
};
```

### 5. useInteractiveTour Hook

Enhanced hook that manages tour state with cross-screen flow support.

```javascript
// useInteractiveTour.js
function useInteractiveTour(screenName: string) {
  return {
    showTour,
    currentStep,
    stepIndex,
    totalSteps,
    showHint,
    showSkipStep,
    startTour,
    nextStep,
    skipScreen,
    skipAll,
    skipStep,
    completeTour,
    continueToNextScreen,
    getCurrentFlowPosition,
    registerActionTarget,
    notifyAction,
  };
}
```

## Data Models

### Tour Step Configuration

```javascript
interface TourStepConfig {
  id: string;
  title: string;
  text: string;
  highlightBox: string;
  cardPosition: 'top' | 'bottom';
  interactive: boolean;
  actionType?: ActionType;
  actionTarget?: string;
  hintText?: string;
  successMessage?: string;
  nextScreen?: string;
  waitDuration?: number;
  showNavigationHint?: boolean;
  navigationHintText?: string;
}
```

### Tour Progress State

```javascript
interface TourProgressState {
  tourFlowPosition: number;
  completedScreens: {
    POS: boolean;
    Cart: boolean;
    InvoicePreview: boolean;
    Analytics: boolean;
    Orders: boolean;
    ManageProducts: boolean;
    ManageInventory: boolean;
  };
  currentScreen: string | null;
  currentStepIndex: number;
  hasSeenTour: boolean;
  skippedAll: boolean;
  startedAt: number | null;
  completedAt: number | null;
}
```

### Highlight Position Registry (Key Updates)

```javascript
const getResponsivePositions = () => {
  return {
    // POS Screen - FIXED positions
    POS_CART_BAR: {
      // Must be positioned at actual cart bar location (bottom, above nav)
      // Use dynamic measurement from ref
    },
    POS_COMPLETE_BTN: {
      // Must be positioned at actual Complete Order button
      // Use dynamic measurement from ref
    },
    
    // Cart Screen positions (NEW)
    CART_ORDER_SUMMARY: { /* order details area */ },
    CART_COMPLETE_BTN: { /* Complete Order button */ },
    
    // Invoice Preview positions (NEW)
    INVOICE_CARD: { /* invoice card area */ },
    
    // ... existing positions ...
  };
};
```

## Correctness Properties

### Property 1: Touch Handling Based on Step Interactivity
Touch events within highlight zone pass through for interactive steps, blocked for non-interactive.
**Validates: Requirements 1.1, 1.3**

### Property 2: Interactive vs Non-Interactive Style Differentiation
Interactive steps have pulsing border and pointer icon; non-interactive have static style.
**Validates: Requirements 1.4, 10.1, 10.3**

### Property 3: Action Detection Triggers Auto-Advance
When required action is completed, tour advances within 800ms.
**Validates: Requirements 2.1, 2.2**

### Property 4: Informational Tours Have No Interactive Steps
Analytics, Orders, InvoicePreview tours have all steps with `interactive: false`.
**Validates: Requirements 3.2, 4.4, 5.4**

### Property 5: Tour Completion Marking
Each screen tour completion is marked in persistent storage.
**Validates: Requirements 3.1, 3.1.4, 4.3, 5.3, 6.2, 7.2**

### Property 6: Skip Button Presence
Skip and Skip All buttons visible on every tour step.
**Validates: Requirements 11.1, 11.2**

### Property 7: Skip Behavior Scope
Skip marks current screen complete; Skip All marks all screens complete.
**Validates: Requirements 11.3, 11.4**

### Property 8: Progress Persistence Round-Trip
Save/load produces equivalent state object.
**Validates: Requirements 9.1, 9.2**

### Property 9: Separate Screen Tracking
Each screen's completion tracked independently.
**Validates: Requirements 9.5**

### Property 10: Hint Display After Timeout
Hint shown after 30 seconds of inactivity on interactive steps.
**Validates: Requirements 2.3**

### Property 11: Cross-Screen Tour Flow Order
Screens visited in order: POS → Cart → InvoicePreview → Analytics → Orders → Manage.
**Validates: Requirements 8.3**

### Property 12: Invoice Preview Wait Integration
Tour waits for existing 10-second display feature with countdown.
**Validates: Requirements 3.2.1, 3.2.2, 3.2.3**

### Property 13: Correct Highlight Positioning
Positions calculated dynamically from component measurements.
**Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

## Error Handling

- Touch detection failures: fall back to manual Next button
- Action detection timeouts: show hint and enable Skip This Step
- Storage errors: continue tour, log warning
- Navigation errors: pause tour, allow manual navigation and resume
- Cross-screen flow errors: offer to resume from current position

## Testing Strategy

### Unit Tests
- TourProgressManager save/load operations
- ActionDetectorService action matching
- TourContentRegistry step configurations
- Highlight position calculations

### Integration Tests
- Complete POS → Cart → InvoicePreview → Analytics → Orders → Manage flow
- Skip functionality across screens
- Resume from interrupted tour
- Invoice Preview 10-sec wait integration

### Manual Testing
- Touch-through on actual device
- Animation smoothness and timing
- Accessibility with screen reader
- Cart screen tour only allows Complete Order button
- Invoice Preview waits for existing 10-sec feature
- Highlight positions correct on POS cart bar and Complete Order button
