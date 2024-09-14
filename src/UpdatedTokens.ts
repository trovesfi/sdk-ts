import fs from "fs";
import path from "path";
import { TokenInfo } from "@/interfaces";
import { FatalError } from "../dist";
import chokidar from "chokidar";
import { Console } from "winston/lib/winston/transports";

// Path to the tokens.json file
const TOKENS_PATH = path.resolve(__dirname, "./data/tokens.json");

// Variable to cache tokens
let cachedTokens: TokenInfo[] = [];



// Function to load tokens from file
async function loadTokens(): Promise<TokenInfo[]> {
  try {
    const RefreshedToken = fs.readFileSync(TOKENS_PATH, "utf-8");
    cachedTokens = JSON.parse(RefreshedToken) as TokenInfo[];
    console.log("Tokens updated successfully.");
    console.log("Tokens information:", cachedTokens);
    return JSON.parse(RefreshedToken) as TokenInfo[];
  } catch (error) {
    console.error("Failed to load tokens:", error);
    throw new FatalError("Failed to load tokens");
  }
}

// Function to get the Updated cached tokens :)
export async function getNewTokens(): Promise<TokenInfo[]> {
  return  cachedTokens;
}

// Initialize file watcher
function startFileWatcher() {
  const watcher = chokidar.watch(TOKENS_PATH, {
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on("change", () => {
    console.log("Tokens file changed, refreshing tokens...");
    loadTokens().catch((err) => {
      console.error("Error refreshing tokens:", err);
    });
  });

  console.log("File watcher started for tokens file.");
}

// Start file watcher and initial token load
startFileWatcher();
loadTokens().catch((err) => {
  console.error("Error loading initial tokens:", err);
});


