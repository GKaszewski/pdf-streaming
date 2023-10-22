import { useEffect, useState } from "react";
import useAppStore, { Pdf } from "../store";

export default function PdfsList() {
	const endpoint = import.meta.env.VITE_DEFAULT_ENDPOINT || "";
	const API_KEY = import.meta.env.VITE_API_KEY || "";
	const [_pdfs, _setPdfs] = useState<Pdf[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const { setPdfs, getPdf, setCurrentPdf } = useAppStore((state) => state);

	useEffect(() => {
		setLoading(true);
		fetch(`${endpoint}/list-pdf/`, {
			method: "GET",
			headers: {
				"X-API-KEY": API_KEY,
			},
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.detail === "Unauthorized") {
					setError("Unauthorized");
					setLoading(false);
					return;
				}
				_setPdfs(data);
				const pdfsData = data.map((pdf: Pdf) => {
					const pdfObj = getPdf(pdf.filename);
					if (pdfObj) {
						return pdfObj;
					}

					return {
						id: pdf.id,
						pageNumber: 1,
						filename: pdf.filename,
					};
				});
				setPdfs(pdfsData);
				setLoading(false);
			})
			.catch((err) => {
				setError(err.message);
				setLoading(false);
			});
	}, []);

	const handlePdfClick = (pdf: Pdf) => {
		setCurrentPdf(pdf);
	};

	return (
		<div className="w-full min-h-screen h-full bg-gray-200">
			<h1 className="text-4xl text-center">PDFs list</h1>
			{loading && <p className="text-center">Loading...</p>}
			{error && <p className="text-center">{error}</p>}
			{_pdfs && (
				<ul className="flex flex-col gap-2 items-center justify-center">
					{_pdfs.map((pdf) => (
						<li
							key={pdf.id}
							className="flex gap-2 items-center justify-center bg-white rounded p-2 shadow-md"
							onClick={() => handlePdfClick(pdf)}
						>
							<p>{pdf.filename}</p>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
