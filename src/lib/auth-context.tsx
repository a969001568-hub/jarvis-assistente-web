import {createContext,useContext,type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
import type {AuthState} from './auth-session';
export const AuthContext=createContext<AuthState>({user:null,ready:false});
export const useJarvisAuth=()=>useContext(AuthContext);
export function JarvisAuthProvider({value,children}:{value:AuthState;children:ReactNode}) {return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;}
