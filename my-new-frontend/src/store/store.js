import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // This defaults to localStorage for web
import authReducer from '../redux/authSlice'; // Ensure the path is correct

// Step 1: Combine all your reducers into a single rootReducer.
// This makes it easy to add more reducers later.
const rootReducer = combineReducers({
  auth: authReducer,
});

// Step 2: Create the configuration for redux-persist.
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'], // **Important**: Only the 'auth' slice will be persisted.
};

// Step 3: Create a persisted version of your root reducer.
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Step 4: Configure the store using the persisted reducer.
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // This is essential to prevent errors with non-serializable data
      // that redux-persist uses.
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Step 5: Create the persistor.
export const persistor = persistStore(store);



























/* import { configureStore } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from '../redux/authSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'], // Persist only the auth slice
};

const persistedReducer = persistReducer(persistConfig, authReducer);

const store = configureStore({
  reducer: {
    auth: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER'],
        ignoredPaths: ['auth.user', 'auth.token'],
      },
    }),
});

const persistor = persistStore(store);

export { store, persistor }; // Single named export statement */