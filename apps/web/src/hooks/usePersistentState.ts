import { useEffect, useState } from "react";

/** Estado lembrado no navegador (preferência de visualização). Funciona mesmo sem localStorage. */
export function usePersistentState<T>(key: string, initial: T) {
	const [value, setValue] = useState<T>(() => {
		try {
			const raw = localStorage.getItem(key);
			return raw ? { ...initial, ...JSON.parse(raw) } : initial;
		} catch {
			return initial;
		}
	});
	useEffect(() => {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			// sem armazenamento disponível
		}
	}, [key, value]);
	return [value, setValue] as const;
}
