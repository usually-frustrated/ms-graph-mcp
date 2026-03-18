#!/usr/bin/env node
import { Command } from "@commander-js/extra-typings";
import { initAuth, revokeAuth, getAuthStatus } from "./auth";
import { getConfig, saveConfig } from "./config";
import { startMcpServer } from "./mcp-interface";

const program = new Command();

program
  .name("ms-graph-mcp")
  .description("CLI for JSR-based Microsoft Graph MCP package")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize authentication with Microsoft Graph")
  .action(async () => {
    try {
      await initAuth();
      console.log("Authentication process completed.");
    } catch (error) {
      console.error("Authentication failed:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command("revoke")
  .description("Revoke Microsoft Graph authentication and clear tokens")
  .action(async () => {
    try {
      await revokeAuth();
      console.log("Authentication revoked successfully.");
    } catch (error) {
      console.error("Failed to revoke authentication:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command("permissions")
  .description(
    "Display current authentication status and configured permissions",
  )
  .action(async () => {
    try {
      const authStatus = await getAuthStatus();
      const config = getConfig();
      console.log("--- Microsoft Graph MCP Status ---");
      console.log(`Client ID: ${authStatus.clientId}`);
      console.log(`Tenant ID: ${authStatus.tenantId}`);
      console.log(
        `Authenticated: ${authStatus.isAuthenticated ? "Yes" : "No"}`,
      );
      console.log("\nEnabled Tools:");
      if (config.enabledTools.length > 0) {
        config.enabledTools.forEach((tool) => console.log(`- ${tool}`));
      } else {
        console.log(
          "No specific tools are explicitly enabled in config. All available tools will be used.",
        );
      }
      console.log("----------------------------------");
    } catch (error) {
      console.error("Failed to retrieve status:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command("run")
  .description("Start the MCP server to listen for commands via stdin/stdout")
  .action(async () => {
    console.log("MCP server started. Listening for commands on stdin...");
    // Placeholder for MCP interface logic
    // This will be implemented in src/mcp-interface.ts and called here
    startMcpServer();
  });

program.parse(process.argv);
