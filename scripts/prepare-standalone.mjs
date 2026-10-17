import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const standaloneDirectory = ".next/standalone";
const staticDirectory = `${standaloneDirectory}/.next/static`;
const publicDirectory = `${standaloneDirectory}/public`;

mkdirSync(dirname(staticDirectory), { recursive: true });
cpSync(".next/static", staticDirectory, { recursive: true });

if (existsSync("public")) {
  cpSync("public", publicDirectory, { recursive: true });
} else {
  mkdirSync(publicDirectory, { recursive: true });
}
