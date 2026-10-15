import {createContext,useContext,type ReactNode} from 'react';
import type {User} from '@supabase/supabase-js';
export const AuthContext=createContext<{user:User|null;ready:boolean}>({user:null,ready:false});
export const useJarvisAuth=()=>useContext(AuthContext);
export function JarvisAuthProvider({value,children}:{value:{user:User|null;ready:boolean};children:ReactNode}) {return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;}
