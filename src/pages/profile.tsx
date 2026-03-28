import { useUser, useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center py-10">
      <div className="bg-white/80 backdrop-blur-md shadow-lg rounded-2xl p-8 w-[350px] text-center border border-gray-200">
        
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Profile
        </h2>

        <div className="mb-6">
          <p className="text-lg font-medium text-gray-700">
            {user?.fullName || "User"}
          </p>
          <p className="text-sm text-gray-500">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl transition duration-200 shadow-md"
        >
          Logout
        </button>

      </div>
    </div>
  );
}