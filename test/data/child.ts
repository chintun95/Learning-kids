import { Child } from "@/types/types";

const childData: Child[] = [
  {
    id: "child-001",
    firstName: "Emma",
    lastName: "Johnson",
    activityStatus: "active",
    profilePin: null,
    profilePicture: require("@/assets/profile-icons/avatar1.png"),
  },
  {
    id: "child-002",
    firstName: "Liam",
    lastName: "Smith",
    activityStatus: "pending",
    profilePin: null,
    profilePicture: require("@/assets/profile-icons/avatar2.png"),
  },
  {
    id: "child-003",
    firstName: "Olivia",
    lastName: "Brown",
    activityStatus: "inactive",
    profilePin: null,
    profilePicture: require("@/assets/profile-icons/avatar3.png"),
  },
  {
    id: "child-004",
    firstName: "Paul",
    lastName: "Moturi",
    activityStatus: "active",
    profilePin: "123",
    profilePicture: require("@/assets/profile-icons/avatar3.png"),
  },
];

export default childData;
