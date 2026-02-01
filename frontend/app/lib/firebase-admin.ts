import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  let serviceAccount: any = undefined;

  if (process.env.SERVICE_ACCOUNT_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    } catch (e) {
      console.error("Failed to parse SERVICE_ACCOUNT_JSON", e);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      // Try to require the provided path (only works in Node environments)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      serviceAccount = require(
        process.env.GOOGLE_APPLICATION_CREDENTIALS as string,
      );
    } catch (e) {
      console.error("Failed to load GOOGLE_APPLICATION_CREDENTIALS", e);
    }
  } else {
    try {
      // Fallback to local file if present. This is unsafe for production
      // and should be removed from source control.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      serviceAccount = require("./serviceAccountKey.json");
      console.warn(
        "Using local serviceAccountKey.json. Remove this from source control.",
      );
    } catch (e) {
      // no-op: leave serviceAccount undefined
    }
  }

  if (serviceAccount) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
    // Initialize without explicit credential and let the SDK attempt
    // Application Default Credentials. This may fail if no ADC/environment
    // is configured.
    initializeApp();
  }
}

export const db = getFirestore();
