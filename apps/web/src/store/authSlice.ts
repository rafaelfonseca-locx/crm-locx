import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export const TOKEN_STORAGE_KEY = "locx-crm-token";

function readToken() {
	try {
		return localStorage.getItem(TOKEN_STORAGE_KEY);
	} catch {
		return null;
	}
}

const authSlice = createSlice({
	name: "auth",
	initialState: { token: readToken() },
	reducers: {
		setToken: (state, action: PayloadAction<string>) => {
			state.token = action.payload;
			try {
				localStorage.setItem(TOKEN_STORAGE_KEY, action.payload);
			} catch {
				// Sem armazenamento: a sessão dura até fechar a aba
			}
		},
		logout: (state) => {
			state.token = null;
			try {
				localStorage.removeItem(TOKEN_STORAGE_KEY);
			} catch {
				// ignora
			}
		},
	},
});

export const { setToken, logout } = authSlice.actions;
export default authSlice.reducer;
