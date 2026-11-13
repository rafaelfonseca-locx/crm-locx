import { type PayloadAction, createSlice } from "@reduxjs/toolkit";

export type MessageVariant = "success" | "error" | "warning" | "info";
type MessageState = { open: boolean; message: string; variant: MessageVariant; key: number };

const initialState: MessageState = { open: false, message: "", variant: "info", key: 0 };

const messageSlice = createSlice({
	name: "message",
	initialState,
	reducers: {
		showMessage: (state, action: PayloadAction<{ message: string; variant?: MessageVariant }>) => ({
			open: true,
			message: action.payload.message,
			variant: action.payload.variant ?? "info",
			key: state.key + 1,
		}),
		hideMessage: (state) => {
			state.open = false;
		},
	},
});

export const { showMessage, hideMessage } = messageSlice.actions;
export default messageSlice.reducer;
