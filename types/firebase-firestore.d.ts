declare module 'firebase/firestore' {
  export interface DocumentData {
    [key: string]: any;
  }

  export class Timestamp {
    static now(): Timestamp;
    toDate(): Date;
  }

  export interface QueryConstraint {}

  export interface DocumentReference<T = DocumentData> {
    id?: string;
  }

  export interface CollectionReference<T = DocumentData> {}

  export interface QueryDocumentSnapshot<T = DocumentData> {
    id: string;
    data(): T;
  }

  export interface DocumentSnapshot<T = DocumentData> {
    id: string;
    exists(): boolean;
    data(): T;
  }

  export interface QuerySnapshot<T = DocumentData> {
    docs: Array<QueryDocumentSnapshot<T>>;
    size: number;
  }

  export interface WriteBatch {
    delete(reference: DocumentReference<any>): void;
    commit(): Promise<void>;
  }

  export function getFirestore(...args: any[]): any;
  export function collection(...args: any[]): CollectionReference<any>;
  export function query(...args: any[]): any;
  export function where(...args: any[]): QueryConstraint;
  export function orderBy(...args: any[]): QueryConstraint;
  export function limit(...args: any[]): QueryConstraint;
  export function doc(...args: any[]): DocumentReference<any>;
  export function addDoc(...args: any[]): Promise<any>;
  export function setDoc(...args: any[]): Promise<void>;
  export function updateDoc(...args: any[]): Promise<void>;
  export function deleteDoc(...args: any[]): Promise<void>;
  export function getDocs(...args: any[]): Promise<QuerySnapshot<any>>;
  export function getDoc(...args: any[]): Promise<DocumentSnapshot<any>>;
  export function getDocFromServer(...args: any[]): Promise<DocumentSnapshot<any>>;
  export function onSnapshot(
    reference: any,
    next: (snapshot: any) => void,
    error?: (error: any) => void,
  ): () => void;
  export function serverTimestamp(): Timestamp;
  export function writeBatch(...args: any[]): WriteBatch;
}
