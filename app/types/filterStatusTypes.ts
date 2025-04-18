export enum FilterStatusKey {
    Pending = "pending",
    Working = "working",
    Done    = "done",
  }
  
  export interface Statuses {
    pending: boolean;
    working: boolean;
    done: boolean;
  }
  