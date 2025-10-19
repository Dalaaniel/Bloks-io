
'use client';

import { ref, set, onValue, onDisconnect, goOffline, goOnline, serverTimestamp } from 'firebase/database';
import { doc } from 'firebase/firestore';
import { db, rtdb } from '@/lib/firebase';
import { type User } from '@/context/auth-context';

export const updateUserPresence = (user: User) => {
  if (!user) return;

  const uid = user.uid;
  const userStatusDatabaseRef = ref(rtdb, '/status/' + uid);
  // Note: We are using firestore `doc` but rtdb `serverTimestamp`. This is a bit mixed.
  // The original implementation had this structure. Let's see if we can make it consistent.
  // The RTDB serverTimestamp is an object, while Firestore's is a function call.
  // The RTDB set() function will resolve the serverTimestamp object.

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
          // This can happen if the client loses network connectivity.
          // The onDisconnect handler will take care of marking the user as offline.
          return;
      }

      // We're connected (or reconnected)!
      // Update our presence state in the Realtime Database.
      // onDisconnect() will be triggered once we disconnect.
      onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
          set(userStatusDatabaseRef, isOnlineForDatabase);
      });
  });

  // We are also writing to a firestore collection named 'status' in french header.
  // Let's assume we want to write to RTDB for presence and query RTDB for counts.
  // The header component is already querying Firestore 'status' collection.
  // This is inconsistent. I will correct the header to query RTDB.
  // However, the error is about imports. Let's fix that first.
  // The code used `userStatusFirestoreRef` which used `doc(rtdb.firestore...)`
  // `rtdb` doesn't have a `firestore` property. It should be `db` from `@/lib/firebase`.

  // Let's stick to the original logic which was writing to BOTH RTDB and Firestore
  const userStatusFirestoreRef = doc(db, 'status', uid);
  set(userStatusDatabaseRef, isOnlineForDatabase); // This is RTDB set. It was missing.
  // The below is not a function. It's a firestore function but we are using RTDB set.
  // Let's use firestore setDoc
  // import { setDoc } from 'firebase/firestore'
  // But presence-service only imports from database.

  // Let's re-read the original broken code.
  // It tried to import `doc` and `serverTimestamp` from `firebase/database`. Error.
  // It used `doc(rtdb.firestore, '/status/' + uid)`. This is wrong. `rtdb` is a database instance.
  // It should be `doc(db, 'status', uid)`. `db` is the firestore instance.
  // It also used `serverTimestamp()` in isOfflineForDatabase, which should be from firestore if we write to firestore.
  // But onDisconnect is an RTDB feature.

  // The logic is tangled. Let's untangle it.
  // Presence should be handled by RTDB.
  // The player count in the header should query RTDB.
  goOnline(rtdb);
};

export const disconnectUserPresence = () => {
    goOffline(rtdb);
}
