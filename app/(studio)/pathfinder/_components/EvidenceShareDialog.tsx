"use client";

import { useRef, useState } from "react";
import { pathfinderApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { UploadCloud, Link2, FileText, X, ImageIcon, File as FileIcon, Loader2 } from "lucide-react";

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB

interface EvidenceShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onShared: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EvidenceShareDialog({ open, onOpenChange, sessionId, onShared }: EvidenceShareDialogProps) {
  const [tab, setTab] = useState<"file" | "link" | "text">("file");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle("");
    setUrl("");
    setContent("");
    setFile(null);
    setPreviewUrl(null);
    setUploadProgress(null);
    setError(null);
    setTab("file");
  };

  const handleClose = (nextOpen: boolean) => {
    if (!submitting) {
      if (!nextOpen) reset();
      onOpenChange(nextOpen);
    }
  };

  const pickFile = (candidate: File | undefined | null) => {
    if (!candidate) return;
    if (candidate.size > MAX_FILE_BYTES) {
      setError(`That file is too large (max ${formatBytes(MAX_FILE_BYTES)}).`);
      return;
    }
    setError(null);
    setFile(candidate);
    if (!title) setTitle(candidate.name.replace(/\.[^/.]+$/, ""));
    if (candidate.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(candidate));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const canSubmit =
    tab === "file" ? Boolean(file && title.trim()) :
    tab === "link" ? Boolean(url.trim() && title.trim()) :
    Boolean(content.trim() && title.trim());

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      if (tab === "file" && file) {
        setUploadProgress(0);
        await pathfinderApi.shareArtifact(
          {
            title: title.trim(),
            artifact_type: "file",
            file,
            pathfinder_session: sessionId,
          },
          (percent) => setUploadProgress(percent)
        );
      } else if (tab === "link") {
        await pathfinderApi.shareArtifact({
          title: title.trim(),
          artifact_type: "link",
          url: url.trim(),
          pathfinder_session: sessionId,
        });
      } else {
        await pathfinderApi.shareArtifact({
          title: title.trim(),
          artifact_type: "text",
          content: content.trim(),
          pathfinder_session: sessionId,
        });
      }
      onShared();
      handleClose(false);
    } catch {
      setError("Couldn't share that — try again.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share something you&apos;ve made</DialogTitle>
          <DialogDescription>
            A sketch, a screenshot, a project, a link — anything that shows what you&apos;re into.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">
              <UploadCloud className="mr-1.5 h-3.5 w-3.5" /> File
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link2 className="mr-1.5 h-3.5 w-3.5" /> Link
            </TabsTrigger>
            <TabsTrigger value="text">
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Text
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="mt-3">
            {!file ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">Drag a file here, or click to browse</p>
                <p className="text-xs text-muted-foreground">Images, PDFs, docs — up to {formatBytes(MAX_FILE_BYTES)}</p>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0])}
                  accept="image/*,.pdf,.doc,.docx,.ppt,.pptx"
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={file.name} className="h-14 w-14 rounded-md object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
                    <FileIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
                {!submitting && (
                  <Button variant="ghost" size="icon" onClick={() => { setFile(null); setPreviewUrl(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {file && (
              <Input
                className="mt-3"
                placeholder="What is it?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            )}
            {uploadProgress !== null && <Progress value={uploadProgress} className="mt-3" />}
          </TabsContent>

          <TabsContent value="link" className="mt-3 space-y-3">
            <Input placeholder="What is it?" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Input
              placeholder="Link (portfolio, drive, website...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </TabsContent>

          <TabsContent value="text" className="mt-3 space-y-3">
            <Input placeholder="What is it?" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea
              placeholder="Describe it, paste some writing, whatever fits..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </TabsContent>
        </Tabs>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
