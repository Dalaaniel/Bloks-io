
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
      
      // Case 1: No game state exists yet. Create it for the first player.
      if (!gameStateDoc.exists()) {
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
        return; // Nothing to do if removing from a non-existent game
      }

      // Case 2: Game state exists. Add or remove a player.
      const oldState = gameStateDoc.data() as GameState;
      let newTurnOrder = [...oldState.turnOrder];
      let newPlayerDetails = { ...oldState.playerDetails };
      
      const playerExists = newTurnOrder.includes(user.uid);
      
      if (action === 'add' && !playerExists) {
        newTurnOrder.push(user.uid);
        newPlayerDetails[user.uid] = { email: user.email, team: user.team };
      } else if (action === 'remove' && playerExists) {
        newTurnOrder = newTurnOrder.filter(uid => uid !== user.uid);
        delete newPlayerDetails[user.uid];
      }

      const newPlayerCount = newTurnOrder.length;
      let newTurnIndex = oldState.currentUserTurnIndex;

      // If the player being removed was the current turn player, advance the turn.
      if (action === 'remove' && playerExists) {
        const removedPlayerIndex = oldState.turnOrder.indexOf(user.uid);
        if (removedPlayerIndex === oldState.currentUserTurnIndex) {
          // Turn advances, so reset the timer
          transaction.update(gameStateDocRef, {
            turnEndsAt: Timestamp.fromMillis(Date.now() + TURN_DURATION_MS),
            turnNumber: oldState.turnNumber + 1,
          });
          // The new index will be calculated below based on the new turn order.
        }
      }
      
      // Recalculate the current turn index safely.
      if (newPlayerCount > 0) {
        newTurnIndex = oldState.currentUserTurnIndex % newPlayerCount;
      } else {
        newTurnIndex = 0; // If no players, reset to 0
      }

      transaction.update(gameStateDocRef, {
        playerCount: newPlayerCount,
        turnOrder: newTurnOrder,
        playerDetails: newPlayerDetails,
        currentUserTurnIndex: newTurnIndex,
      });
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
