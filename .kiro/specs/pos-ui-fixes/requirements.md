# Requirements Document

## Introduction

This specification addresses four critical UI and data synchronization issues in the FlowPOS application's Point of Sale (POS) screen and inventory management system. These issues affect the user experience, data integrity, and stock management accuracy of the application.

## Glossary

- **POS Screen**: The Point of Sale screen where users select products to add to cart and complete orders
- **Cart**: The collection of selected products with quantities that a user intends to purchase
- **Available Stock**: The current quantity of a product that exists in inventory and can be sold
- **Selected Quantity**: The number of units of a product that a user has added to the cart
- **Stock Limit**: The maximum quantity of a product that can be selected, equal to the available stock
- **Custom Alert**: A modal dialog component used to display warnings and confirmations to users
- **Alert Queue**: A system to manage multiple alert dialogs preventing them from displaying simultaneously
- **Clear Cart Popup**: A confirmation dialog that appears when a user attempts to clear all items from the cart
- **Track Stock Toggle**: A boolean setting on products that determines whether stock quantities should be monitored
- **Stock Synchronization**: The process of keeping stock quantities consistent between local storage and the Supabase database
- **Inventory Screen**: The management screen where users can view and update product stock quantities
- **Database**: Refers to the Supabase backend database where product data is stored

## Requirements

### Requirement 1

**User Story:** As a cashier, I want the POS screen to prevent me from selecting more products than are available in stock, so that I cannot create orders that exceed inventory levels.

#### Acceptance Criteria

1. WHEN a user attempts to increase the selected quantity of a product THEN the POS Screen SHALL verify the new quantity does not exceed the available stock
2. WHEN the selected quantity equals the available stock THEN the POS Screen SHALL disable the increment button for that product
3. WHEN a user manually enters a quantity that exceeds available stock THEN the POS Screen SHALL reject the input and display the maximum allowed quantity
4. WHEN a product is added to the cart THEN the POS Screen SHALL synchronize the selected quantity with the current database stock level
5. WHEN the available stock changes in the database THEN the POS Screen SHALL update the stock limit for products already in the cart

### Requirement 2

**User Story:** As a store owner, I want alert popups to display one at a time without overlapping, so that I can read and respond to each alert clearly.

#### Acceptance Criteria

1. WHEN multiple alerts are triggered in quick succession THEN the system SHALL queue the alerts and display them sequentially
2. WHEN an alert is currently visible THEN the system SHALL prevent new alerts from displaying until the current alert is dismissed
3. WHEN a user dismisses an alert THEN the system SHALL display the next queued alert if one exists
4. WHEN the "out of stock" alert is triggered THEN the system SHALL ensure it does not overlap with the "clear cart" confirmation alert
5. WHEN an alert is displayed THEN the system SHALL maintain proper z-index layering to prevent UI element interference

### Requirement 3

**User Story:** As a store owner, I want the track stock toggle to properly synchronize with the database, so that stock tracking settings persist correctly and stock quantities are accurately maintained.

#### Acceptance Criteria

1. WHEN a user enables track stock for a product THEN the Inventory Screen SHALL update the trackStock field in the Database immediately
2. WHEN a user disables track stock for a product THEN the Inventory Screen SHALL update the trackStock field in the Database immediately
3. WHEN the track stock setting is changed THEN the Inventory Screen SHALL verify the update was successful and display an error if synchronization fails
4. WHEN a product with track stock enabled has its quantity updated THEN the Inventory Screen SHALL synchronize the new stock value to the Database
5. WHEN the Inventory Screen loads THEN the Inventory Screen SHALL fetch the current trackStock status from the Database to ensure accurate display
6. WHEN stock quantities are modified in the Inventory Screen THEN the Inventory Screen SHALL update both local storage and the Database atomically
7. WHEN a network error occurs during stock synchronization THEN the Inventory Screen SHALL retry the operation and notify the user if it fails after retries

### Requirement 4

**User Story:** As a cashier, I want the clear cart confirmation popup to display consistently every time, so that I have a uniform and predictable experience when clearing my cart.

#### Acceptance Criteria

1. WHEN a user clicks the clear cart button THEN the POS Screen SHALL display the Clear Cart Popup with consistent styling and layout
2. WHEN the Clear Cart Popup is displayed THEN the POS Screen SHALL show the same confirmation message text on every invocation
3. WHEN the Clear Cart Popup is displayed THEN the POS Screen SHALL render the same button labels and positions on every invocation
4. WHEN a user confirms the clear cart action THEN the POS Screen SHALL dismiss the popup and clear all items from the Cart
5. WHEN a user cancels the clear cart action THEN the POS Screen SHALL dismiss the popup and maintain all items in the Cart
