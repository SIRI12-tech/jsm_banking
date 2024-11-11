'use server'

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";

export const signIn = async ({email, password}: signInProps) => {
    try {
        const { account } = await createAdminClient();

        // Create session using admin client
        const session = await account.createEmailPasswordSession(email, password);

        // Set the session cookie
        (await cookies()).set("appwrite-session", session.secret, {
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        });

        // Create a new session client with the cookie we just set
        const sessionClient = await createSessionClient();

        // Get user details using session client
        if (sessionClient.account) {
            const user = await sessionClient.account.get();
            return parseStringify(user);
        } else {
            throw new Error('Account object is not available.');
        }

    } catch (error) {
        console.error('Error during sign in:', error);
        return null;
    }
}

export const signUp = async (userData: SignUpParams) => {
    const { firstName, lastName, email, password } = userData; 

    try {
        const { account } = await createAdminClient();

        const newUserAccount = await account.create(ID.unique(), email, password, `${firstName} ${lastName}`);

        const session = await account.createEmailPasswordSession(email, password);

        (await cookies()).set("appwrite-session", session.secret, {
          path: "/",
          httpOnly: true,
          sameSite: "strict",
          secure: true,
        });

        return parseStringify(newUserAccount);
    } catch (error) {
        console.error('Error', error);
    }
}


export async function getLoggedInUser() {
    try {
      const { account } = await createSessionClient();

      if (account) {
        const user = await account.get();

        return parseStringify(user);
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error', error);
      return null;
    }
}

export const logoutAccount = async () => {
    try {
        const { account } = await createSessionClient();

        if (account) {
            (await cookies()).delete('appwrite-session');

            await account.deleteSession('current');
        }
    } catch (error) {
        return null;
    }
}