import React from 'react';

// Documentation: ZUSTAND STATE SELECTION PATTERNS
// ✅ CORRECT - Individual selectors (prevents infinite loops)
// const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
// const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);

// ❌ WRONG - Object destructuring causes infinite loops
// const { is_authenticated, is_loading } = useAppStore(state => state.authentication_state.authentication_status);

const App: React.FC = () => {
  return null;
};

export default App;
