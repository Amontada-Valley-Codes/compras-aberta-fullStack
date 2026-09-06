import UserProfile from "@/app/components/user-profile";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "user-profile",
};


const UserProfilePage = () => {

  return (
    <>
        <UserProfile/>
    </>
  );
};

export default UserProfilePage;
