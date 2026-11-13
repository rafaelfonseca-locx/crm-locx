import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { hideMessage } from "@/store/messageSlice";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";

export function MessageSnackbar() {
	const dispatch = useAppDispatch();
	const { open, message, variant, key } = useAppSelector((s) => s.message);
	const handleClose = () => dispatch(hideMessage());
	return (
		<Snackbar
			key={key}
			open={open}
			autoHideDuration={5000}
			onClose={handleClose}
			anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
		>
			<Alert onClose={handleClose} severity={variant} variant="filled" sx={{ minWidth: 280 }}>
				{message}
			</Alert>
		</Snackbar>
	);
}
