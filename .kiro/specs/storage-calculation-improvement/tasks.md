# Implementation Plan: Storage Calculation Improvement

## Overview

Apply a configurable multiplier to database storage calculations to account for database overhead (indexes, metadata, row headers). This is a backend-only change.

## Tasks

- [x] 1. Add storage multiplier constant and apply to calculations
  - Add STORAGE_MULTIPLIER constant at top of file (default 2.0)
  - Apply multiplier to productsSize, ordersSize, orderItemsSize, storeSize
  - Keep imagesSize unchanged
  - Update totalSize calculation to use adjusted values
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1_

- [x] 2. Update storage breakdown with adjusted sizes
  - Update products breakdown to use adjusted size (productsSize * STORAGE_MULTIPLIER + imagesSize)
  - Update orders breakdown to use adjusted size
  - Update store breakdown to use adjusted size
  - _Requirements: 3.1_

- [x] 3. Add transparency fields to response
  - Add `note` field explaining overhead estimation
  - Add `multiplierApplied` field showing the multiplier value
  - _Requirements: 3.2_

- [x] 4. Checkpoint - Verify storage calculation
  - Test the endpoint manually to verify calculations are correct
  - Ensure all tests pass, ask the user if questions arise

## Notes


- This is a backend-only change in `flowposbackend/routes/subscription.js`
- No frontend changes required - API response format is backward compatible
- The multiplier accounts for database overhead not captured by JSON serialization
- Image sizes remain unchanged as they represent actual file sizes
