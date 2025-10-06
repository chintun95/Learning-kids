// test/data/child.ts
import { Child } from "@/types/types";

const childData: Child[] = [
  {
    id: "child-01",
    firstName: "Emma",
    lastName: "Johnson",
    activityStatus: "active",
    profilePin: "1234",
    profilePicture: require("@/assets/profile-icons/avatar1.png"),
    dateOfBirth: "2014-05-22",
    emergencyContact: {
      name: "Sarah Johnson",
      relationship: "Mother",
      phoneNumber: "555-123-4567",
      streetAddress: "123 Maple Street",
      city: "Chicago",
      state: "IL",
    },
  },
  {
    id: "child-02",
    firstName: "Liam",
    lastName: "Smith",
    activityStatus: "inactive",
    profilePin: "0077",
    profilePicture: require("@/assets/profile-icons/avatar2.png"),
    dateOfBirth: "2013-09-15",
    emergencyContact: {
      name: "Robert Smith",
      relationship: "Father",
      phoneNumber: "555-987-6543",
      streetAddress: "456 Oak Avenue",
      city: "Dallas",
      state: "TX",
    },
  },
  {
    id: "child-03",
    firstName: "Olivia",
    lastName: "Brown",
    activityStatus: "pending",
    profilePin: null,
    profilePicture: require("@/assets/profile-icons/avatar3.png"),
    dateOfBirth: "2015-03-09",
    emergencyContact: {
      name: "Rachel Brown",
      relationship: "Mother",
      phoneNumber: "555-321-7890",
      streetAddress: "789 Pine Road",
      city: "Seattle",
      state: "WA",
    },
  },
  {
    id: "child-04",
    firstName: "Juliet",
    lastName: "Moturi",
    activityStatus: "active",
    profilePin: null,
    profilePicture: require("@/assets/profile-icons/avatar4.png"),
    dateOfBirth: "2016-12-02",
    emergencyContact: {
      name: "Paul Moturi",
      relationship: "Brother",
      phoneNumber: "555-555-1212",
      streetAddress: "101 Elm Street",
      city: "Atlanta",
      state: "GA",
    },
  },
];

export default childData;
