import { app, errorHandler, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { CronJob } from 'cron';
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { prefixes } from "./prefixes";
import {
  CRON_PATTERN,
} from './env-config'



const pollData = async (): object => {
   const queryString: string = `
   ${prefixes}
   SELECT ?s WHERE  {
     GRAPH ?g{
       ?s a cpsv:PublicService.
     }
   }
   `;
    const response = await query(queryString);
  const result:object = (await query(queryString)).results.bindings;
  return result; 
};



const pollingJob: CronJob = new CronJob( CRON_PATTERN, async () => {
  try{
    const polledData = await pollData();
  } catch(e){
    console.log(e);
  }
}, null, true);

