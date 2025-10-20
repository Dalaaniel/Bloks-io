'use client';

import { doc, runTransaction, getDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const COUNTER_COLLECTION = 'onlineCounter';
const COUNTER_DOC_ID = 'singleton';

const counterDocRef = doc(db, COUNTER_COLLECTION, COUNTER_DOC_ID);

// Ensure the counter document exists
const initializeCounter = async () => {
    const docSnap = await getDoc(counterDocRef);
    if (!docSnap.exists()) {
        try {
            await runTransaction(db, async (transaction) => {
                const docInTransaction = await transaction.get(counterDocRef);
                if (!docInTransaction.exists()) {
                    transaction.set(counterDocRef, { onlineUsers: [] });
                }
            });
        } catch (e) {
            console.error("Could not initialize online counter:", e);
        }
    }
};

initializeCounter();

export const incrementOnlineUsers = async (uid: string): Promise<void> => {
    try {
        await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterDocRef);
            if (!counterDoc.exists()) {
                transaction.set(counterDocRef, { onlineUsers: [uid] });
                return;
            }
            // Use arrayUnion to safely add the UID if it doesn't exist
            transaction.update(counterDocRef, { onlineUsers: arrayUnion(uid) });
        });
    } catch (e) {
        console.error("Transaction failed (increment): ", e);
    }
};


export const decrementOnlineUsers = async (uid: string): Promise<void> => {
    try {
        await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterDocRef);
            if (!counterDoc.exists()) {
                return;
            }
            // Use arrayRemove to safely remove the UID
            transaction.update(counterDocRef, { onlineUsers: arrayRemove(uid) });
        });
    } catch (e) {
        console.error("Transaction failed (decrement): ", e);
    }
};

export const getOnlineUsersCount = async (): Promise<number> => {
    try {
        const docSnap = await getDoc(counterDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return data.onlineUsers?.length || 0;
        }
        return 0;
    } catch (error) {
        console.error("Error fetching online count:", error);
        return 0;
    }
};
