export interface EmergencyContact {
  name: string;
  relationship: string;
  phoneNumber: string;
  streetAddress: string;
  city: string;
  state: string;
}

export interface Child {
  id: string;
  firstName: string;
  lastName: string;
  activityStatus: "active"| "pending" | "inactive" ;
  profilePin: string | null;
  profilePicture: any;
  dateOfBirth: string;
  emergencyContact: EmergencyContact;
}

export interface Session {
  id: string;
  childId: string; // reference to child.id
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm:ss, cannot be null
  endTime: string | null; // HH:mm:ss, can be null
  sessionStatus: "In Progress" | "Completed" | "Stalled";
  activityType: string; // refernces game.title | quiz.title | lesson.title
  sessionDetails: string;
}

export interface Parent {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  childrenUnderAccount: number; // maximum of 12 allowed
}