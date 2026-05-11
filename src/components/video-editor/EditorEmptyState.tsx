import { AlertCircle, Film, FolderOpen, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { nativeBridgeClient } from "@/native";

interface EditorEmptyStateProps {
	onVideoImported: (videoPath: string) => void;
	/** Called with the loaded project data — handles both button click and drag-drop */
	onProjectOpened: (project: unknown, path: string | null) => void;
}

type DropError = "unsupported-format" | "load-failed" | null;

export function EditorEmptyState({ onVideoImported, onProjectOpened }: EditorEmptyStateProps) {
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [dropError, setDropError] = useState<DropError>(null);

	const handleImportVideo = useCallback(async () => {
		const result = await window.electronAPI.openVideoFilePicker();
		if (result.canceled || !result.success || !result.path) return;

		const setResult = await nativeBridgeClient.project.setCurrentVideoPath(result.path);
		if (!setResult.success) return;

		onVideoImported(result.path);
	}, [onVideoImported]);

	const handleLoadProject = useCallback(async () => {
		const result = await nativeBridgeClient.project.loadProjectFile();
		if (result.canceled || !result.success || !result.project) return;
		onProjectOpened(result.project, result.path ?? null);
	}, [onProjectOpened]);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		if (e.dataTransfer.items.length > 0) {
			setIsDraggingOver(true);
		}
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) {
			setIsDraggingOver(false);
		}
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setIsDraggingOver(false);

			const files = Array.from(e.dataTransfer.files);
			if (files.length === 0) return;

			const projectFile = files.find((f) => f.name.endsWith(".openscreen"));
			if (!projectFile) {
				setDropError("unsupported-format");
				return;
			}

			// Electron exposes the real filesystem path on the File object
			const filePath = (projectFile as File & { path: string }).path;
			if (!filePath) {
				setDropError("load-failed");
				return;
			}

			const result = await nativeBridgeClient.project.loadProjectFileFromPath(filePath);
			if (!result.success || !result.project) {
				setDropError("load-failed");
				return;
			}

			onProjectOpened(result.project, result.path ?? null);
		},
		[onProjectOpened],
	);

	return (
		<div
			className="flex h-full w-full flex-col items-center justify-center bg-[#09090b]"
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{/* Drop overlay */}
			{isDraggingOver && (
				<div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#34B27B] bg-[#34B27B]/10">
					<Upload className="mb-3 h-10 w-10 text-[#34B27B]" />
					<p className="text-base font-semibold text-[#34B27B]">Drop project file to open</p>
				</div>
			)}

			{/* Drop error dialog */}
			<Dialog open={dropError !== null} onOpenChange={(open) => !open && setDropError(null)}>
				<DialogContent className="bg-[#09090b] border-white/10 rounded-2xl max-w-sm p-6 gap-0">
					<DialogHeader className="mb-5">
						<div className="flex items-center gap-3">
							<img
								src="./openscreen.png"
								alt=""
								aria-hidden="true"
								className="w-9 h-9 rounded-xl flex-shrink-0"
							/>
							<DialogTitle className="text-base font-semibold text-slate-200 leading-tight">
								{dropError === "unsupported-format" ? "Unsupported Format" : "Could Not Open File"}
							</DialogTitle>
						</div>
					</DialogHeader>

					<div className="flex items-start gap-3 mb-6">
						<AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
						<p className="text-sm text-slate-400 leading-relaxed">
							{dropError === "unsupported-format"
								? "Sorry, this file format is not supported. Only .openscreen project files can be dropped here."
								: "The project file could not be opened. The video it references may have been moved or deleted."}
						</p>
					</div>

					<button
						type="button"
						onClick={() => setDropError(null)}
						className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
					>
						<X className="w-4 h-4" />
						Close
					</button>
				</DialogContent>
			</Dialog>

			<div className="relative flex flex-col items-center gap-8 px-6 text-center">
				{/* Logo */}
				<img
					src="./openscreen.png"
					alt=""
					aria-hidden="true"
					className="h-16 w-16 rounded-2xl opacity-90"
				/>

				<div className="flex flex-col gap-2">
					<h2 className="text-xl font-semibold text-slate-200">No project open</h2>
					<p className="max-w-sm text-sm leading-relaxed text-slate-500">
						Import a video to start editing, or load an existing OpenScreen project.
					</p>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-3 w-full max-w-xs">
					<button
						type="button"
						onClick={handleImportVideo}
						className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-xl bg-[#34B27B] hover:bg-[#2d9e6c] active:bg-[#27885c] text-white font-medium text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#34B27B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
					>
						<Film className="h-4 w-4" />
						Import Video File…
					</button>
					<button
						type="button"
						onClick={handleLoadProject}
						className="flex items-center justify-center gap-2.5 w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-medium text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]"
					>
						<FolderOpen className="h-4 w-4" />
						Load Project…
					</button>
				</div>

				<div className="flex flex-col items-center gap-2">
					<p className="text-xs text-slate-600">
						Supported formats: MP4, MOV, WebM, MKV, AVI, M4V, WMV
					</p>
					<div className="flex items-center gap-1.5 text-xs text-slate-700 mt-4">
						<Upload className="h-3 w-3" />
						<span>
							or drag & drop a <span className="text-slate-500 font-medium">.openscreen</span>{" "}
							project file here
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
