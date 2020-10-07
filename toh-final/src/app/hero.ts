export class Hero {
  id: number;
  name: string;
}

type ActionType = 'add' | 'update' | 'delete';

// You could move this to a shared file
// and reuse it for every entity in the application
export interface Action<T> {
  hero: T;
  action: ActionType
}
