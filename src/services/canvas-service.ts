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
    throw new Error("Could not save canvas state.");
  }
}

export async function loadCanvasState(): Promise<any | null> {
  try {
    const docRef = doc(db, CANVAS_STATE_COLLECTION_ID, CANVAS_STATE_DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log("No canvas state document found!");
      return null;
    }
  } catch (error) {
    console.error("Error loading canvas state: ", error);
    throw new Error("Could not load canvas state.");
  }
}
