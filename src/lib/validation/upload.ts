import { z } from "zod";
import { tiktokUrlSchema } from "./tiktok";
export const uploadSchema = z.object({
  title: z.string().trim().min(1, "Give your video a title.").max(200),
  filename: z.string().min(1).max(255).regex(/\.mp4$/i, "Choose an MP4 file."),
  mimeType: z.literal("video/mp4", { error: "Only MP4 videos are supported." }),
  fileSize: z.number().int().min(16).max(26_214_400, "Choose a video smaller than 25 MB."),
  tiktokUrl: z.union([tiktokUrlSchema, z.literal("")]).optional(),
  rightsAttested: z.literal(true, { error: "Confirm that you have permission to upload and share this original." }),
  publicMetadata: z.boolean().default(false), shareDownload: z.boolean().default(false),
});
