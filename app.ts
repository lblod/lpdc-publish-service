import { app, errorHandler, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { CronJob } from 'cron';
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { prefixes } from "./prefixes";
import {
  CRON_PATTERN,
} from './env-config'



/*
 * Poll data from any graphs 
 *
 */
const pollData = async (): object => {
   const queryString: string = `
   ${prefixes}
   SELECT ?publicService ?status ?puburi ?label WHERE {
     GRAPH ?graph{
       ?publicService a cpsv:PublicService; adms:status ?status.
      OPTIONAL {
       ?status schema:publication ?puburi; skos:prefLabel ?label.
       }
     }
   }`;
  const result:object = (await query(queryString)).results.bindings;
  return result; 
};

const postDataToLDES = (data)  => data;

/*
 * insert the status of posted data.
 */
const  updatePostedData = (postedData) => postedData ;

const pollingJob: CronJob = new CronJob( CRON_PATTERN, async () => {
  try{
    const polledData = await pollData();
    const postedData = postDataToLDES(polledData);
    const endResult = await updatePostedData(postedData);
  } catch(e){
    console.log(e);
  }
}, null, true);

