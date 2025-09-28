
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type SerializedCanvasState } from '@/components/canvas/tetris-canvas';

const CANVAS_STATE_DOC_ID = 'singleton';
const CANVAS_STATE_COLLECTION = 'canvasState';

export async function saveCanvasState(state: SerializedCanvasState): Promise<void> {
    try {
        const canvasDocRef = doc(db, CANVAS_STATE_COLLECTION, CANVAS_STATE_DOC_ID);
        await setDoc(canvasDocRef, { 
            state,
            updatedAt: serverTimestamp() 
        }, { merge: true });
    } catch (error) {
        console.error("Error saving canvas state: ", error);
        throw error;
    }
}

export async function loadCanvasState(): Promise<SerializedCanvasState | null> {
    try {
        const canvasDocRef = doc(db, CANVAS_STATE_COLLECTION, CANVAS_STATE_DOC_ID);
        const docSnap = await getDoc(canvasDocRef);
        if (docSnap.exists()) {
            return docSnap.data().state as SerializedCanvasState;
        }
        return null;
    } catch (error) {
        console.error("Error loading canvas state: ", error);
        return null;
    }
}
