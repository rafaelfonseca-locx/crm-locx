import { getApiErrorMessage } from "@/store/api/apiService";
import { useAppDispatch } from "@/store/hooks";
import { showMessage } from "@/store/messageSlice";
import { useCallback } from "react";

export function useNotify() {
	const dispatch = useAppDispatch();
	const success = useCallback((message: string) => dispatch(showMessage({ message, variant: "success" })), [dispatch]);
	const info = useCallback((message: string) => dispatch(showMessage({ message, variant: "info" })), [dispatch]);
	const apiError = useCallback(
		(error: unknown, fallback?: string) =>
			dispatch(showMessage({ message: getApiErrorMessage(error, fallback), variant: "error" })),
		[dispatch],
	);
	return { success, info, apiError };
}
