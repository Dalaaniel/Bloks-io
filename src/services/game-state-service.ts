
'use client';
import { doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type User } from '@/context/auth-context';

export interface GameState {
  playerCount: number;
  turnOrder: string[]; // array of uids
  playerDetails: { [uid: string]: { email: string | null; team: 'red' | 'blue' } };
  currentUserTurnIndex: number;
  turnEndsAt: Timestamp;
  turnNumber: number;
}

const TURN_DURATION_MS = 60 * 1000; // 1 minute

const gameStateDocRef = doc(db, 'gameState', 'singleton');

async function managePlayer(user: User, action: 'add' | 'remove') {
  try {
    await runTransaction(db, async (transaction) => {
      const gameStateDoc = await transaction.get(gameStateDocRef);
      
      if (!gameStateDoc.exists()) {
        // First player ever. Create the game state.
        if (action === 'add') {
          const newState: GameState = {
            playerCount: 1,
            turnOrder: [user.uid],
            playerDetails: { [user.uid]: { email: user.email, team: user.team } },
            currentUserTurnIndex: 0,
            turnEndsAt: Timestamp.fromMillis(Date.now() + TURN_DURATION_MS),
            turnNumber: 1,
          };
          transaction.set(gameStateDocRef, newState);
        }
        return; 
      }

      // Game state exists, modify it.
      const oldState = gameStateDoc.data() as GameState;
      let newTurnOrder = [...oldState.turnOrder];
      let newPlayerDetails = { ...oldState.playerDetails };
      
      const playerExists = newTurnOrder.includes(user.uid);
      const removingCurrentPlayer = playerExists && oldState.turnOrder[oldState.currentUserTurnIndex] === user.uid;

      if (action === 'add' && !playerExists) {
        newTurnOrder.push(user.uid);
        newPlayerDetails[user.uid] = { email: user.email, team: user.team };
      } else if (action === 'remove' && playerExists) {
        newTurnOrder = newTurnOrder.filter(uid => uid !== user.uid);
        delete newPlayerDetails[user.uid];
      }

      const newPlayerCount = newTurnOrder.length;
      let newTurnIndex = oldState.currentUserTurnIndex;
      let newTurnNumber = oldState.turnNumber;
      let newTurnEndsAt = oldState.turnEndsAt;

      if (newPlayerCount === 0) {
        // Last player left, reset the game state but keep the doc.
        const resetState: GameState = {
            playerCount: 0,
            turnOrder: [],
            playerDetails: {},
            currentUserTurnIndex: 0,
            turnEndsAt: Timestamp.now(),
            turnNumber: 0,
        };
        transaction.set(gameStateDocRef, resetState);
        return;
      }
      
      // If the current player was removed, or if the index is now out of bounds.
      if (removingCurrentPlayer || newTurnIndex >= newPlayerCount) {
        newTurnIndex = oldState.currentUserTurnIndex % newPlayerCount;
        newTurnNumber = oldState.turnNumber + 1;
        newTurnEndsAt = Timestamp.fromMillis(Date.now() + TURN_DURATION_MS);
      }

      const finalState = {
        playerCount: newPlayerCount,
        turnOrder: newTurnOrder,
        playerDetails: newPlayerDetails,
        currentUserTurnIndex: newTurnIndex,
        turnNumber: newTurnNumber,
        turnEndsAt: newTurnEndsAt,
      };

      transaction.update(gameStateDocRef, finalState);
    });
  } catch (error) {
    console.error(`Error ${action}ing player:`, error);
  }
}

export async function addPlayer(user: User) {
  await managePlayer(user, 'add');
}

export async function removePlayer(user: User) {
  await managePlayer(user, 'remove');
}

export async function passTurn(currentUserId: string) {
  try {
    await runTransaction(db, async (transaction) => {
      const gameStateDoc = await transaction.get(gameStateDocRef);
      if (!gameStateDoc.exists()) return;

      const state = gameStateDoc.data() as GameState;
      
      if (state.turnOrder[state.currentUserTurnIndex] !== currentUserId || state.playerCount <= 1) {
          // Not your turn to pass, or you are the only one
          return;
      }
      
      const newIndex = (state.currentUserTurnIndex + 1) % state.playerCount;
      transaction.update(gameStateDocRef, {
          currentUserTurnIndex: newIndex,
          turnEndsAt: Timestamp.fromMillis(Date.now() + TURN_DURATION_MS),
          turnNumber: state.turnNumber + 1,
      });
    });
  } catch (error) {
    console.error("Error passing turn: ", error);
  }
}
