// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Downloader } from "@/components/downloader/downloader";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe("downloader form", () => {
  it("shows an anonymous direct download and handles expired links", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true,json:async()=>({data:{status:"ready",videoId:"6718335390845095173",directDownload:{url:"http://127.0.0.1:9000/tunnel?test=fixture",filename:"fixture.mp4",expiresAt:Date.now()-1000}}})}));
    const user=userEvent.setup();render(<Downloader />);
    await user.type(screen.getByRole("textbox"),"https://www.tiktok.com/@a/video/6718335390845095173");
    await user.click(screen.getByRole("button",{name:"Download"}));
    const link=await screen.findByRole("link",{name:"Download MP4"});
    expect(link).toHaveAttribute("download","fixture.mp4");
    await user.click(link);
    expect(await screen.findByRole("alert")).toHaveTextContent("expired");
  });
  it("rejects an invalid URL without a request", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const user = userEvent.setup(); render(<Downloader />);
    await user.type(screen.getByRole("textbox"), "https://example.com/video");
    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("secure link"); expect(fetch).not.toHaveBeenCalled();
  });
  it("shows source unavailability without inventing a download", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: "clean_source_unavailable", videoId: "6718335390845095173", assets: [], message: "Watermark-free original unavailable for this video." } }) }));
    const user = userEvent.setup(); render(<Downloader />);
    await user.type(screen.getByRole("textbox"), "https://www.tiktok.com/@a/video/6718335390845095173");
    await user.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(screen.getByText("Watermark-free original unavailable for this video.")).toBeVisible());
    expect(screen.queryByRole("button", { name: /Download MP4/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Upload your original/ })).not.toBeInTheDocument();
  });
});
