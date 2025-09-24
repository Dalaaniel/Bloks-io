
'use server';

import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const CANVAS_STATE_DOC_ID = 'singleton';
const CANVAS_STATE_COLLECTION_ID = 'canvasState';

export async function saveCanvasState(state: any): Promise<void> {
  try {
    const stateWithTimestamp = {
      ...state,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, CANVAS_STATE_COLLECTION_ID, CANVAS_STATE_DOC_ID), stateWithTimestamp);
  } catch (error) {
    console.error("Error saving canvas state: ", error);
    // We don't rethrow here to avoid crashing the app on a failed save.
    // In a real app, you might want more robust error handling like retries or user notifications.
  }
}

export async function loadCanvasState(): Promise<any | null> {
  try {
    const docRef = doc(db, CANVAS_STATE_COLLECTION_ID, CANVAS_STATE_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // The `updatedAt` field is a Firestore Timestamp object, which is not a
      // plain serializable object and cannot be passed from Server to Client Components.
      // We don't use it on the client, so we can safely delete it.
      delete data.updatedAt;
      return data;
    } else {
      console.log("No canvas state document found, starting fresh.");
      return null;
    }
  } catch (error) {
    console.error("Error loading canvas state (this is often a permissions issue): ", error);
    // Don't throw an error, just return null to start with a fresh canvas.
    // This prevents the app from crashing if Firestore rules are not set up.
    return null;
  }
}
