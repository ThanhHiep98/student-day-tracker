import {
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type FirestoreDataConverter,
  collection,
  doc,
} from 'firebase/firestore';
import { toActivity, toCategory, toHabitGoals } from './firestore-converters';
import type { Activity, Category, HabitGoals } from './types';

/**
 * Where a signed-in user's data lives (plan §2.4):
 *
 *   users/{uid}                    profile (UserProfile)
 *   users/{uid}/activities/{id}    Activity, `id` field = doc id
 *   users/{uid}/categories/{id}    custom Category only (defaults live in code)
 *   users/{uid}/goals/habits       HabitGoals (ADR-008 §2.3), one fixed doc id
 *
 * Every write helper takes a `UserScope`, so nothing can touch another user's
 * path by accident (and firestore.rules would reject it anyway).
 */
export interface UserScope {
  db: Firestore;
  uid: string;
}

const activityConverter: FirestoreDataConverter<Activity> = {
  toFirestore: (activity) => toActivity(activity as Record<string, unknown>) as DocumentData,
  fromFirestore: (snapshot) => toActivity(snapshot.data()),
};

const categoryConverter: FirestoreDataConverter<Category> = {
  toFirestore: (category) => toCategory(category as Record<string, unknown>) as DocumentData,
  fromFirestore: (snapshot) => toCategory(snapshot.data()),
};

const habitGoalsConverter: FirestoreDataConverter<HabitGoals> = {
  toFirestore: (goals) => toHabitGoals(goals as Record<string, unknown>) as DocumentData,
  fromFirestore: (snapshot) => toHabitGoals(snapshot.data()),
};

export function userDoc({ db, uid }: UserScope): DocumentReference {
  return doc(db, 'users', uid);
}

export function activitiesCol({ db, uid }: UserScope): CollectionReference<Activity> {
  return collection(db, 'users', uid, 'activities').withConverter(activityConverter);
}

export function activityDoc(scope: UserScope, id: string): DocumentReference<Activity> {
  return doc(activitiesCol(scope), id);
}

export function categoriesCol({ db, uid }: UserScope): CollectionReference<Category> {
  return collection(db, 'users', uid, 'categories').withConverter(categoryConverter);
}

export function categoryDoc(scope: UserScope, id: string): DocumentReference<Category> {
  return doc(categoriesCol(scope), id);
}

/** The single `users/{uid}/goals/habits` document (ADR-008 §2.3). */
export function habitGoalsDoc({ db, uid }: UserScope): DocumentReference<HabitGoals> {
  return doc(db, 'users', uid, 'goals', 'habits').withConverter(habitGoalsConverter);
}
