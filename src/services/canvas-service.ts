
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type SerializedCanvasState } from '@/components/canvas/tetris-canvas';

const CANVAS_STATE_DOC_ID = 'singleton';

interface CanvasDocument {
    state: SerializedCanvasState;
    updatedAt: Timestamp;
}

export async function saveCanvasState(state: SerializedCanvasState): Promise<void> {
    try {
        const canvasDocRef = doc(db, 'canvasState', CANVAS_STATE_DOC_ID);
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

export async function loadCanvasState(): Promise<SerializedCanvasState | null> {
    try {
        const canvasDocRef = doc(db, 'canvasState', CANVAS_STATE_DOC_ID);
        const docSnap = await getDoc(canvasDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as CanvasDocument;
            // The state is nested inside the 'state' field
            return data.state;
        } else {
            console.log("No canvas state document found, starting fresh.");
            return null;
        }
    } catch (error) {
        console.error("Error loading canvas state: ", error);
        return null;
    }
}
