import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type SerializedCanvasState } from '@/components/canvas/tetris-canvas';

const CANVAS_STATE_DOC_ID = 'singleton';
const CANVAS_STATE_COLLECTION = 'canvasState';


interface CanvasDocument {
    state: SerializedCanvasState;
    updatedAt: Timestamp;
}

export async function saveCanvasState(state: SerializedCanvasState): Promise<void> {
    try {
        const canvasDocRef = doc(db, CANVAS_STATE_COLLECTION, CANVAS_STATE_DOC_ID);
        await setDoc(canvasDocRef, { 
            state,
            updatedAt: serverTimestamp() 
        });
    } catch (error) {
        console.error("Error saving canvas state: ", error);
        // Depending on requirements, you might want to throw the error
        // or handle it gracefully (e.g., by notifying the user).
    }
}
