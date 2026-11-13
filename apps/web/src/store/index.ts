import { configureStore } from "@reduxjs/toolkit";
import { apiService } from "./api/apiService";
import authReducer from "./authSlice";
import messageReducer from "./messageSlice";

export const store = configureStore({
	reducer: { auth: authReducer, message: messageReducer, [apiService.reducerPath]: apiService.reducer },
	middleware: (getDefault) => getDefault().concat(apiService.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
