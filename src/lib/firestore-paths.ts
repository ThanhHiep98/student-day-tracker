import {
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type FirestoreDataConverter,
  collection,
  doc,
} from 'firebase/firestore';
import {
  toActivity,
  toAiComment,
  toCategory,
  toDayRating,
  toDaySummary,
  toHabitGoals,
} from './firestore-converters';
import type {
  Activity,
  AiComment,
  Category,
  DayRating,
  DaySummary,
  HabitGoals,
  IsoDate,
} from './types';

/**
 * Where a signed-in user's data lives (plan §2.4):
 *
 *   users/{uid}                    profile (UserProfile)
 *   users/{uid}/activities/{id}    Activity, `id` field = doc id
 *   users/{uid}/categories/{id}    custom Category only (defaults live in code)
 *   users/{uid}/goals/habits       HabitGoals (ADR-008 §2.3), one fixed doc id
 *   users/{uid}/dayRatings/{date}  DayRating (ADR-009 §2.3), doc id = IsoDate
 *   users/{uid}/aiComments/{date}  AiComment (ADR-009 §2.3 F3), doc id = IsoDate
 *   users/{uid}/summaries/{date}   DaySummary (ADR-009 §2.3, slice 8a), doc id = IsoDate
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

const dayRatingConverter: FirestoreDataConverter<DayRating> = {
  toFirestore: (rating) => toDayRating(rating as Record<string, unknown>) as DocumentData,
  fromFirestore: (snapshot) => toDayRating(snapshot.data()),
};

const aiCommentConverter: FirestoreDataConverter<AiComment> = {
  toFirestore: (comment) => toAiComment(comment as Record<string, unknown>) as DocumentData,
  fromFirestore: (snapshot) => toAiComment(snapshot.data()),
};

const daySummaryConverter: FirestoreDataConverter<DaySummary> = {
  toFirestore: (summary) => toDaySummary(summary as Record<string, unknown>) as DocumentData,
  fromFirestore: (snapshot) => toDaySummary(snapshot.data()),
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

export function dayRatingsCol({ db, uid }: UserScope): CollectionReference<DayRating> {
  return collection(db, 'users', uid, 'dayRatings').withConverter(dayRatingConverter);
}

/** `users/{uid}/dayRatings/{date}` (ADR-009 §2.3) — doc id is the IsoDate. */
export function dayRatingDoc(scope: UserScope, date: IsoDate): DocumentReference<DayRating> {
  return doc(dayRatingsCol(scope), date);
}

export function aiCommentsCol({ db, uid }: UserScope): CollectionReference<AiComment> {
  return collection(db, 'users', uid, 'aiComments').withConverter(aiCommentConverter);
}

/** `users/{uid}/aiComments/{date}` (ADR-009 §2.3 F3) — doc id is the IsoDate. */
export function aiCommentDoc(scope: UserScope, date: IsoDate): DocumentReference<AiComment> {
  return doc(aiCommentsCol(scope), date);
}

export function summariesCol({ db, uid }: UserScope): CollectionReference<DaySummary> {
  return collection(db, 'users', uid, 'summaries').withConverter(daySummaryConverter);
}

/** `users/{uid}/summaries/{date}` (ADR-009 §2.3, slice 8a) — doc id is the IsoDate; the
 * only document a linked parent will be allowed to read (parent read access is 8b). */
export function summaryDoc(scope: UserScope, date: IsoDate): DocumentReference<DaySummary> {
  return doc(summariesCol(scope), date);
}
