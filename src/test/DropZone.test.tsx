import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import DropZone from "../components/DropZone";
import { T } from "../i18n";

const t = T.ru;
const mockInvoke = vi.mocked(invoke);

describe("DropZone", () => {
  const onFile = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows idle state when no file selected", () => {
    render(<DropZone t={t} file="" fileName="" onFile={onFile} />);
    expect(screen.getByText(t.dropTitle)).toBeInTheDocument();
    expect(screen.getByText(t.dropSub)).toBeInTheDocument();
  });

  it("shows file name when file is selected", () => {
    render(<DropZone t={t} file="/path/to/audio.mp3" fileName="audio.mp3" onFile={onFile} />);
    expect(screen.getByText("audio.mp3")).toBeInTheDocument();
    expect(screen.getByText(t.dropChange)).toBeInTheDocument();
  });

  it("calls invoke pick_file on click and fires onFile with result", async () => {
    mockInvoke.mockResolvedValueOnce("/Users/test/song.mp3");
    render(<DropZone t={t} file="" fileName="" onFile={onFile} />);
    fireEvent.click(screen.getByText(t.dropTitle));
    await vi.waitFor(() => expect(onFile).toHaveBeenCalledWith("/Users/test/song.mp3", "song.mp3"));
  });

  it("does not call onFile when pick_file returns null", async () => {
    mockInvoke.mockResolvedValueOnce(null);
    render(<DropZone t={t} file="" fileName="" onFile={onFile} />);
    fireEvent.click(screen.getByText(t.dropTitle));
    await vi.waitFor(() => expect(mockInvoke).toHaveBeenCalled());
    expect(onFile).not.toHaveBeenCalled();
  });

  it("rejects unsupported file extensions on drop", () => {
    render(<DropZone t={t} file="" fileName="" onFile={onFile} />);
    const zone = screen.getByText(t.dropTitle).closest("div")!;
    const file = new File([""], "doc.pdf", { type: "application/pdf" });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFile).not.toHaveBeenCalled();
  });
});
