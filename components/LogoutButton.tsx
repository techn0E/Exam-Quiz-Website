"use client";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LogoutButton(){

    const router=useRouter();

    async function logout(){

        await supabase.auth.signOut();

        router.push("/");

        router.refresh();

    }

    return(

        <button
        onClick={logout}
        className="px-4 py-2 bg-red-500 rounded text-white"
        >
            Logout
        </button>

    );

}