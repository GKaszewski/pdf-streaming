import useAppStore from "./store";

export const checkAuthorization = async (): Promise<boolean> => {
	const endpoint = import.meta.env.VITE_DEFAULT_ENDPOINT || "";
	const apiKey = useAppStore.getState().apiKey;

	const data = await (
		await fetch(`${endpoint}/list-pdf/`, {
			method: "GET",
			headers: {
				"X-API-KEY": apiKey,
			},
		})
	).json();

	if (data.detail === "Unauthorized") {
		return false;
	}

	return true;
};
