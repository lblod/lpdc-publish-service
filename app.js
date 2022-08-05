import { app, errorHandler, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { CronJob } from 'cron';
import fetch  from 'node-fetch';
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { prefixes } from "./prefixes";
import {
  CRON_PATTERN,
  LDES_ENDPOINT,
  LDES_FRAGMENTER,
  LDES_RELATION_PATH,
  LDES_STREAM
} from './env-config'



/*
 * Poll data from any graphs 
 *
 */
const pollData = async () => {
   const queryString = `
   ${prefixes}
   SELECT ?publicService ?status ?puburi ?label WHERE {
     GRAPH ?graph{
       ?publicService a cpsv:PublicService; adms:status ?status.
      OPTIONAL {
       ?status schema:publication ?puburi; skos:prefLabel ?label.
       }
     }
   }`;
  const result = (await query(queryString)).results.bindings;
  return result; 
};

async function sendLDESRequest(uri, body) {
  console.log(LDES_ENDPOINT);
  try{
    const queryParams = new URLSearchParams({
      resource: uri,
      // stream: LDES_STREAM,
      // "relation-path": LDES_RELATION_PATH,
      fragmenter: LDES_FRAGMENTER,
    });


    const result = await fetch(`${LDES_ENDPOINT}?` + queryParams, {
      method: "POST",
      headers: {
        "Content-Type": "text/turtle",
      },
      body: body,
    });
    return result;
  } catch (e) {
    console.log(e);
  }
}

const postDataToLDES = async (data)  => {
    return await sendLDESRequest("http://mu.semte.ch/streams/", data);
};

/*
 * insert the status of posted data.
 */
const  updatePostedData = async (postedData) => {
    if ( postedData.length == 0 ) {
      console.log("No data to update");
      return postedData;
    } else {
    const sentUri = "<http://lblod.data.gift/concepts/43cee0c6-2a9f-4836-ba3c-5e80de5714f2>";
    const quadString = postedData.filter( (e) =>  e.puburi==undefined)
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

const pollingJob = new CronJob( CRON_PATTERN, async () => {
  try{
    const polledData = await pollData();
    const postedData = postDataToLDES(polledData);
    const endResult = await updatePostedData(postedData);
  } catch(e){
    console.log(e);
  }
}, null, true);

