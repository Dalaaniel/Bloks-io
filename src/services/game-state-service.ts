
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
      let newState: Partial<GameState>;

      if (!gameStateDoc.exists()) {
        if (action === 'add') {
          newState = {
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

      const oldState = gameStateDoc.data() as GameState;
      const playerExists = oldState.turnOrder.includes(user.uid);
      
      let newTurnOrder = [...oldState.turnOrder];
      let newPlayerDetails = { ...oldState.playerDetails };
      let newPlayerCount = oldState.playerCount;
      let newTurnIndex = oldState.currentUserTurnIndex;

      if (action === 'add' && !playerExists) {
        newTurnOrder.push(user.uid);
        newPlayerDetails[user.uid] = { email: user.email, team: user.team };
        newPlayerCount++;
      } else if (action === 'remove' && playerExists) {
        const playerIndex = newTurnOrder.indexOf(user.uid);
        newTurnOrder.splice(playerIndex, 1);
        delete newPlayerDetails[user.uid];
        newPlayerCount--;

        // If the player whose turn it was left, advance the turn
        if (playerIndex === oldState.currentUserTurnIndex) {
            newTurnIndex = playerIndex % newTurnOrder.length;
            if (newTurnOrder.length === 0) newTurnIndex = 0;
            transaction.update(gameStateDocRef, { 
                turnEndsAt: Timestamp.fromMillis(Date.now() + TURN_DURATION_MS),
                turnNumber: oldState.turnNumber + 1,
                currentUserTurnIndex: newTurnIndex,
             });
        } else if (playerIndex < oldState.currentUserTurnIndex) {
            // Adjust index if a player before the current one leaves
            newTurnIndex--;
        }
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

    