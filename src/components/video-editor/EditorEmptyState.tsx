import { Film, FolderOpen, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { nativeBridgeClient } from "@/native";

interface EditorEmptyStateProps {
	onVideoImported: (videoPath: string) => void;
	onProjectLoaded: () => void;
	onProjectFileDropped: (project: unknown, path: string | null) => void;
}

export function EditorEmptyState({
	onVideoImported,
	onProjectLoaded,
	onProjectFileDropped,
}: EditorEmptyStateProps) {
	const [isDraggingOver, setIsDraggingOver] = useState(false);

	const handleImportVideo = useCallback(async () => {
		const result = await window.electronAPI.openVideoFilePicker();
		if (result.canceled || !result.success || !result.path) return;

		const setResult = await nativeBridgeClient.project.setCurrentVideoPath(result.path);
		if (!setResult.success) return;

		onVideoImported(result.path);
	}, [onVideoImported]);

	const handleLoadProject = useCallback(async () => {
		const result = await nativeBridgeClient.project.loadProjectFile();
		if (result.canceled || !result.success) return;
		onProjectLoaded();
	}, [onProjectLoaded]);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		const files = Array.from(e.dataTransfer.items);
		const hasProject = files.some(
			(item) =>
				item.kind === "file" &&
				(item.getAsFile()?.name.endsWith(".openscreen") ||
					item.type === "application/octet-stream"),
		);
		if (hasProject || files.length > 0) {
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
			const projectFile = files.find((f) => f.name.endsWith(".openscreen"));
			if (!projectFile) return;

			// Electron exposes the real filesystem path on the File object
			const filePath = (projectFile as File & { path: string }).path;
			if (!filePath) return;

			const result = await nativeBridgeClient.project.loadProjectFileFromPath(filePath);
			if (!result.success) return;

			// Pass the already-loaded project data up so VideoEditor can apply it
			// directly without re-opening a file picker dialog.
			onProjectFileDropped(result.project, result.path ?? null);
		},
		[onProjectFileDropped],
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
