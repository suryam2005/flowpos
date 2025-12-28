# Design Document: Interactive App Tour

## Overview

This design document describes the architecture for an enhanced interactive app tour system for FlowPOS. The system transforms the existing passive tour overlay into an interactive learning experience where users can perform actual actions during the tour, with automatic progression based on action completion.

The tour covers five main screens: POS (interactive), Manage with Products and Inventory tabs (interactive), Orders (informational), Analytics (informational), and Advanced Analytics (informational).

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
  actionTarget?: string;  // Component identifier for action detection
  hintText?: string;      // Shown after timeout
}

interface InteractiveTourOverlayProps {
  visible: boolean;
  currentStep: TourStep;
  totalSteps: number;
  stepIndex: number;
  onNext: () => void;
  onSkip: () => void;        // Skip current screen tour
  onSkipAll: () => void;     // Skip all tours
  onSkipStep: () => void;    // Skip just this step
  onActionComplete: () => void;
  showHint: boolean;
  showSkipStep: boolean;     // Show after 10s on interactive steps
}
```

### 2. ActionDetector Service

Service that listens for user actions and determines when tour step requirements are met.

```javascript
// ActionDetectorService.js
interface ActionConfig {
  type: 'tap' | 'long-press' | 'swipe' | 'text-input' | 'navigation';
  target: string;
  validator?: (event: any) => boolean;
}

class ActionDetectorService {
  registerAction(stepId: string, config: ActionConfig): void;
  unregisterAction(stepId: string): void;
  onActionDetected(callback: (stepId: string) => void): void;
  
  // Specific detectors
  detectCartItemAdded(callback: () => void): void;
  detectQuantityChanged(callback: () => void): void;
  detectItemRemoved(callback: () => void): void;
  detectModalOpened(callback: () => void): void;
  detectTextEntered(fieldId: string, callback: () => void): void;
  detectNavigation(screenName: string, callback: () => void): void;
}
```

### 3. TourProgressManager

Handles persistence and resume functionality.

```javascript
// TourProgressManager.js
interface TourProgress {
  currentScreen: string;
  currentStepIndex: number;
  completedScreens: string[];
  skippedAll: boolean;
  lastUpdated: number;
}

class TourProgressManager {
  async saveProgress(progress: TourProgress): Promise<void>;
  async loadProgress(): Promise<TourProgress | null>;
  async markScreenComplete(screenName: string): Promise<void>;
  async markAllComplete(): Promise<void>;
  async resetAllProgress(): Promise<void>;
  async isScreenComplete(screenName: string): Promise<boolean>;
}
```

### 4. TourContentRegistry

Central registry for all tour content and configurations.

```javascript
// TourContentRegistry.js
const TOUR_FLOWS = {
  POS: {
    interactive: true,
    steps: [
      {
        id: 'pos-welcome',
        title: '🏪 Welcome to POS',
        text: 'This is your main sales screen where you process customer orders.',
        highlightBox: 'POS_HEADER',
        cardPosition: 'bottom',
        interactive: false
      },
      {
        id: 'pos-add-product',
        title: '👆 Add a Product',
        text: 'TAP any product to add it to your cart.',
        highlightBox: 'POS_FIRST_PRODUCT',
        cardPosition: 'bottom',
        interactive: true,
        actionType: 'tap',
        actionTarget: 'product-card',
        hintText: 'Tap on any product card to add it to your cart'
      },
      // ... more steps
    ]
  },
  
  ManageProducts: {
    interactive: true,
    steps: [/* ... */]
  },
  
  ManageInventory: {
    interactive: true,
    steps: [/* ... */]
  },
  
  Orders: {
    interactive: false,
    steps: [/* informational only */]
  },
  
  Analytics: {
    interactive: false,
    steps: [/* informational only */]
  },
  
  AdvancedAnalytics: {
    interactive: false,
    steps: [/* informational only */]
  }
};
```

### 5. useInteractiveTour Hook

Enhanced hook that manages tour state and action detection.

```javascript
// useInteractiveTour.js
interface UseInteractiveTourReturn {
  showTour: boolean;
  currentStep: TourStep | null;
  stepIndex: number;
  totalSteps: number;
  showHint: boolean;
  showSkipStep: boolean;
  
  startTour: () => void;
  nextStep: () => void;
  skipScreen: () => void;
  skipAll: () => void;
  skipStep: () => void;
  completeTour: () => void;
  
  // Action detection registration
  registerActionTarget: (targetId: string, ref: React.RefObject) => void;
  notifyAction: (actionType: string, targetId: string) => void;
}

function useInteractiveTour(screenName: string): UseInteractiveTourReturn;
```

## Data Models

### Tour Step Configuration

```javascript
interface TourStepConfig {
  id: string;
  title: string;
  text: string;
  highlightBox: string;        // Key in position registry
  cardPosition: 'top' | 'bottom';
  interactive: boolean;
  actionType?: ActionType;
  actionTarget?: string;
  hintText?: string;
  successMessage?: string;
  demoValues?: Record<string, any>;  // Pre-fill values for forms
}

type ActionType = 'tap' | 'long-press' | 'swipe' | 'text-input' | 'navigation' | 'tab-change' | 'modal-open' | 'modal-close';
```

### Tour Progress State

```javascript
interface TourProgressState {
  // Per-screen completion
  completedScreens: {
    POS: boolean;
    ManageProducts: boolean;
    ManageInventory: boolean;
    Orders: boolean;
    Analytics: boolean;
    AdvancedAnalytics: boolean;
  };
  
  // Current position (for resume)
  currentScreen: string | null;
  currentStepIndex: number;
  
  // Global flags
  hasSeenTour: boolean;
  skippedAll: boolean;
  
  // Timestamps
  startedAt: number | null;
  completedAt: number | null;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Touch Handling Based on Step Interactivity

*For any* tour step, if the step is marked as interactive, touch events within the highlight zone SHALL pass through to the underlying UI; if the step is non-interactive, all touch events SHALL be blocked.

**Validates: Requirements 1.1, 1.3**

### Property 2: Interactive vs Non-Interactive Style Differentiation

*For any* tour step, the highlight style applied SHALL differ based on whether the step is interactive (pulsing border, pointer icon) or non-interactive (static border, no pointer).

**Validates: Requirements 1.4, 10.1, 10.3**

### Property 3: Action Detection Triggers Auto-Advance

*For any* interactive tour step, when the required action is completed, the tour SHALL automatically advance to the next step within 800ms (500ms detection + 300ms animation).

**Validates: Requirements 2.1, 2.2**

### Property 4: Informational Tours Have No Interactive Steps

*For any* tour flow marked as informational (Orders, Analytics, Advanced Analytics), all steps in that flow SHALL have `interactive: false`.

**Validates: Requirements 6.3, 7.3, 8.3**

### Property 5: Tour Completion Marking

*For any* screen tour, when the final step is completed or skipped, the tour progress manager SHALL mark that specific screen as complete in persistent storage.

**Validates: Requirements 3.2, 5.2, 6.2, 7.2, 8.2**

### Property 6: Skip Button Presence

*For any* tour step regardless of screen or interactivity, both "Skip" (current screen) and "Skip All" buttons SHALL be visible and functional.

**Validates: Requirements 11.1, 11.2**

### Property 7: Skip Behavior Scope

*For any* skip action, if "Skip" is pressed, only the current screen's tour SHALL be marked complete; if "Skip All" is pressed, all screen tours SHALL be marked complete.

**Validates: Requirements 11.3, 11.4**

### Property 8: Progress Persistence Round-Trip

*For any* tour progress state, saving to AsyncStorage and then loading SHALL produce an equivalent state object.

**Validates: Requirements 9.1, 9.2**

### Property 9: Separate Screen Tracking

*For any* combination of screen tour completions, each screen's completion status SHALL be tracked independently and not affect other screens' status.

**Validates: Requirements 9.5**

### Property 10: Hint Display After Timeout

*For any* interactive step where the user has not completed the required action, after 30 seconds the hint message SHALL be displayed.

**Validates: Requirements 2.3**

## Error Handling

### Touch Event Errors
- If touch detection fails, fall back to manual "Next" button
- Log touch errors for debugging but don't crash the tour

### Action Detection Failures
- If action detection times out, show hint and enable "Skip This Step"
- If action detector throws, gracefully degrade to manual progression

### Storage Errors
- If AsyncStorage fails to save, continue tour but log warning
- If AsyncStorage fails to load, start tour from beginning

### Navigation Errors
- If screen navigation fails during tour transition, pause tour and show error
- Allow user to manually navigate and resume

## Testing Strategy

### Unit Tests
- Test TourProgressManager save/load operations
- Test ActionDetectorService action matching logic
- Test TourContentRegistry step configurations
- Test highlight position calculations

### Property-Based Tests
- Property 1: Touch handling based on interactivity
- Property 4: Informational tours have no interactive steps
- Property 6: Skip buttons always present
- Property 7: Skip behavior scope
- Property 8: Progress persistence round-trip
- Property 9: Separate screen tracking

### Integration Tests
- Test complete POS tour flow with mocked actions
- Test Manage tour flow with tab switching
- Test skip functionality across screens
- Test resume from interrupted tour

### Manual Testing
- Verify touch-through works on actual device
- Verify animations are smooth and timing is correct
- Verify accessibility with screen reader
- Verify reduced motion setting is respected
