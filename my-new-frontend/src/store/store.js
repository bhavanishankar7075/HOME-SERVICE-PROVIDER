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
  createTransform,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from '../redux/authSlice';

// Log transform to debug state serialization
const logTransform = createTransform(
  (inboundState, key) => {
    console.log(`redux-persist: Saving state for ${key}:`, inboundState);
    return inboundState;
  },
  (outboundState, key) => {
    console.log(`redux-persist: Restoring state for ${key}:`, outboundState);
    return outboundState;
  },
  { whitelist: ['auth'] }
);

const rootReducer = combineReducers({
  auth: authReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth'],
  debug: true,
  transforms: [logTransform],
  timeout: 1000, // Add timeout to ensure persistence completes
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

console.log('store.js: Store initialized, persistConfig:', persistConfig);
console.log('store.js: Initial state:', store.getState());
console.log('store.js: Initial localStorage persist:root:', localStorage.getItem('persist:root'));

export const persistor = persistStore(store, null, () => {
  console.log('store.js: Persistor hydrated, state:', store.getState());
  console.log('store.js: localStorage persist:root after hydration:', localStorage.getItem('persist:root'));
});

















































//main
/* 
//main 
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
 */
