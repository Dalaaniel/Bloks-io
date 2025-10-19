
'use client';

import { ref, set, onValue, onDisconnect, serverTimestamp, goOffline, goOnline } from 'firebase/database';
import { rtdb } from '@/lib/firebase';

export const updateUserPresence = (uid: string) => {
  if (!uid) return;

  const userStatusDatabaseRef = ref(rtdb, '/status/' + uid);

  const isOfflineForDatabase = {
      state: 'offline',
      last_changed: serverTimestamp(),
  };

  const isOnlineForDatabase = {
      state: 'online',
      last_changed: serverTimestamp(),
  };

  const connectedRef = ref(rtdb, '.info/connected');

  onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === false) {
          return;
      }

      onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
          set(userStatusDatabaseRef, isOnlineForDatabase);
          goOnline(rtdb);
      });
  });
};

export const disconnectUserPresence = (uid: string) => {
    if (!uid) return;
    const userStatusDatabaseRef = ref(rtdb, '/status/' + uid);
    const isOfflineForDatabase = {
        state: 'offline',
        last_changed: serverTimestamp(),
    };
    set(userStatusDatabaseRef, isOfflineForDatabase);
    goOffline(rtdb);
}
