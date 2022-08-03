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
const  updatePostedData = async (postedData) => {
    if ( postedData.length == 0 ) {
      console.log("No data to update");
      return postedData;
    } else {
    const sentUri:string = "<http://lblod.data.gift/concepts/43cee0c6-2a9f-4836-ba3c-5e80de5714f2>";
    const quadString:string = postedData.filter( (e) =>  e.puburi==undefined)
      .map( (e) => {
        return `GRAPH  ${sparqlEscapeUri(e.graph.value)} {
          ${sparqlEscapeUri(e.status.value)} schema:publication ${sentUri};
                skos:prefLabel "Published to app-digitaal-loket-ldes-feed".
        }`;
      }).join("\n");
    const resp = await update(`${prefixes}
                              INSERT DATA {
                                ${quadString}
                              }`);
    return resp.results.bindings;
    }
};

const pollingJob: CronJob = new CronJob( CRON_PATTERN, async () => {
  try{
    const polledData = await pollData();
    const postedData = postDataToLDES(polledData);
    const endResult = await updatePostedData(postedData);
  } catch(e){
    console.log(e);
  }
}, null, true);

