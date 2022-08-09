import { app, errorHandler, sparqlEscapeString, sparqlEscapeUri } from 'mu';
import { CronJob } from 'cron';
import fetch  from 'node-fetch';
import { querySudo as query, updateSudo as update } from "@lblod/mu-auth-sudo";
import { prefixes } from "./prefixes";
import {
  CRON_PATTERN,
  LDES_ENDPOINT,
  LDES_FOLDER,
} from './env-config'


// to add predicates in the request
const extraProperties = [ "purl:title", "purl:source"]
const extraPropertiesEntries = extraProperties.map(e=> [ e.split(":").slice(-1)[0], e]);
const extraPropertiesDict = Object.fromEntries(extraPropertiesEntries);

/*
 * Poll data from any graphs 
 *
 */
const pollData = async () => {
   const propertiesString = extraPropertiesEntries.map(e=>e.reverse().join(" ?")).join(";")
   const extraVariables = Object.keys(extraPropertiesDict).map(e=>"?"+e);
   const queryString = `
   ${prefixes}
   select ?publicservice ?status ?puburi ?label ${extraVariables.join(" ")} where {
     graph ?graph{
       ?publicservice a cpsv:PublicService; adms:status ?status.
      OPTIONAL {
       ?publicservice ${propertiesString}.
       }
      OPTIONAL {
       ?status schema:publication ?puburi; skos:preflabel ?label.
       }
     }
   }`;
  const result = (await query(queryString)).results.bindings;
  return result; 
};

/*
 * format request and send data to ldes feed
 */
async function sendLDESRequest(uri, body) {
  console.log(LDES_ENDPOINT);
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
    return result.status;
  } catch (e) {
    console.log(e);
  }
}

const postDataToLDES = async (data)  => {
  if ( data.length > 0 ){
    return await sendLDESRequest("http://mu.semte.ch/streams/", data);
  } else {
    console.log("no data to post");
  }
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
    const codeRequest = await postDataToLDES(polledData);
    // if error in ldes-proxy
    if (codeRequest >=400) {
      console.log(" error while posting data to ldes");
    } else{
      // update polled triples
      const endResult = await updatePostedData(polledData);
    }
  } catch(e){
    console.log(e);
  }
}, null, true);

