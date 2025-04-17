export type Dependency = {
  id: string;
  title: string;
  status: string;
  chainName: string;
};

type SimpleUser = {
  id: string;
  name: string | null;
  email: string;
  imageUrl?: string | null;
};

type Assignee = SimpleUser & { role: "worker" | "approver" };

export type Step = {
  id: string;
  title: string;
  dependencies: Dependency[];
  assignees: Assignee[];
  status?: string;
  chainName?: string;
  local?: boolean;
  order?: number;
};
