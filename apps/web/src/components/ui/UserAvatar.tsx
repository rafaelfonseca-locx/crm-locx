import type { UserSummary } from "@/store/api/@types/common.types";
import { initials } from "@/utils/formatters";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import Tooltip from "@mui/material/Tooltip";

type UserAvatarProps = {
	user: Pick<UserSummary, "name" | "color" | "avatarUrl"> | null;
	size?: number;
	tooltip?: string | false;
};

export function UserAvatar({ user, size = 28, tooltip }: UserAvatarProps) {
	const avatar = (
		<Avatar
			src={user?.avatarUrl ?? undefined}
			sx={{
				width: size,
				height: size,
				fontSize: size < 28 ? 10 : 12,
				bgcolor: user ? user.color : "action.disabledBackground",
				color: user ? "#fff" : "text.secondary",
				border: 2,
				borderColor: "background.paper",
			}}
			alt={user?.name ?? "Sem responsável"}
		>
			{user ? initials(user.name) : "?"}
		</Avatar>
	);
	if (tooltip === false) return avatar;
	return <Tooltip title={tooltip ?? user?.name ?? "Sem responsável"}>{avatar}</Tooltip>;
}

export function AvatarStack({
	users,
	max = 4,
	size = 26,
}: { users: { user: UserSummary; label?: string }[]; max?: number; size?: number }) {
	return (
		<AvatarGroup max={max} sx={{ "& .MuiAvatar-root": { width: size, height: size, fontSize: 10 } }}>
			{users.map(({ user, label }) => (
				<UserAvatar key={user.id} user={user} size={size} tooltip={label ? `${user.name} · ${label}` : user.name} />
			))}
		</AvatarGroup>
	);
}
