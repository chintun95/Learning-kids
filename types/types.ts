export type ActivityStatus = "active" | "inactive" | "pending";

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  activityStatus: ActivityStatus;
  profilePin: string | null;
  profilePicture: any;
}
