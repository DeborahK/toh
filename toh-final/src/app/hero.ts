export interface Hero {
  id: number;
  name: string;
}

type ActionType = 'add' | 'update' | 'delete';

// DJK3 Defines hero + action type
// You could move this to a shared file
// and reuse it for every entity in the application
export interface Action<T> {
  hero: T;
  action: ActionType;
}
