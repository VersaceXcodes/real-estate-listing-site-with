// ✅ CORRECT - Individual selectors
const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);

// ❌ WRONG - Object destructuring causes infinite loops
const { is_authenticated, is_loading } = useAppStore(state => state.authentication_state.authentication_status);