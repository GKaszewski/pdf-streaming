export const checkAuthorization = async (): Promise<boolean> => {
	const endpoint = import.meta.env.VITE_DEFAULT_ENDPOINT || "";
	const API_KEY = import.meta.env.VITE_API_KEY || "";

	const data = await (
		await fetch(`${endpoint}/list-pdf/`, {
			method: "GET",
			headers: {
				"X-API-KEY": API_KEY,
			},
		})
	).json();

	if (data.detail === "Unauthorized") {
		return false;
	}

	return true;
};
