import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import Config from 'react-native-config';

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: Config.GOOGLE_WEB_CLIENT_ID,
    offlineAccess: true,
    iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
  });
};

export interface GoogleSignInResult {
  idToken: string;
  user: {
    email: string;
    name: string | null;
    photo: string | null;
  };
}

export const signInWithGoogle = async (): Promise<GoogleSignInResult> => {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      throw new Error('No ID token received from Google');
    }

    return {
      idToken: response.data.idToken,
      user: {
        email: response.data.user.email,
        name: response.data.user.name,
        photo: response.data.user.photo,
      },
    };
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Sign in cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign in already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Play services not available');
    }
    throw error;
  }
};

export const signOutGoogle = async (): Promise<void> => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    // Ignore sign out errors
  }
};

export const isGoogleSignedIn = async (): Promise<boolean> => {
  return await GoogleSignin.hasPreviousSignIn();
};
