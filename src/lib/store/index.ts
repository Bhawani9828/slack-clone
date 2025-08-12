import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import userReducer from './slices/userSlice'; // Corrected import
import sidebarReducer from './slices/sidebarSlice';

import { TypedUseSelectorHook, useDispatch, useSelector, useStore } from 'react-redux';

export const makeStore = () => {
  return configureStore({
    reducer: {
      chat: chatReducer,
      user: userReducer,
      sidebar: sidebarReducer,
    },
    // Optional middleware configuration
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Disable if having serialization issues
      }),
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the RootState and AppDispatch types
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

// Export typed hooks
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore: () => AppStore = useStore;