import { randomBytes, scrypt } from "node:crypto";

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("Run this command in an interactive terminal so the password can be entered without echoing.");
  process.exit(1);
}

const input = process.stdin;
const salt = randomBytes(16);
let password = "";

process.stdout.write("Shared staff password (hidden): ");
input.setRawMode(true);
input.resume();
input.on("data", async (chunk) => {
  for (const byte of chunk) {
    if (byte === 3) {
      process.stdout.write("\nCancelled.\n");
      process.exit(1);
    }
    if (byte === 13 || byte === 10) {
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      if (password.length < 12) {
        console.error("Use a password with at least 12 characters.");
        process.exit(1);
      }
      scrypt(password, salt, 64, { N: 16_384, r: 8, p: 1 }, (error, derived) => {
        password = "";
        if (error) {
          console.error("Could not derive the password hash.");
          process.exit(1);
        }
        console.log(`STAFF_SHARED_PASSWORD_HASH=scrypt$${salt.toString("hex")}$${derived.toString("hex")}`);
      });
      return;
    }
    if (byte === 8 || byte === 127) {
      password = password.slice(0, -1);
    } else if (byte >= 32) {
      password += Buffer.from([byte]).toString("utf8");
    }
  }
});
