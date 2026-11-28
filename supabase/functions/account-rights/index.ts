// Runtime entry point. Keys are read only from the server environment.
import { createClient } from "npm:@supabase/supabase-js@2.119.2";
import { createAccountHandler } from "./handler.mjs";
Deno.serve(createAccountHandler({createClient,readEnv:(name:string)=>Deno.env.get(name)}));
