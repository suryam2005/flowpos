// Flat color structure for auth screens - hardcoded to avoid circular dependencies
// This prevents the "Property 'colors' doesn't exist" error
export const authColors = {
  background: '#F9FAFB',      // Off-white primary background
  surface: '#FFFFFF',          // White for cards and modals
  text: '#1C1C1E',             // Charcoal for primary text
  textSecondary: '#6B7280',    // Cool gray for secondary text
  primary: '#2563EB',          // Deep blue for buttons and highlights
  primaryLight: '#EFF6FF',     // Very light blue for backgrounds
  border: '#E5E7EB',           // Light gray for borders
  error: '#EF4444',            // Warm red for errors
  success: '#10B981',          // Emerald green for success
  warning: '#F59E0B',          // Amber for warnings
};

export default authColors;