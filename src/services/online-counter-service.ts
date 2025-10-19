'use client';

import { doc, runTransaction, getDoc } from 'firebase/firestore';
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
                transaction.set(counterDocRef, { count: 0 });
            });
        } catch (e) {
            console.error("Could not initialize online counter:", e);
        }
    }
};

initializeCounter();


export const incrementOnlineUsers = async (): Promise<void> => {
    try {
        await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterDocRef);
            if (!counterDoc.exists()) {
                transaction.set(counterDocRef, { count: 1 });
                return;
            }
            const newCount = (counterDoc.data().count || 0) + 1;
            transaction.update(counterDocRef, { count: newCount });
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
    }
};


export const decrementOnlineUsers = async (): Promise<void> => {
    try {
        await runTransaction(db, async (transaction) => {
            const counterDoc = await transaction.get(counterDocRef);
            if (!counterDoc.exists()) {
                transaction.set(counterDocRef, { count: 0 });
                return;
            }
            const newCount = Math.max(0, (counterDoc.data().count || 0) - 1);
            transaction.update(counterDocRef, { count: newCount });
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
    }
};
