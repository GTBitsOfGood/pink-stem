#!/usr/bin/env node

/**
 * Minimal Google Classroom OAuth experiment.
 *
 * Usage:
 *   node docs/spikes/classroom-list-courses.mjs /path/to/client_secret.json
 *
 * The credential file must describe a Google OAuth Desktop app and must remain
 * outside the repository. This script requests read-only course access, starts
 * a temporary loopback callback server, exchanges the authorization code, and
 * lists every Classroom course visible to the consenting account. It does not
 * write credentials or tokens to disk.
 */

import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";

const CLASSROOM_SCOPE =
  "https://www.googleapis.com/auth/classroom.courses.readonly";
const COURSES_ENDPOINT = "https://classroom.googleapis.com/v1/courses";

function fail(message) {
  console.error(`Error: ${message}`);
  process.exitCode = 1;
}

async function readOAuthClient(filePath) {
  let document;
  try {
    document = JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read OAuth client JSON: ${error.message}`);
  }

  const client = document.installed;
  if (!client?.client_id || !client?.client_secret) {
    throw new Error(
      "Credential JSON must contain an OAuth client of type Desktop app."
    );
  }

  return {
    clientId: client.client_id,
    clientSecret: client.client_secret,
    authorizationEndpoint:
      client.auth_uri ?? "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: client.token_uri ?? "https://oauth2.googleapis.com/token",
  };
}

async function startCallbackServer(expectedState) {
  let resolveCode;
  let rejectCode;
  const code = new Promise((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const server = createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");

    if (requestUrl.pathname !== "/oauth2/callback") {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
      return;
    }

    const returnedState = requestUrl.searchParams.get("state");
    const authorizationCode = requestUrl.searchParams.get("code");
    const oauthError = requestUrl.searchParams.get("error");

    if (oauthError) {
      response.writeHead(400, { "Content-Type": "text/plain" });
      response.end(
        "Google authorization was not completed. You may close this tab."
      );
      server.close();
      rejectCode(new Error(`Google authorization failed: ${oauthError}`));
      return;
    }

    if (returnedState !== expectedState || !authorizationCode) {
      response.writeHead(400, { "Content-Type": "text/plain" });
      response.end("Invalid OAuth callback. You may close this tab.");
      server.close();
      rejectCode(
        new Error("OAuth callback state or authorization code was invalid.")
      );
      return;
    }

    response.writeHead(200, { "Content-Type": "text/plain" });
    response.end("Authorization received. Return to the terminal.");
    server.close();
    resolveCode(authorizationCode);
  });

  const redirectUri = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not determine the OAuth callback port."));
        return;
      }

      resolve(`http://127.0.0.1:${address.port}/oauth2/callback`);
    });
  });

  return {
    redirectUri,
    code,
  };
}

async function exchangeCodeForToken(client, code, redirectUri) {
  const response = await fetch(client.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const responseBody = await response.json();
  if (!response.ok || !responseBody.access_token) {
    throw new Error(
      `Token exchange failed (${response.status}): ${JSON.stringify(responseBody)}`
    );
  }

  return responseBody.access_token;
}

async function listCourses(accessToken) {
  const courses = [];
  let pageToken;

  do {
    const url = new URL(COURSES_ENDPOINT);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set(
      "fields",
      "courses(id,name,courseState),nextPageToken"
    );
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const responseBody = await response.json();

    if (!response.ok) {
      throw new Error(
        `Classroom API failed (${response.status}): ${JSON.stringify(responseBody)}`
      );
    }

    courses.push(...(responseBody.courses ?? []));
    pageToken = responseBody.nextPageToken;
  } while (pageToken);

  return courses;
}

async function main() {
  const credentialPath = process.argv[2];
  if (!credentialPath) {
    throw new Error(
      "Provide the absolute path to a Desktop OAuth client-secret JSON file."
    );
  }

  const client = await readOAuthClient(credentialPath);
  const state = randomBytes(24).toString("hex");
  const callback = await startCallbackServer(state);
  const authorizationUrl = new URL(client.authorizationEndpoint);

  authorizationUrl.search = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: callback.redirectUri,
    response_type: "code",
    scope: CLASSROOM_SCOPE,
    state,
    access_type: "online",
    prompt: "consent",
  }).toString();

  console.log(
    "Open this URL in a browser and authorize your personal test account:"
  );
  console.log(authorizationUrl.toString());

  const authorizationCode = await callback.code;
  const accessToken = await exchangeCodeForToken(
    client,
    authorizationCode,
    callback.redirectUri
  );
  const courses = await listCourses(accessToken);

  if (courses.length === 0) {
    console.log("No courses found.");
    return;
  }

  console.log("Courses:");
  for (const course of courses) {
    console.log(`- ${course.name} (${course.id}) [${course.courseState}]`);
  }
}

main().catch((error) =>
  fail(error instanceof Error ? error.message : String(error))
);
