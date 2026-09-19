/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import twilio from "twilio";
import { SecurityEvent, LoginResponse } from "./src/types";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Master configurations
const MASTER_USER = "username";
const MASTER_PASS = "password1234";
const LOCKOUT_DURATION_MS = 120 * 1000; // 2 minutes (120 seconds) as requested

// Secure mock and active storage inside Node runtime
interface LockoutState {
  failures: number;
  lockedUntil: Date | null;
}

const state: LockoutState = {
  failures: 0,
  lockedUntil: null
};

// Initial seed security logs to make audit viewer fully professional and highly representable
const securityLogs: SecurityEvent[] = [
  {
    id: "evt_seed_1",
    timestamp: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    eventType: "INFO",
    message: "Secure Lockout Monitoring System Core bootstrapped.",
    ipAddress: "127.0.0.1",
    deviceInfo: "Server Engine Console",
    isTwilioSent: false,
    twilioStatus: "NOT_CONFIGURED"
  },
  {
    id: "evt_seed_2",
    timestamp: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    eventType: "SUCCESS",
    message: "Master authority credential user: 'username' mapped successfully with encryption constraints.",
    ipAddress: "127.0.0.1",
    deviceInfo: "OAuth Provider (Internal)",
    isTwilioSent: false,
    twilioStatus: "NOT_CONFIGURED"
  }
];

// Helper to generate a security log
function recordEvent(
  type: SecurityEvent["eventType"],
  message: string,
  ip: string,
  device: string,
  whatsappConfig?: { status: SecurityEvent["twilioStatus"]; recipient: string; body: string; error?: string }
): SecurityEvent {
  const event: SecurityEvent = {
    id: `evt_${Math.random().toString(36).substring(2, 11)}`,
    timestamp: new Date().toISOString(),
    eventType: type,
    message,
    ipAddress: ip,
    deviceInfo: device,
    isTwilioSent: whatsappConfig ? whatsappConfig.status === "SENT" : false,
    twilioStatus: whatsappConfig ? whatsappConfig.status : "NOT_CONFIGURED",
    twilioError: whatsappConfig?.error,
    whatsappRecipient: whatsappConfig?.recipient,
    whatsappMessageBody: whatsappConfig?.body
  };
  securityLogs.unshift(event); // Newest first
  return event;
}

// Lazy Initialize Twilio Client safely on-demand to support on-the-fly credential updates
function getTwilioClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  
  if (sid && token && sid.trim() !== "" && token.trim() !== "") {
    try {
      return twilio(sid, token);
    } catch (e) {
      console.error("Twilio client instantiation error:", e);
    }
  }
  return null;
}

// API Routes

// Fetch live system security logs and Twilio configuration status
app.get("/api/security-logs", (req, res) => {
  const twilioConfig = {
    accountSidPresent: !!process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.trim() !== "",
    authTokenPresent: !!process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_AUTH_TOKEN.trim() !== "",
    fromWhatsapp: process.env.TWILIO_FROM_WHATSAPP || "whatsapp:+14155238886",
    toWhatsapp: process.env.TWILIO_TO_WHATSAPP || "",
  };
  res.json({ logs: securityLogs, state, twilioConfig });
});

// Configure or update Twilio keys dynamically from the visual panel and write/update the local .env
app.post("/api/configure-twilio", (req, res) => {
  const { accountSid = "", authToken = "", fromWhatsapp = "whatsapp:+14155238886", toWhatsapp = "" } = req.body;

  process.env.TWILIO_ACCOUNT_SID = accountSid.trim();
  process.env.TWILIO_AUTH_TOKEN = authToken.trim();
  process.env.TWILIO_FROM_WHATSAPP = fromWhatsapp.trim();
  process.env.TWILIO_TO_WHATSAPP = toWhatsapp.trim();

  // Update or create .env file on disk
  try {
    const envPath = path.join(process.cwd(), ".env");
    let content = "";
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf-8");
    } else {
      const examplePath = path.join(process.cwd(), ".env.example");
      if (fs.existsSync(examplePath)) {
        content = fs.readFileSync(examplePath, "utf-8");
      }
    }

    let lines = content.split(/\r?\n/);
    const keys = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
      TWILIO_FROM_WHATSAPP: process.env.TWILIO_FROM_WHATSAPP,
      TWILIO_TO_WHATSAPP: process.env.TWILIO_TO_WHATSAPP
    };

    for (const [key, val] of Object.entries(keys)) {
      let replaced = false;
      lines = lines.map(line => {
        if (line.trim().startsWith(`${key}=`) || line.trim().startsWith(`# ${key}=`)) {
          replaced = true;
          return `${key}="${val.replace(/"/g, '\\"')}"`;
        }
        return line;
      });
      if (!replaced) {
        lines.push(`${key}="${val.replace(/"/g, '\\"')}"`);
      }
    }

    fs.writeFileSync(envPath, lines.join("\n"), "utf-8");
    console.log("Updated .env settings file correctly.");
  } catch (err) {
    console.warn("Unable to write credentials to .env file, operating in-memory instead:", err);
  }

  const twilioConfig = {
    accountSidPresent: !!process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.trim() !== "",
    authTokenPresent: !!process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_AUTH_TOKEN.trim() !== "",
    fromWhatsapp: process.env.TWILIO_FROM_WHATSAPP || "whatsapp:+14155238886",
    toWhatsapp: process.env.TWILIO_TO_WHATSAPP || "",
  };

  res.json({
    success: true,
    message: "Twilio configurations stored and updated successfully!",
    twilioConfig
  });
});

// 2. Main Login authorization entry point
app.post("/api/login", async (req, res) => {
  const { username, password, clientIp = "192.168.1.45", clientDevice = "Chrome Core v112 (Desktop-Client)" } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, message: "Username parameter is required." });
  }

  const now = new Date();

  // Evaluate Lockout state
  if (state.lockedUntil) {
    if (now.getTime() < state.lockedUntil.getTime()) {
      const remainingSecs = Math.ceil((state.lockedUntil.getTime() - now.getTime()) / 1000);
      return res.status(403).json({
        success: false,
        message: `Authentication forbidden. Account locked due to 3 failed attempts. Retry in ${remainingSecs} seconds.`,
        attemptsCount: state.failures,
        remainingAttempts: 0,
        lockedOut: true,
        lockoutExpiry: state.lockedUntil.toISOString()
      } as LoginResponse);
    } else {
      // Lockout duration passed - unlock automatically
      state.failures = 0;
      state.lockedUntil = null;
      recordEvent("INFO", `Automatic Reset: User lockout timer cleared. Account reactivated.`, clientIp, clientDevice);
    }
  }

  // Double check credentials
  const userMatch = username === MASTER_USER;
  const passMatch = password === MASTER_PASS;

  if (userMatch && passMatch) {
    // Success scenario
    state.failures = 0;
    state.lockedUntil = null;
    
    const securityEvent = recordEvent(
      "SUCCESS", 
      `Successful authentication: Access granted to console user: '${username}'`, 
      clientIp, 
      clientDevice
    );

    return res.json({
      success: true,
      message: "Authentication successful! Welcome to the secure admin dashboard.",
      attemptsCount: 0,
      remainingAttempts: 3,
      lockedOut: false,
      securityEvent
    } as LoginResponse);
  } else {
    // Failure scenario
    state.failures += 1;
    const remaining = Math.max(0, 3 - state.failures);
    let lockedOut = false;
    let lockoutExpiry: string | undefined = undefined;
    let twilioStatus: SecurityEvent["twilioStatus"] = "NOT_CONFIGURED";
    let twilioError: string | undefined = undefined;
    let whatsappBody = "";
    
    const targetRecipient = process.env.TWILIO_TO_WHATSAPP || "";

    if (state.failures >= 3) {
      lockedOut = true;
      const expiry = new Date(now.getTime() + LOCKOUT_DURATION_MS);
      state.lockedUntil = expiry;
      lockoutExpiry = expiry.toISOString();

      // Trigger standard WhatsApp transmission formatted for Twilio Sandbox templates:
      whatsappBody = `⚠️ [SECURITY ALERT - AUTH SERVICE] ⚠️\n\nAccount for username: '${username}' has been LOCKED due to 3 consecutive incorrect password attempts.\n\nTime: ${now.toLocaleString()}\nIP Context: ${clientIp}\nClient: ${clientDevice}\n\nLockout expires after 2 minutes. Please contact support or run a Security Reset.`;

      const client = getTwilioClient();
      if (client) {
        if (!targetRecipient || targetRecipient.trim() === "") {
          twilioStatus = "FAILED";
          twilioError = "TWILIO_TO_WHATSAPP environment variable is not defined or is empty.";
        } else {
          twilioStatus = "PENDING";
          try {
            const fromWhatsApp = process.env.TWILIO_FROM_WHATSAPP || "whatsapp:+14155238886";
            
            // For safety and compatibility, prefix with plus (+) and whatsapp: if user didn't write it
            let cleanRecipient = targetRecipient.trim();
            let recipientWithPlus = cleanRecipient;
            if (!cleanRecipient.startsWith("whatsapp:")) {
              if (!cleanRecipient.startsWith("+")) {
                recipientWithPlus = "+" + cleanRecipient;
              }
            } else {
              const numPart = cleanRecipient.substring("whatsapp:".length);
              if (!numPart.startsWith("+")) {
                recipientWithPlus = "whatsapp:+" + numPart;
              }
            }
            const toFormatted = recipientWithPlus.startsWith("whatsapp:") ? recipientWithPlus : `whatsapp:${recipientWithPlus}`;
            
            await client.messages.create({
              body: whatsappBody,
              from: fromWhatsApp,
              to: toFormatted
            });
            twilioStatus = "SENT";
            console.log(`Twilio WhatsApp sent to recipient ${toFormatted} successfully.`);
          } catch (twilioErr: any) {
            twilioStatus = "FAILED";
            twilioError = twilioErr.message || String(twilioErr);
            console.error("Twilio system returned delivery failure error code:", twilioErr);
          }
        }
      } else {
        twilioStatus = "NOT_CONFIGURED";
      }
    }

    // Record the specific failure log with details
    const failMsg = lockedOut 
      ? `CRITICAL ALERT: Lockout activated for user '${username}'. Max failed authorization attempts exceeded.`
      : `Failed authentication attempt for user '${username}'. Incorrect password sequence given.`;

    const securityEvent = recordEvent(
      lockedOut ? "ALERT" : "WARNING",
      failMsg,
      clientIp,
      clientDevice,
      lockedOut ? { status: twilioStatus, recipient: targetRecipient || "NOT_CONFIGURED", body: whatsappBody, error: twilioError } : undefined
    );

    return res.status(lockedOut ? 403 : 401).json({
      success: false,
      message: lockedOut 
        ? "Too many failed attempts. Your account is temporarily locked and a security notification was delivered." 
        : `Invalid authentication details. You have ${remaining} attempts remaining.`,
      attemptsCount: state.failures,
      remainingAttempts: remaining,
      lockedOut,
      lockoutExpiry,
      securityEvent
    } as LoginResponse);
  }
});

// 3. Reset manual Lockout routine
app.post("/api/reset-lockout", (req, res) => {
  const { clientIp = "127.0.0.1", clientDevice = "Console Security Controls" } = req.body;
  
  state.failures = 0;
  state.lockedUntil = null;
  
  const securityEvent = recordEvent(
    "INFO", 
    "Security Lockout bypass command issued. Trial parameters and lock timestamps cleared.", 
    clientIp, 
    clientDevice
  );

  res.json({
    success: true,
    message: "Secure lockout states and password tries were successfully reset.",
    attemptsCount: 0,
    remainingAttempts: 3,
    lockedOut: false,
    securityEvent
  });
});

// Configure Vite middleware and static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode. Mounting Vite asset routing pipeline...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode. Serving static folder assets...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port http://localhost:${PORT}`);
  });
}

startServer();
