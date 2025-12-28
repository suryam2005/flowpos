# Requirements Document

## Introduction

This feature enhances the FlowPOS app tour system to provide an interactive, hands-on demonstration experience. Instead of passive informational overlays, users will be able to actually interact with the app during the tour, with the tour automatically advancing based on completed actions. This creates a more engaging onboarding experience that teaches users by doing rather than just reading.

The tour covers the following screens in order: POS → Cart (Order Details) → Invoice Preview → Analytics (Stats) → Orders → Manage (Products tab and Inventory tab).

## Glossary

- **Tour_System**: The component responsible for managing and displaying guided tours throughout the app
- **Tour_Step**: A single step in a tour sequence that highlights a UI element and provides instructions
- **Interactive_Step**: A tour step that allows user interaction with the highlighted area and detects action completion
- **Touch_Through**: The ability for user touches to pass through the tour overlay to interact with underlying UI elements
- **Action_Detector**: A mechanism that detects when a user has completed a required action during an interactive step
- **Demo_Flow**: A predefined sequence of interactive steps that guide users through a complete workflow
- **Highlight_Zone**: The area of the screen that is visually highlighted and optionally interactive during a tour step
- **Cross_Screen_Tour**: A tour flow that spans multiple screens with automatic continuation

## Requirements

### Requirement 1: Touch-Through Overlay System

**User Story:** As a new user, I want to interact with the app while the tour is active, so that I can learn by doing rather than just reading instructions.

#### Acceptance Criteria

1. WHEN an interactive tour step is displayed, THE Tour_System SHALL allow touch events to pass through to the Highlight_Zone
2. WHEN a user taps outside the Highlight_Zone during an interactive step, THE Tour_System SHALL block the touch and show a gentle reminder to interact with the highlighted area
3. WHILE a non-interactive tour step is displayed, THE Tour_System SHALL block all touch events on the underlying UI
4. THE Tour_System SHALL visually distinguish interactive steps from non-interactive steps using different highlight styles

### Requirement 2: Action Detection and Auto-Advance

**User Story:** As a new user, I want the tour to automatically advance when I complete an action, so that I don't have to manually click "Next" after each interaction.

#### Acceptance Criteria

1. WHEN a user completes the required action for an interactive step, THE Action_Detector SHALL detect the completion within 500ms
2. WHEN an action is detected as complete, THE Tour_System SHALL automatically advance to the next step after a brief celebration animation (300ms)
3. IF a user does not complete the required action within 30 seconds, THEN THE Tour_System SHALL show a hint message with more detailed instructions
4. THE Tour_System SHALL support detecting the following action types: tap, long-press, swipe, text-input, and navigation
5. WHEN an action is detected, THE Tour_System SHALL provide haptic feedback to confirm the action was recognized

### Requirement 3: POS Screen Demo Flow

**User Story:** As a new user, I want to be guided through a complete sales transaction, so that I understand how to use the POS system effectively.

#### Acceptance Criteria

1. THE Demo_Flow for POS SHALL include the following sequential steps:
   - Welcome message explaining the POS screen purpose
   - Tap a product to add it to cart (interactive, detect: cart item added)
   - Tap the same product again to increase quantity (interactive, detect: quantity increased)
   - Long-press the product to remove from cart (interactive, detect: item removed)
   - Tap a product to add it back (interactive, detect: cart item added)
   - Highlight the cart summary bar showing items and total (informational, correct position at bottom)
   - Tap "Complete Order" button to proceed to checkout (interactive, detect: navigation to Cart screen, highlight must be positioned correctly on the button)
2. WHEN the user taps Complete Order, THE Tour_System SHALL navigate to Cart screen and continue the tour there
3. IF no products exist, THEN THE Tour_System SHALL redirect to the Manage screen tour first
4. THE Highlight_Zone for cart summary bar SHALL be positioned correctly at the bottom of the screen above the navigation bar
5. THE Highlight_Zone for Complete Order button SHALL be positioned correctly on the actual button location

### Requirement 3.1: Cart Screen (Order Details) Demo Flow

**User Story:** As a new user, I want to complete an order during the tour, so that I understand the full checkout process.

#### Acceptance Criteria

1. WHEN the user arrives at Cart screen from POS tour, THE Tour_System SHALL automatically continue the tour
2. THE Demo_Flow for Cart SHALL include the following steps:
   - Show order details summary (informational)
   - Highlight the Complete Order button (interactive, detect: order completion)
3. THE Tour_System SHALL only allow interaction with the Complete Order button during the tour
4. WHEN the order is completed, THE Tour_System SHALL navigate to Invoice Preview and continue the tour

### Requirement 3.2: Invoice Preview Demo Flow

**User Story:** As a new user, I want to see the invoice after completing an order, so that I understand what customers receive.

#### Acceptance Criteria

1. WHEN the user arrives at Invoice Preview from Cart tour, THE Tour_System SHALL show the invoice for 10 seconds
2. THE Tour_System SHALL display a countdown timer showing remaining time
3. IF the user navigates away before 10 seconds, THE Tour_System SHALL continue to the next screen tour
4. AFTER 10 seconds OR user navigation, THE Tour_System SHALL guide user to Analytics (Stats) screen
5. THE Tour_System SHALL show a message indicating the tour will continue to Analytics

### Requirement 4: Analytics Screen Demo Flow (After Invoice)

**User Story:** As a new user, I want to understand the Analytics dashboard layout, so that I know where to find business metrics.

#### Acceptance Criteria

1. WHEN the user completes the Invoice Preview tour, THE Tour_System SHALL guide user to tap on Stats/Analytics in bottom navigation
2. THE Demo_Flow for Analytics SHALL include the following informational steps:
   - Welcome message explaining the Analytics screen purpose
   - Show revenue and order metrics area
   - Show time period filter location
   - Show link to Advanced Analytics
3. WHEN the Analytics Demo_Flow completes, THE Tour_System SHALL guide user to Orders screen
4. THE Tour_System SHALL NOT require any user interaction for the Analytics tour (informational only)

### Requirement 5: Orders Screen Demo Flow

**User Story:** As a new user, I want to understand the Orders screen layout, so that I know where to find my order history.

#### Acceptance Criteria

1. WHEN the user completes the Analytics tour, THE Tour_System SHALL guide user to tap on Orders in bottom navigation
2. THE Demo_Flow for Orders SHALL include the following informational steps:
   - Welcome message explaining the Orders screen purpose
   - Show order list area where orders appear (including the order just created)
   - Show that tapping an order opens details with invoice and WhatsApp options
3. WHEN the Orders Demo_Flow completes, THE Tour_System SHALL guide user to Manage screen
4. THE Tour_System SHALL NOT require any user interaction for the Orders tour (informational only)

### Requirement 6: Manage Screen Demo Flow - Products Tab

**User Story:** As a new user, I want to learn how to add and manage products, so that I can set up my store inventory.

#### Acceptance Criteria

1. WHEN the user completes the Orders tour, THE Tour_System SHALL guide user to tap on Manage in bottom navigation
2. THE Demo_Flow for Manage Products Tab SHALL include the following sequential steps:
   - Welcome message explaining the Manage screen purpose
   - Show tab navigation options (Products, Inventory, Store Settings) (informational)
   - Tap "Add Product" button (interactive, detect: modal opened)
   - Fill in product name field (interactive, detect: text entered)
   - Fill in price field (interactive, detect: text entered)
   - Save the product (interactive, detect: product saved successfully)
   - View the newly added product in the list (informational)
   - Show edit and delete buttons on product card (informational)
3. WHEN the Manage Products Demo_Flow completes, THE Tour_System SHALL continue to the Inventory tab tour
4. THE Tour_System SHALL pre-fill demo values for optional fields to speed up the demo

### Requirement 7: Manage Screen Demo Flow - Inventory Tab

**User Story:** As a new user, I want to understand how to track and manage my inventory, so that I can keep stock levels accurate.

#### Acceptance Criteria

1. THE Demo_Flow for Manage Inventory Tab SHALL include the following sequential steps:
   - Tap on Inventory tab to switch (interactive, detect: tab changed)
   - Show inventory list with stock levels (informational)
   - Show low stock indicators (informational)
   - Tap on a product to adjust stock (interactive, detect: stock adjustment modal opened)
   - Adjust stock quantity (interactive, detect: stock updated)
2. WHEN the Manage Inventory Demo_Flow completes, THE Tour_System SHALL mark the entire app tour as complete
3. THE Tour_System SHALL show a completion message congratulating the user

### Requirement 8: Cross-Screen Tour Flow

**User Story:** As a new user, I want the tour to seamlessly guide me across different screens, so that I understand the complete app workflow.

#### Acceptance Criteria

1. THE Tour_System SHALL maintain tour state across screen navigations
2. WHEN navigating from one screen to another during the tour, THE Tour_System SHALL automatically continue the tour on the new screen
3. THE Tour_System SHALL follow this exact screen order: POS → Cart → Invoice Preview → Analytics → Orders → Manage
4. THE Tour_System SHALL show navigation hints (e.g., "Tap Stats in the bottom bar") when guiding to the next screen
5. IF the user manually navigates away during the tour, THE Tour_System SHALL offer to resume from where they left off

### Requirement 9: Tour Progress Persistence

**User Story:** As a user who was interrupted during the tour, I want to resume from where I left off, so that I don't have to start over.

#### Acceptance Criteria

1. THE Tour_System SHALL persist the current tour progress to AsyncStorage after each step completion
2. WHEN the app is reopened after an incomplete tour, THE Tour_System SHALL offer to resume from the last completed step
3. THE Tour_System SHALL allow users to restart the tour from the beginning at any time via Settings
4. IF a user skips the tour, THEN THE Tour_System SHALL mark all tours as seen and not show them again automatically
5. THE Tour_System SHALL track completion status for the entire tour flow (not individual screens)

### Requirement 10: Visual Feedback and Animations

**User Story:** As a new user, I want clear visual feedback during the tour, so that I know what to do and when I've done it correctly.

#### Acceptance Criteria

1. WHEN highlighting an interactive element, THE Tour_System SHALL display a pulsing animation on the Highlight_Zone
2. WHEN an action is successfully completed, THE Tour_System SHALL display a brief success animation (checkmark or sparkle)
3. THE Tour_System SHALL use a pointer/finger icon animation to indicate where to tap for interactive steps
4. WHEN showing a hint after timeout, THE Tour_System SHALL animate the hint message entrance smoothly
5. THE Tour_System SHALL maintain consistent animation timing (300ms for transitions, 500ms for celebrations)

### Requirement 11: Accessibility and Skip Options

**User Story:** As a user who prefers to explore on my own, I want to easily skip or exit the tour, so that I'm not forced to complete it.

#### Acceptance Criteria

1. THE Tour_System SHALL display a "Skip" button on every tour step to skip the current screen's tour only
2. THE Tour_System SHALL display a "Skip All" button on every tour step to skip all remaining tours across all screens
3. WHEN a user taps "Skip", THE Tour_System SHALL mark only the current screen's tour as complete and continue to next screen
4. WHEN a user taps "Skip All", THE Tour_System SHALL mark the entire tour as complete
5. THE Tour_System SHALL display a "Skip This Step" button on interactive steps after 10 seconds of inactivity
6. WHEN a user skips a step, THE Tour_System SHALL advance to the next step without requiring action completion
7. THE Tour_System SHALL support screen reader announcements for all tour content
8. THE Tour_System SHALL respect the device's reduced motion settings and disable animations accordingly

### Requirement 12: Correct Highlight Positioning

**User Story:** As a new user, I want the tour highlights to accurately show me where UI elements are, so that I can interact with the correct areas.

#### Acceptance Criteria

1. THE Highlight_Zone for cart summary bar on POS screen SHALL be positioned at the actual location of the cart bar (bottom of screen, above navigation)
2. THE Highlight_Zone for Complete Order button SHALL be positioned at the actual button location within the cart bar
3. THE Tour_System SHALL dynamically calculate highlight positions based on actual component measurements
4. THE Tour_System SHALL update highlight positions when screen dimensions change
5. THE Tour_System SHALL use refs to measure actual component positions rather than hardcoded values
