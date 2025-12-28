# Requirements Document

## Introduction

This feature improves the accuracy of storage usage calculations in FlowPOS by applying a realistic multiplier to account for database overhead, indexes, and metadata. The current calculation uses `JSON.stringify().length` which underestimates actual storage usage.

## Glossary

- **Storage_Calculator**: The backend service that calculates user storage usage
- **Storage_Multiplier**: A factor applied to raw data size to estimate actual database storage
- **Database_Overhead**: Additional storage used by indexes, metadata, row headers, and internal database structures
- **Raw_Data_Size**: The size of data as calculated by JSON serialization

## Requirements

### Requirement 1: Apply Storage Multiplier to Database Calculations

**User Story:** As a system administrator, I want storage calculations to reflect realistic database usage, so that users have accurate information about their storage consumption.

#### Acceptance Criteria

1. WHEN calculating products data size, THE Storage_Calculator SHALL multiply the raw JSON size by the Storage_Multiplier
2. WHEN calculating orders data size, THE Storage_Calculator SHALL multiply the raw JSON size by the Storage_Multiplier
3. WHEN calculating order items data size, THE Storage_Calculator SHALL multiply the raw JSON size by the Storage_Multiplier
4. WHEN calculating store data size, THE Storage_Calculator SHALL multiply the raw JSON size by the Storage_Multiplier
5. THE Storage_Multiplier SHALL be configurable with a default value of 2.0

### Requirement 2: Maintain Image Size Calculation

**User Story:** As a system administrator, I want image storage to remain accurate, so that file-based storage is not artificially inflated.

#### Acceptance Criteria

1. WHEN calculating product images size, THE Storage_Calculator SHALL NOT apply the Storage_Multiplier
2. WHEN image metadata is available from Supabase storage, THE Storage_Calculator SHALL use the actual file size
3. WHEN image metadata is unavailable, THE Storage_Calculator SHALL estimate using 50KB per product

### Requirement 3: Provide Transparent Breakdown

**User Story:** As a user, I want to see a clear breakdown of my storage usage, so that I understand what is consuming my storage quota.

#### Acceptance Criteria

1. WHEN displaying storage breakdown, THE Storage_Calculator SHALL show the adjusted sizes for each category
2. THE Storage_Calculator SHALL include a note indicating that database sizes include overhead estimates
3. WHEN the total exceeds the quota, THE Storage_Calculator SHALL set isOverLimit to true
