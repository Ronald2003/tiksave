// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Downloader } from "@/components/downloader/downloader";

vi.mock("motion/react", async (importOriginal) => ({
  ...await importOriginal<typeof import("motion/react")>(),
  useReducedMotion: () => true,
}));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("downloader form", () => {
  it("waits for the backend and retries the submitted link automatically", async () => {
    vi.useFakeTimers();
    const url = "https://www.tiktok.com/@a/video/6718335390845095173";
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: { code: "provider_unreachable", message: "Backend did not respond." },
      }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { status: "ready", directDownload: { url: "https://backend.example/tunnel", filename: "video.mp4", expiresAt: Date.now() + 120000 } },
      })));
    vi.stubGlobal("fetch", fetch);
    render(<Downloader />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: url } });
    await act(async () => { fireEvent.submit(input.closest("form")!); });

    expect(screen.getByRole("status")).toHaveTextContent("Waking up the download server");
    expect(screen.getByRole("button", { name: "Waiting for server…" })).toBeDisabled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(input).toHaveValue(url);

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls.map(([, options]) => JSON.parse(options.body))).toEqual([{ url }, { url }]);
    expect(screen.getByRole("link", { name: "Download MP4" })).toBeVisible();
    expect(input).toHaveValue("");
  });

  it("shows a rate-limit service error immediately", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: "rate_limit_unavailable", message: "Request protection is temporarily unavailable." },
    }), { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    render(<Downloader />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "https://www.tiktok.com/@a/video/6718335390845095173" } });
    await act(async () => { fireEvent.submit(input.closest("form")!); });
    expect(screen.getByRole("alert")).toHaveTextContent("Request protection is temporarily unavailable.");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries non-JSON gateway timeouts while the backend wakes up", async () => {
    vi.useFakeTimers();
    const url = "https://www.tiktok.com/@a/video/6718335390845095173";
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response("Gateway Timeout", { status: 504, headers: { "Content-Type": "text/html" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { status: "ready", directDownload: { url: "https://backend.example/tunnel", filename: "video.mp4", expiresAt: Date.now() + 120000 } },
      })));
    vi.stubGlobal("fetch", fetch);
    render(<Downloader />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: url } });
    await act(async () => { fireEvent.submit(input.closest("form")!); });

    expect(screen.getByRole("status")).toHaveTextContent("Waking up the download server");
    expect(screen.getByRole("button", { name: "Waiting for server…" })).toBeDisabled();
    expect(screen.queryByRole("alert")).toBeNull();

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("link", { name: "Download MP4" })).toBeVisible();
  });

  it("shows a non-JSON edge rate-limit error without retrying", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("Rate limit exceeded", { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    render(<Downloader />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "https://www.tiktok.com/@a/video/6718335390845095173" } });
    await act(async () => { fireEvent.submit(input.closest("form")!); });
    expect(screen.getByRole("alert")).toHaveTextContent("Too many requests. Wait a minute and try again.");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("stops retrying after 90 seconds and keeps the pasted link", async () => {
    vi.useFakeTimers();
    const url = "https://www.tiktok.com/@a/video/6718335390845095173";
    const fetch = vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      error: { code: "provider_unreachable", message: "Backend did not respond." },
    }), { status: 503 }));
    vi.stubGlobal("fetch", fetch);
    render(<Downloader />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: url } });
    await act(async () => { fireEvent.submit(input.closest("form")!); });
    await act(async () => { await vi.advanceTimersByTimeAsync(90_000); });

    expect(screen.getByRole("alert")).toHaveTextContent("took too long to respond");
    expect(screen.getByRole("button", { name: "Download" })).toBeEnabled();
    expect(input).toHaveValue(url);
    expect(fetch).toHaveBeenCalledTimes(18);
  });
  it("offers each photo and video in an Instagram carousel",async()=>{
    const item={url:"https://backend.example/tunnel",filename:"item",expiresAt:Date.now()+90000};
    vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({data:{status:"ready",images:[item],videos:[{...item,url:item.url+"?video=1",filename:"video.mp4"}]}})}));
    const user=userEvent.setup();render(<Downloader/>);
    await user.type(screen.getByRole("textbox"),"https://www.instagram.com/p/example/");await user.click(screen.getByRole("button",{name:"Download"}));
    expect(await screen.findByRole("link",{name:"Save video 1"})).toHaveAttribute("download","video.mp4");expect(screen.getByRole("link",{name:"Save image 1"})).toBeVisible();expect(screen.getByRole("textbox")).toHaveValue("");
  });
  it("shows image downloads and clears a successful link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { status: "ready", images: [{ url: "https://backend.example/tunnel", filename: "image-1", expiresAt: Date.now()+90000 }] } }) }));
    const user=userEvent.setup(); render(<Downloader />);
    await user.type(screen.getByRole("textbox"), "https://www.tiktok.com/@4kwallpapers85/photo/7688136271289388310");
    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(await screen.findByRole("link", { name: "Save image 1" })).toHaveAttribute("href", "https://backend.example/tunnel");
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
  it("shows an anonymous direct download and handles expired links", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true,json:async()=>({data:{status:"ready",videoId:"6718335390845095173",directDownload:{url:"http://127.0.0.1:9000/tunnel?test=fixture",filename:"fixture.mp4",expiresAt:Date.now()-1000}}})}));
    const user=userEvent.setup();render(<Downloader />);
    await user.type(screen.getByRole("textbox"),"https://www.tiktok.com/@a/video/6718335390845095173");
    await user.click(screen.getByRole("button",{name:"Download"}));
    const link=await screen.findByRole("link",{name:"Download MP4"});
    expect(link).toHaveAttribute("download","fixture.mp4");
    expect(screen.getByRole("textbox")).toHaveValue("");
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
    expect(screen.getByRole("textbox")).not.toHaveValue("");
  });
});
