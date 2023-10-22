import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocumentProxy, RenderTask } from "pdfjs-dist/types/src/display/api";
import useAppStore from "../store";
import { checkAuthorization } from "../utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

interface Props {
	id: number;
	filename: string;
}

export default function PdfViewer({ filename, id }: Props) {
	const { setPdf, getPdfById, setCurrentPdf } = useAppStore((state) => state);
	const endpoint = import.meta.env.VITE_DEFAULT_ENDPOINT || "";
	const PDF_URL = `${endpoint}/stream-pdf/${id}/`;

	const [pageNumber, setPageNumber] = useState(1);
	const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
	const [scalable, setScalable] = useState(true);
	const [displayControls, setDisplayControls] = useState(true);
	const [touchStart, setTouchStart] = useState(0);
	const [touchEnd, setTouchEnd] = useState(0);

	const canvasRef = useRef<HTMLCanvasElement>(null);
	let renderTask: RenderTask | null = null;

	useEffect(() => {
		checkAuthorization().then((authorized) => {
			if (!authorized) {
				setCurrentPdf(null);
			}
		});

		const loadingTask = pdfjsLib.getDocument({
			url: PDF_URL,
			rangeChunkSize: 2 * 1024 * 1024,
		});

		const pdfObj = getPdfById(id);
		if (pdfObj) {
			setPageNumber(pdfObj.pageNumber);
		}

		loadingTask.promise.then((pdf) => {
			setPdfDoc(pdf);
			if (!pdfObj) {
				setPdf({
					id,
					pageNumber: 1,
					filename,
				});
			}
			renderPage(pdf, pdfObj ? pdfObj.pageNumber : pageNumber, scalable);
		});

		window.addEventListener("resize", handleResize);
		window.addEventListener("orientationchange", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
			window.removeEventListener("orientationchange", handleResize);
		};
	}, []);

	const handleResize = () => {
		if (!pdfDoc) return;

		renderPage(pdfDoc, pageNumber, scalable);
	};

	const renderPage = (
		pdf: PDFDocumentProxy,
		num: number,
		scalable: boolean
	) => {
		if (renderTask) renderTask.cancel();

		pdf.getPage(num).then((page) => {
			if (!canvasRef.current) return;

			const canvas = canvasRef.current;
			const context = canvas.getContext("2d") as CanvasRenderingContext2D;
			const viewport = page.getViewport({ scale: 1 });

			let scale: number = 1;
			const isLandscape = window.innerWidth > window.innerHeight;
			if (scalable) {
				if (isLandscape) {
					scale = canvas.offsetWidth / viewport.width;
				} else {
					scale = Math.min(
						canvas.offsetWidth / viewport.width,
						canvas.offsetHeight / viewport.height
					);
				}
			} else {
				scale = 1;
			}

			console.log("scale => ", scale);

			const scaledViewport = page.getViewport({ scale });

			canvas.height = scaledViewport.height;
			canvas.width = scaledViewport.width;

			const renderContext = {
				canvasContext: context,
				viewport: scaledViewport,
			};
			renderTask = page.render(renderContext);
			renderTask.promise.then(() => {
				renderTask = null;
			});
		});
	};

	const updatePageNumber = (pageNumber: number) => {
		const pdfObj = getPdfById(id);
		if (pdfObj) {
			setPdf({
				...pdfObj,
				pageNumber,
			});
		}
	};

	const nextPage = () => {
		if (!pdfDoc) return;
		if (pageNumber < pdfDoc.numPages) {
			setPageNumber((prevPageNumber) => prevPageNumber + 1);
			updatePageNumber(pageNumber + 1);
			renderPage(pdfDoc, pageNumber + 1, scalable);
		}
	};

	const prevPage = () => {
		if (!pdfDoc) return;
		if (pageNumber > 1) {
			setPageNumber((prevPageNumber) => prevPageNumber - 1);
			updatePageNumber(pageNumber - 1);
			renderPage(pdfDoc, pageNumber - 1, scalable);
		}
	};

	const jumpToPage = (page: number) => {
		if (!pdfDoc) return;
		if (page > 0 && page <= pdfDoc.numPages) {
			setPageNumber(page);
			updatePageNumber(page);
			renderPage(pdfDoc, page, scalable);
		}
	};

	const handleScaleable = () => {
		if (!pdfDoc) return;
		setScalable((prev) => !prev);
		renderPage(pdfDoc, pageNumber, !scalable);
	};

	const goToHome = () => {
		setCurrentPdf(null);
	};

	const handleSwipe = () => {
		const MIN_DISTANCE = 100;
		if (touchStart - touchEnd > MIN_DISTANCE) {
			nextPage();
		}
		if (touchStart - touchEnd < -MIN_DISTANCE) {
			prevPage();
		}
	};

	const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		setTouchStart(e.touches[0].clientX);
	};

	const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
		setTouchEnd(e.changedTouches[0].clientX);
		handleSwipe();
	};

	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		setTouchStart(e.clientX);
	};

	const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
		setTouchEnd(e.clientX);
		handleSwipe();
	};

	return (
		<>
			<div className="w-full absolute top-0 left-0 z-10 flex flex-col items-center justify-center opacity-20 hover:opacity-95">
				<p className="lg:text-2xl">{filename}</p>
				<div className="inline-flex gap-2 items-center justify-center">
					<label htmlFor="toggle-controls">Toggle controls</label>
					<input
						aria-label="toggle controls"
						type="checkbox"
						id="toggle-controls"
						onClick={() => setDisplayControls((prev) => !prev)}
						defaultChecked={displayControls}
					/>
				</div>
			</div>
			{pdfDoc && displayControls && (
				<div className="w-full absolute bottom-8 left-0 z-10 flex gap-2 items-center justify-center">
					<button onClick={goToHome}>Home</button>
					<button onClick={prevPage}>Previous</button>
					<input
						className="outline-none appearance-none border border-gray-300 rounded py-1 px-2 mx-2 w-16"
						aria-label="page number"
						type="number"
						value={pageNumber}
						onChange={(e) => jumpToPage(parseInt(e.target.value))}
					/>
					<p>/ {pdfDoc?.numPages}</p>
					<button onClick={nextPage}>Next</button>
					<input
						aria-label="toggle scalable"
						type="checkbox"
						onClick={handleScaleable}
						defaultChecked={scalable}
					/>
				</div>
			)}

			<div
				className="w-full min-h-screen h-full absolute inset-0 flex items-center justify-center"
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
				onMouseDown={handleMouseDown}
				onMouseUp={handleMouseUp}
			>
				<div className="flex flex-col items-center overflow-auto w-full h-full">
					<canvas ref={canvasRef} className="w-full"></canvas>
				</div>
			</div>
		</>
	);
}
