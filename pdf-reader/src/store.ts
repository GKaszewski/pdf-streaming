import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Pdf = {
	id: number;
	filename: string;
	pageNumber: number;
};

export type AppState = {
	pdfs: Record<string, Pdf>;
	setPdfs: (pdfs: Pdf[]) => void;
	setPdf: (pdf: Pdf) => void;
	getPdf: (filename: string) => Pdf | undefined;
	getPdfById: (id: number) => Pdf | undefined;
	currentPdf: Pdf | null;
	setCurrentPdf: (pdf: Pdf | null) => void;
};

const useAppStore = create<AppState>()(
	persist(
		(set, get) => ({
			pdfs: {},
			setPdfs: (pdfs: Pdf[]) => {
				const newPdfs: Record<string, Pdf> = {};
				pdfs.forEach((pdf) => {
					newPdfs[pdf.filename] = pdf;
				});
				set({ pdfs: newPdfs });
			},
			setPdf: (pdf: Pdf) => {
				const newPdfs = get().pdfs;
				newPdfs[pdf.filename] = pdf;
				set({ pdfs: newPdfs });
			},
			getPdf: (filename: string) => {
				return get().pdfs[filename];
			},
			getPdfById: (id: number) => {
				const pdfs = get().pdfs;
				for (const filename in pdfs) {
					if (pdfs[filename].id === id) {
						return pdfs[filename];
					}
				}
				return undefined;
			},
			currentPdf: null,
			setCurrentPdf: (pdf: Pdf | null) => {
				set({ currentPdf: pdf });
			},
		}),
		{
			name: "pdf-viewer-storage",
		}
	)
);

export default useAppStore;
