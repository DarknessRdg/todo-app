export interface Todo {
  name: string;
  done: boolean;
  createdAt: Date;
}

export interface DateOnly {
  day: number;
  month: number;
  year: number;
}
