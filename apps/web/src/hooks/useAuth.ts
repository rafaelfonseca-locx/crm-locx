import { useGetMeQuery } from "@/store/api/hooks";
import { useAppSelector } from "@/store/hooks";

export function useAuth() {
	const token = useAppSelector((s) => s.auth.token);
	const { data, isLoading, isError } = useGetMeQuery(undefined, { skip: !token });
	const user = data?.data ?? null;
	return {
		token,
		user,
		isLoading: !!token && isLoading,
		isError,
		isManager: user?.role === "ADMIN" || user?.role === "MANAGER",
		isAdmin: user?.role === "ADMIN",
	};
}
