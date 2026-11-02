import { describe, expect, it } from "vitest";
import { isPublicAddress } from "@/lib/security/network";
describe("DNS address validation", () => {
  it.each(["127.0.0.1", "0.0.0.0", "10.0.0.1", "172.16.1.1", "192.168.0.1", "169.254.169.254", "100.64.0.1", "224.0.0.1", "192.0.2.1", "198.18.0.1", "::1", "::", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2002:7f00:1::", "2001:0:4136:e378::1", "invalid"])("blocks %s", (ip) => expect(isPublicAddress(ip)).toBe(false));
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("accepts public unicast %s", (ip) => expect(isPublicAddress(ip)).toBe(true));
});
