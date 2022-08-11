import { app, errorHandler, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { CronJob } from 'cron';
import fetch  from 'node-fetch';
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { bindingsToTTL } from "./utils/bindingsToNT";
import { prefixes } from "./prefixes";
import {
  CRON_PATTERN,
  LDES_ENDPOINT,
  LDES_FOLDER,
  STREAM_URI
} from './env-config'


const STATUS_PUBLISHED_URI ="http://lblod.data.gift/concepts/3369bb10-1962-11ed-b07c-132292303e92";
const SENT_URI = "http://lblod.data.gift/concepts/43cee0c6-2a9f-4836-ba3c-5e80de5714f2";



/*
 * Poll data from any graphs 
 *
 */
const pollData = async () => {
   const queryString = `
   ${prefixes}
   SELECT ?graph ?publicservice ?status  ?label  WHERE {
     GRAPH ?graph{
       ?publicservice a cpsv:PublicService; adms:status ?status.
       OPTIONAL {
         ?status schema:publication ?puburi; skos:preflabel ?label.
       }
     }
     FILTER NOT EXISTS{
      ?status schema:publication ?puburi.
     }
   }`;
  const result = (await query(queryString)).results.bindings;
  return result;
};

/*
 * format request and send data to ldes feed
 */
const  postDataToLDES = (formatFn) => (uri) => async (data) =>  {
    const body = formatFn(data);
    try{
      const queryParams = new URLSearchParams({
        resource: uri,
      });

      const result = await fetch(`${LDES_ENDPOINT}${LDES_FOLDER}?` + queryParams, {
        method: "POST",
        headers: {
          "Content-Type": "text/turtle",
        },
        body: body,
      });
      return result;
    } catch (e) {
      console.log(e);
      throw e;
    }
}


/*
 * insert the status of posted data.
 */
const  updatePostedData = async (postedData) => {
    if ( postedData.length == 0 ) {
      console.log("No data to update");
      return postedData;
    } else {
    const insertQuadString = postedData.map( (e) => {
      return `GRAPH ${sparqlEscapeUri(e.graph.value)} {
                ${sparqlEscapeUri(e.publicservice.value)} adms:status ${sparqlEscapeUri(STATUS_PUBLISHED_URI)}.
                ${sparqlEscapeUri(e.status.value)} schema:publication ${sparqlEscapeUri(SENT_URI)}.
              }`;
      }).join("\n");


    const resp = await update(`${prefixes}
                              INSERT DATA {
                                ${insertQuadString}
                              }`);
    return resp.results.bindings;
    }
};


const pollingJob = new CronJob( CRON_PATTERN, async () => {
  try{
    const polledData = await pollData();
    if (polledData.length > 0 ){
      const response = await postDataToLDES(bindingsToTTL)(STREAM_URI)(polledData);
    // if error in ldes-proxy
      if (response.status >=400) {
        console.log("error while posting data to ldes");
        console.log(response);
      } else{
        // update polled triples
        const endResult = await updatePostedData(polledData);
      }
    } else{
      console.log("no data to post");
    }
  } catch(e){
    console.log(e);
  }
}, null, true);

