import PdfViewer from "./components/PdfViewer";
import PdfsList from "./components/PdfsList";
import useAppStore from "./store";

function App() {
	const { currentPdf } = useAppStore((state) => state);
	return (
		<>
			{currentPdf ? (
				<PdfViewer filename={currentPdf.filename} id={currentPdf.id} />
			) : (
				<PdfsList />
			)}
		</>
	);
}

export default App;
