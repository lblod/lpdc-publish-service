import { app, errorHandler, uuid } from 'mu';
import { CronJob } from 'cron';
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { prefixes } from "./prefixes";
import {
  CRON_PATTERN,
} from './env-config'


const pollingJob: CronJob = new CronJob( CRON_PATTERN, async () => {
  // poll data here
  try{
   const queryString = `
   ${prefixes}
   SELECT ?s WHERE  {
     GRAPH ?g{
       ?s a cpsv:PublicService.
     }
   }
   `;
    const response = await query(queryString);

  } catch(e){
    console.log(e);
  }
}, null, true);

