import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ResultView from "../components/ResultView";
import { T } from "../i18n";

const t = T.ru;

const defaultProps = {
  t,
  text: "Привет мир",
  outputPath: "/Users/test/audio.txt",
  onNew: vi.fn(),
};

describe("ResultView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders the transcribed text", () => {
    render(<ResultView {...defaultProps} />);
    expect(screen.getByText("Привет мир")).toBeInTheDocument();
  });

  it("shows output path", () => {
    render(<ResultView {...defaultProps} />);
    expect(screen.getByText(/\/Users\/test\/audio\.txt/)).toBeInTheDocument();
  });

  it("copy button writes text to clipboard", async () => {
    render(<ResultView {...defaultProps} />);
    fireEvent.click(screen.getByText(t.btnCopy));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Привет мир");
  });

  it("copy button shows copied state then reverts", async () => {
    vi.useFakeTimers();
    render(<ResultView {...defaultProps} />);
    await act(async () => { fireEvent.click(screen.getByText(t.btnCopy)); });
    expect(screen.getByText(t.btnCopied)).toBeInTheDocument();
    await act(async () => { vi.advanceTimersByTime(2100); });
    expect(screen.getByText(t.btnCopy)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("new file button calls onNew", () => {
    render(<ResultView {...defaultProps} />);
    fireEvent.click(screen.getByText(t.btnNewFile));
    expect(defaultProps.onNew).toHaveBeenCalledOnce();
  });

  it("shows dash when text is empty", () => {
    render(<ResultView {...defaultProps} text="" />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("hides output path when empty", () => {
    render(<ResultView {...defaultProps} outputPath="" />);
    expect(screen.queryByText(t.savedTo)).not.toBeInTheDocument();
  });
});
